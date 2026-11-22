require("dotenv").config();

const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { hashPassword, requireAdmin, requireAuth, verifyPassword } = require("./auth");

const app = express();
const port = Number(process.env.PORT || 3001);
const proficiencies = new Set(["Beginner", "Intermediate", "Advanced", "Expert"]);
const userRoles = new Set(["Admin", "User"]);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

async function requireEmployee(req, res, next) {
  const employeeId = Number(req.params.id);
  if (!Number.isInteger(employeeId) || employeeId < 1) {
    return res.status(400).json({ error: "Employee ID must be a positive integer." });
  }

  try {
    const [employees] = await pool.execute("SELECT Id FROM Employee WHERE Id = ?", [employeeId]);
    if (employees.length === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }
    req.employeeId = employeeId;
    return next();
  } catch (error) {
    return next(error);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login", async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ error: "Login is not configured. Set JWT_SECRET." });
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const normalizedUsername = username.trim();
    if (
      process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      normalizedUsername.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase() &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { sub: process.env.ADMIN_USERNAME, role: "Admin" },
        process.env.JWT_SECRET,
        { expiresIn: "8h" },
      );
      return res.json({ token, username: process.env.ADMIN_USERNAME, role: "Admin" });
    }

    const [users] = await pool.execute(
      "SELECT Id, Username, Role, PasswordHash, IsEnabled FROM AppUser WHERE Username = ?",
      [normalizedUsername],
    );
    if (
      users.length === 0 ||
      !users[0].IsEnabled ||
      !(await verifyPassword(password, users[0].PasswordHash))
    ) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const user = users[0];
    const token = jwt.sign(
      { sub: user.Username, userId: user.Id },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    return res.json({ token, username: user.Username, role: user.Role });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [users] = await pool.query(
      "SELECT Id, Username, Role, IsEnabled FROM AppUser ORDER BY Username",
    );
    return res.json(users.map((user) => ({ ...user, IsEnabled: Boolean(user.IsEnabled) })));
  } catch (error) {
    return next(error);
  }
});

app.post("/api/users", requireAuth, requireAdmin, async (req, res, next) => {
  const { username, role, password, isEnabled } = req.body || {};
  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  const reservedUsername =
    process.env.ADMIN_USERNAME &&
    normalizedUsername.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase();
  if (
    !normalizedUsername ||
    normalizedUsername.length > 100 ||
    reservedUsername ||
    !userRoles.has(role) ||
    typeof password !== "string" ||
    password.length < 8 ||
    typeof isEnabled !== "boolean"
  ) {
    return res.status(400).json({
      error: "Provide a unique username (up to 100 characters), an Admin or User role, a password of at least 8 characters, and an enabled status.",
    });
  }

  try {
    const passwordHash = await hashPassword(password);
    const [result] = await pool.execute(
      "INSERT INTO AppUser (Username, Role, PasswordHash, IsEnabled) VALUES (?, ?, ?, ?)",
      [normalizedUsername, role, passwordHash, isEnabled],
    );
    const [users] = await pool.execute(
      "SELECT Id, Username, Role, IsEnabled FROM AppUser WHERE Id = ?",
      [result.insertId],
    );
    return res.status(201).json({ ...users[0], IsEnabled: Boolean(users[0].IsEnabled) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That username is already in use." });
    }
    return next(error);
  }
});

app.put("/api/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  const { username, role, password, isEnabled } = req.body || {};
  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  const reservedUsername =
    process.env.ADMIN_USERNAME &&
    normalizedUsername.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase();
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "User ID must be a positive integer." });
  }
  if (
    !normalizedUsername ||
    normalizedUsername.length > 100 ||
    reservedUsername ||
    !userRoles.has(role) ||
    typeof isEnabled !== "boolean" ||
    (password !== undefined && (typeof password !== "string" || password.length < 8))
  ) {
    return res.status(400).json({
      error: "Provide a unique username (up to 100 characters), an Admin or User role, an enabled status, and an optional password of at least 8 characters.",
    });
  }

  try {
    const [existingUsers] = await pool.execute(
      "SELECT Id, Role, IsEnabled FROM AppUser WHERE Id = ?",
      [id],
    );
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const existing = existingUsers[0];
    if (existing.Role === "Admin" && existing.IsEnabled && (role !== "Admin" || !isEnabled)) {
      const [admins] = await pool.execute(
        "SELECT COUNT(*) AS AdminCount FROM AppUser WHERE Role = 'Admin' AND IsEnabled = 1 AND Id <> ?",
        [id],
      );
      if (admins[0].AdminCount === 0) {
        return res.status(409).json({ error: "At least one enabled administrator must remain." });
      }
    }

    if (password === undefined) {
      await pool.execute(
        "UPDATE AppUser SET Username = ?, Role = ?, IsEnabled = ? WHERE Id = ?",
        [normalizedUsername, role, isEnabled, id],
      );
    } else {
      const passwordHash = await hashPassword(password);
      await pool.execute(
        "UPDATE AppUser SET Username = ?, Role = ?, PasswordHash = ?, IsEnabled = ? WHERE Id = ?",
        [normalizedUsername, role, passwordHash, isEnabled, id],
      );
    }

    const [users] = await pool.execute(
      "SELECT Id, Username, Role, IsEnabled FROM AppUser WHERE Id = ?",
      [id],
    );
    return res.json({ ...users[0], IsEnabled: Boolean(users[0].IsEnabled) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That username is already in use." });
    }
    return next(error);
  }
});

app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "User ID must be a positive integer." });
  }

  try {
    const [users] = await pool.execute(
      "SELECT Id, Role, IsEnabled FROM AppUser WHERE Id = ?",
      [id],
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    if (users[0].Role === "Admin" && users[0].IsEnabled) {
      const [admins] = await pool.execute(
        "SELECT COUNT(*) AS AdminCount FROM AppUser WHERE Role = 'Admin' AND IsEnabled = 1 AND Id <> ?",
        [id],
      );
      if (admins[0].AdminCount === 0) {
        return res.status(409).json({ error: "At least one enabled administrator must remain." });
      }
    }

    await pool.execute("DELETE FROM AppUser WHERE Id = ?", [id]);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/employees", requireAuth, async (_req, res, next) => {
  try {
    const [employees] = await pool.query(
      "SELECT Id, Name, Department, Position, Age, Salary, PicPath FROM Employee ORDER BY Id DESC",
    );
    return res.json(employees);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/employees/:id", requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Employee ID must be a positive integer." });
  }

  try {
    const [employees] = await pool.execute(
      "SELECT Id, Name, Department, Position, Age, Salary, PicPath FROM Employee WHERE Id = ?",
      [id],
    );
    if (employees.length === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }
    return res.json(employees[0]);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/employees/:id/skills", requireAuth, requireEmployee, async (req, res, next) => {
  try {
    const [skills] = await pool.execute(
      "SELECT Id, EmployeeId, SkillName, Proficiency FROM EmployeeSkill WHERE EmployeeId = ? ORDER BY SkillName",
      [req.employeeId],
    );
    return res.json(skills);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/employees/:id/skills", requireAuth, requireEmployee, async (req, res, next) => {
  const { skillName, proficiency } = req.body || {};
  if (typeof skillName !== "string" || !skillName.trim() || skillName.trim().length > 100 || !proficiencies.has(proficiency)) {
    return res.status(400).json({
      error: "Skill name is required (up to 100 characters) and proficiency must be Beginner, Intermediate, Advanced, or Expert.",
    });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO EmployeeSkill (EmployeeId, SkillName, Proficiency) VALUES (?, ?, ?)",
      [req.employeeId, skillName.trim(), proficiency],
    );
    const [skills] = await pool.execute(
      "SELECT Id, EmployeeId, SkillName, Proficiency FROM EmployeeSkill WHERE Id = ?",
      [result.insertId],
    );
    return res.status(201).json(skills[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This employee already has that skill." });
    }
    return next(error);
  }
});

app.put("/api/employees/:id/skills/:skillId", requireAuth, requireEmployee, async (req, res, next) => {
  const skillId = Number(req.params.skillId);
  const { skillName, proficiency } = req.body || {};
  if (!Number.isInteger(skillId) || skillId < 1) {
    return res.status(400).json({ error: "Skill ID must be a positive integer." });
  }
  if (typeof skillName !== "string" || !skillName.trim() || skillName.trim().length > 100 || !proficiencies.has(proficiency)) {
    return res.status(400).json({
      error: "Skill name is required (up to 100 characters) and proficiency must be Beginner, Intermediate, Advanced, or Expert.",
    });
  }

  try {
    await pool.execute(
      "UPDATE EmployeeSkill SET SkillName = ?, Proficiency = ? WHERE Id = ? AND EmployeeId = ?",
      [skillName.trim(), proficiency, skillId, req.employeeId],
    );
    const [skills] = await pool.execute(
      "SELECT Id, EmployeeId, SkillName, Proficiency FROM EmployeeSkill WHERE Id = ? AND EmployeeId = ?",
      [skillId, req.employeeId],
    );
    if (skills.length === 0) {
      return res.status(404).json({ error: "Skill not found for this employee." });
    }
    return res.json(skills[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This employee already has that skill." });
    }
    return next(error);
  }
});

app.delete("/api/employees/:id/skills/:skillId", requireAuth, requireEmployee, async (req, res, next) => {
  const skillId = Number(req.params.skillId);
  if (!Number.isInteger(skillId) || skillId < 1) {
    return res.status(400).json({ error: "Skill ID must be a positive integer." });
  }

  try {
    const [result] = await pool.execute(
      "DELETE FROM EmployeeSkill WHERE Id = ? AND EmployeeId = ?",
      [skillId, req.employeeId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Skill not found for this employee." });
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post("/api/employees", requireAuth, async (req, res, next) => {
  const { name, department, position, age, salary = null, picPath = null } = req.body || {};
  const validText = (value) => typeof value === "string" && value.trim().length > 0;
  const validAge = Number.isInteger(age) && age > 0 && age <= 120;
  const validSalary = salary === null || (typeof salary === "number" && Number.isFinite(salary) && salary >= 0);
  const validPicPath = picPath === null || (typeof picPath === "string" && picPath.length <= 500);

  if (!validText(name) || !validText(department) || !validText(position) || !validAge || !validSalary || !validPicPath) {
    return res.status(400).json({
      error: "Provide a name, department, position, age (1–120), optional non-negative salary, and optional picture path.",
    });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO Employee (Name, Department, Position, Age, Salary, PicPath) VALUES (?, ?, ?, ?, ?, ?)",
      [name.trim(), department.trim(), position.trim(), age, salary, picPath],
    );
    const [employees] = await pool.execute(
      "SELECT Id, Name, Department, Position, Age, Salary, PicPath FROM Employee WHERE Id = ?",
      [result.insertId],
    );
    return res.status(201).json(employees[0]);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

const server = app.listen(port, () => {
  console.log(`Employee API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
