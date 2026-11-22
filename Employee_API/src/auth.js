const jwt = require("jsonwebtoken");
const { randomBytes, scrypt: deriveKey, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const pool = require("./db");

async function requireAuth(req, res, next) {
  const authorization = req.get("authorization");
  const token = authorization && authorization.match(/^Bearer\s+(.+)$/i);

  if (!token) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  let payload;
  try {
    payload = jwt.verify(token[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
  }

  try {
    if (Number.isInteger(payload.userId) && payload.userId > 0) {
      const [users] = await pool.execute(
        "SELECT Id, Username, Role, IsEnabled FROM AppUser WHERE Id = ?",
        [payload.userId],
      );
      if (users.length === 0 || !users[0].IsEnabled) {
        return res.status(401).json({ error: "Your account is disabled or no longer exists." });
      }
      req.user = {
        id: users[0].Id,
        username: users[0].Username,
        role: users[0].Role,
      };
    } else if (process.env.ADMIN_USERNAME && payload.sub === process.env.ADMIN_USERNAME) {
      req.user = { username: payload.sub, role: "Admin" };
    } else {
      return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  return next();
}

const scrypt = promisify(deriveKey);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, storedHash] = String(passwordHash).split("$");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;

  const expected = Buffer.from(storedHash, "hex");
  if (expected.length !== 64) return false;

  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, requireAdmin, requireAuth, verifyPassword };
