import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { createEmployee, getEmployee, getEmployees, login } from "./api";
import EmployeeSkills from "./EmployeeSkills";
import UserManagement from "./Users";
import type { Employee, EmployeeInput, UserRole } from "./types";

type Page = "home" | "list" | "add" | "users";
type Session = { token: string; username: string; role: UserRole };

function getStoredSession(): Session | null {
  const token = sessionStorage.getItem("employee-token");
  const username = sessionStorage.getItem("employee-username");
  const role = sessionStorage.getItem("employee-role");
  return token && username ? { token, username, role: role === "Admin" ? "Admin" : "User" } : null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function App() {
  const [session, setSession] = useState<Session | null>(getStoredSession);
  const [page, setPage] = useState<Page>(session ? "list" : "home");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const signOut = useCallback(() => {
    sessionStorage.removeItem("employee-token");
    sessionStorage.removeItem("employee-username");
    sessionStorage.removeItem("employee-role");
    setSession(null);
    setEmployees([]);
    setSelectedEmployee(null);
    setNotice("");
    setMobileMenuOpen(false);
    setPage("home");
  }, []);

  const loadEmployees = useCallback(async (token: string) => {
    setLoading(true);
    try {
      setEmployees(await getEmployees(token));
    } catch (error) {
      if (error instanceof Error && /session|authentication/i.test(error.message)) {
        signOut();
      }
      setNotice(error instanceof Error ? error.message : "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    if (session) void loadEmployees(session.token);
  }, [session, loadEmployees]);

  async function handleLogin(username: string, password: string) {
    setNotice("");
    try {
      const result = await login(username, password);
      const nextSession = { token: result.token, username: result.username, role: result.role };
      sessionStorage.setItem("employee-token", nextSession.token);
      sessionStorage.setItem("employee-username", nextSession.username);
      sessionStorage.setItem("employee-role", nextSession.role);
      setSession(nextSession);
      setPage("list");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  async function handleAdd(employee: EmployeeInput) {
    if (!session) return;
    setNotice("");
    try {
      const created = await createEmployee(session.token, employee);
      setEmployees((current) => [created, ...current]);
      setPage("list");
      setNotice(`${created.Name} was added to your team.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add employee.");
      throw error;
    }
  }

  async function showDetails(employee: Employee) {
    if (!session) return;
    setNotice("");
    try {
      setSelectedEmployee(await getEmployee(session.token, employee.Id));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load employee details.");
    }
  }

  function navigate(nextPage: Page) {
    if (!session && nextPage !== "home") return;
    if (nextPage === "users" && session?.role !== "Admin") return;
    setNotice("");
    setMobileMenuOpen(false);
    setPage(nextPage);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate("home"); }}>
          <span className="brand-mark"><Users size={20} strokeWidth={2.4} /></span>
          <span>people<span className="brand-light">desk</span></span>
          <span className="brand-badge">HR</span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-item ${page === "home" ? "nav-active" : ""}`} onClick={() => navigate("home")}>
            <LayoutDashboard size={18} /><span>Home</span>
          </button>
          <button className={`nav-item ${page === "list" ? "nav-active" : ""}`} disabled={!session} onClick={() => navigate("list")}>
            <Users size={18} /><span>Employees</span>
            {session && <span className="nav-count">{employees.length}</span>}
          </button>
          <button className={`nav-item ${page === "add" ? "nav-active" : ""}`} disabled={!session} onClick={() => navigate("add")}>
            <Plus size={18} /><span>Add employee</span>
          </button>
          {session?.role === "Admin" && (
            <button className={`nav-item ${page === "users" ? "nav-active" : ""}`} onClick={() => navigate("users")}>
              <UserRound size={18} /><span>Users</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><CircleHelp size={17} /></span>
            <strong>Need a hand?</strong>
            <p>Your people, all in one place. Manage your team with ease.</p>
            <span className="help-link">PeopleDesk help center <ArrowRight size={13} /></span>
          </div>
          <div className="sidebar-foot">PEOPLEDESK <span>•</span> v1.0</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page === "home" ? "Home" : page === "list" ? "Employees" : page === "users" ? "Users" : "Add employee"}</strong></div>
          <div className="topbar-right">
            <span className="workspace-label"><span className="online-dot" /> Workspace</span>
            {session ? (
              <>
                <div className="profile-display">
                  <span className="avatar avatar-small">{initials(session.username)}</span>
                  <span className="profile-name">{session.username}</span>
                </div>
                <button className="logout-link" type="button" onClick={signOut}>
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </>
            ) : <span className="secure-label"><ShieldCheck size={15} /> Secure access</span>}
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className={`notice ${notice.includes("added") ? "notice-success" : "notice-error"}`} role="status">
              {notice.includes("added") ? <Check size={16} /> : <CircleHelp size={16} />}
              <span>{notice}</span>
              <button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button>
            </div>
          )}
          {page === "home" && <HomePage session={session} onLogin={handleLogin} onViewEmployees={() => navigate("list")} />}
          {page === "list" && session && (
            <EmployeeList employees={employees} loading={loading} onAdd={() => navigate("add")} onSelect={showDetails} />
          )}
          {page === "add" && session && <AddEmployee onCancel={() => navigate("list")} onSubmit={handleAdd} />}
          {page === "users" && session?.role === "Admin" && <UserManagement token={session.token} />}
        </div>
      </main>

      {selectedEmployee && session && (
        <EmployeeDetails employee={selectedEmployee} token={session.token} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  );
}

function HomePage({ session, onLogin, onViewEmployees }: {
  session: Session | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onViewEmployees: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="home-layout">
      <section className="welcome-panel">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR TEAM, IN GOOD COMPANY</div>
        <h1>People are your<br /><span>greatest asset.</span></h1>
        <p className="welcome-copy">A clearer view of your people starts here. Keep your team organized, connected, and moving forward.</p>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-center"><Users size={34} /></div>
          <div className="art-person person-one"><span>AM</span></div>
          <div className="art-person person-two"><span>JL</span></div>
          <div className="art-person person-three"><span>SK</span></div>
          <div className="art-person person-four"><span>DR</span></div>
          <div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✳</div>
        </div>
        <div className="welcome-footer"><span><span className="online-dot" /> Made for better workdays</span><span>PEOPLEDESK <span className="footer-dot">•</span> 2026</span></div>
      </section>
      <section className="login-side">
        <div className="login-card">
          <div className="login-icon"><BriefcaseBusiness size={20} /></div>
          {session ? (
            <>
              <div className="login-overline">YOUR SESSION</div>
              <h2>Welcome back.</h2>
              <p className="login-description">You're signed in as <strong>{session.username}</strong>. Your people workspace is ready.</p>
              <div className="session-info">
                <div className="session-avatar">{initials(session.username)}</div>
                <div><strong>{session.username}</strong><span>{session.role}</span></div>
                <span className="session-active"><span className="online-dot" /> Active</span>
              </div>
              <button className="primary-button full-button" onClick={onViewEmployees}>Go to employee list <ArrowRight size={17} /></button>
              <div className="privacy-note"><ShieldCheck size={15} /> Your workspace is private and secure.</div>
            </>
          ) : (
            <>
              <div className="login-overline">WELCOME TO PEOPLEDESK</div>
              <h2>Good to have<br />you here.</h2>
              <p className="login-description">Sign in to your workspace to manage your people and keep things moving.</p>
              <form className="login-form" onSubmit={submit}>
                <label htmlFor="username">Username</label>
                <input id="username" autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => setUsername(event.target.value)} required />
                <div className="password-label"><label htmlFor="password">Password</label><span>Contact your administrator if you've forgotten it.</span></div>
                <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button className="primary-button full-button" type="submit" disabled={submitting}>{submitting ? "Signing you in…" : "Sign in to workspace"} <ArrowRight size={17} /></button>
              </form>
              <div className="privacy-note"><ShieldCheck size={15} /> Your workspace is private and secure.</div>
            </>
          )}
        </div>
        <div className="login-help">Having trouble signing in? <span>Reach out to your administrator.</span></div>
      </section>
    </div>
  );
}

function EmployeeList({ employees, loading, onAdd, onSelect }: {
  employees: Employee[];
  loading: boolean;
  onAdd: () => void;
  onSelect: (employee: Employee) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter((employee) =>
    [employee.Name, employee.Department, employee.Position].some((value) => value.toLowerCase().includes(search.toLowerCase())),
  );
  const departments = new Set(employees.map((employee) => employee.Department)).size;

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> PEOPLE DIRECTORY</div><h1>Your people.</h1><p>Get to know the people who make it all happen.</p></div>
        <button className="primary-button heading-button" onClick={onAdd}><Plus size={17} /> Add employee</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><span className="stat-icon stat-violet"><Users size={18} /></span><div><span className="stat-label">Total employees</span><strong>{employees.length}</strong><span className="stat-foot">in your workspace</span></div><div className="stat-mark">01</div></div>
        <div className="stat-card"><span className="stat-icon stat-peach"><Building2 size={18} /></span><div><span className="stat-label">Departments</span><strong>{departments}</strong><span className="stat-foot">across your team</span></div><div className="stat-mark">02</div></div>
        <div className="stat-card"><span className="stat-icon stat-green"><ShieldCheck size={18} /></span><div><span className="stat-label">Workspace</span><strong className="stat-status">All in order</strong><span className="stat-foot"><span className="online-dot" /> Your data is up to date</span></div><div className="stat-mark">03</div></div>
      </div>
      <section className="directory-card">
        <div className="directory-header"><div><h2>Employee directory</h2><p>A little more about the people on your team.</p></div><div className="directory-tools"><label className="search-box"><Search size={16} /><input placeholder="Find someone…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span className="record-count">{filtered.length} {filtered.length === 1 ? "person" : "people"}</span></div></div>
        {loading ? <div className="table-state"><span className="loading-spinner" /> Gathering your people…</div> : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><Users size={24} /></div><h3>{employees.length ? "No one by that name yet." : "Your directory starts here."}</h3><p>{employees.length ? "Try another name, department, or role." : "Add a teammate and start building your people directory."}</p>{!employees.length && <button className="primary-button" onClick={onAdd}><Plus size={16} /> Add your first employee</button>}</div>
        ) : (
          <div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>POSITION</th><th>AGE</th><th></th></tr></thead><tbody>
            {filtered.map((employee, index) => <tr key={employee.Id} onClick={() => onSelect(employee)} className="employee-row">
              <td><div className="employee-cell"><span className={`avatar avatar-${index % 5}`}>{employee.PicPath ? <img src={employee.PicPath} alt="" /> : initials(employee.Name)}</span><span><strong>{employee.Name}</strong><small>Employee #{String(employee.Id).padStart(4, "0")}</small></span></div></td>
              <td><span className="department-cell"><span className="department-dot" />{employee.Department}</span></td>
              <td><span className="position-cell">{employee.Position}</span></td><td><span className="age-cell">{employee.Age}</span></td>
              <td><button className="row-arrow" aria-label={`View ${employee.Name}`} onClick={(event) => { event.stopPropagation(); onSelect(employee); }}><ArrowRight size={16} /></button></td>
            </tr>)}
          </tbody></table></div>
        )}
        <div className="directory-footer"><span>PEOPLE MAKE THE PLACE.</span><span><span className="online-dot" /> Connected to your workspace</span></div>
      </section>
    </>
  );
}

function AddEmployee({ onCancel, onSubmit }: {
  onCancel: () => void;
  onSubmit: (employee: EmployeeInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const salaryValue = String(data.get("salary") || "").trim();
    try {
      await onSubmit({
        Name: String(data.get("name")).trim(),
        Department: String(data.get("department")).trim(),
        Position: String(data.get("position")).trim(),
        Age: Number(data.get("age")),
        Salary: salaryValue ? Number(salaryValue) : null,
        PicPath: String(data.get("picPath") || "").trim() || null,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add this employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> GROW YOUR TEAM</div><h1>Make room for someone new.</h1><p>Add a teammate to your employee directory.</p></div></div>
      <form className="employee-form" onSubmit={submit}>
        <div className="form-section-heading"><span className="form-section-icon"><Users size={18} /></span><div><h2>Employee details</h2><p>The essentials to get your new teammate started.</p></div></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-grid">
          <div className="form-field field-wide"><label htmlFor="employee-name">Full name <span>*</span></label><input id="employee-name" name="name" placeholder="e.g. Alex Morgan" maxLength={150} required /></div>
          <div className="form-field"><label htmlFor="employee-department">Department <span>*</span></label><input id="employee-department" name="department" placeholder="e.g. Design" maxLength={100} required /></div>
          <div className="form-field"><label htmlFor="employee-position">Position <span>*</span></label><input id="employee-position" name="position" placeholder="e.g. Product Designer" maxLength={100} required /></div>
          <div className="form-field"><label htmlFor="employee-age">Age <span>*</span></label><input id="employee-age" name="age" type="number" placeholder="e.g. 29" min="1" max="120" required /></div>
          <div className="form-field"><label htmlFor="employee-salary">Salary <span className="optional">(optional)</span></label><div className="input-prefix"><span>$</span><input id="employee-salary" name="salary" type="number" placeholder="Leave blank if not set" min="0" step="0.01" /></div></div>
          <div className="form-field field-wide"><label htmlFor="employee-pic">Picture path <span className="optional">(optional)</span></label><input id="employee-pic" name="picPath" placeholder="https://… or a local image path" maxLength={500} /></div>
        </div>
        <div className="form-footer"><span><ShieldCheck size={15} /> Employee details are only visible to signed-in users.</span><div><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Adding…" : "Add employee"} <ArrowRight size={16} /></button></div></div>
      </form>
    </div>
  );
}

function EmployeeDetails({ employee, token, onClose }: { employee: Employee; token: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div className="details-top"><span className="details-label"><ArrowDownLeft size={15} /> TEAM MEMBER</span><button className="close-button" aria-label="Close employee details" onClick={onClose}><X size={19} /></button></div>
        <div className="details-profile"><span className="avatar avatar-large">{employee.PicPath ? <img src={employee.PicPath} alt="" /> : initials(employee.Name)}</span><div><h2 id="details-title">{employee.Name}</h2><p>{employee.Position}</p><span className="details-department"><span className="department-dot" />{employee.Department}</span></div></div>
        <div className="details-divider" />
        <div className="details-grid">
          <div className="detail-item"><span>EMPLOYEE ID</span><strong>#{String(employee.Id).padStart(4, "0")}</strong></div>
          <div className="detail-item"><span>AGE</span><strong>{employee.Age} years old</strong></div>
          <div className="detail-item"><span>DEPARTMENT</span><strong>{employee.Department}</strong></div>
          <div className="detail-item"><span>POSITION</span><strong>{employee.Position}</strong></div>
          <div className="detail-item"><span>SALARY</span><strong>{employee.Salary === null ? "Not provided" : `$${employee.Salary.toLocaleString()}`}</strong></div>
        </div>
        <EmployeeSkills employeeId={employee.Id} token={token} />
        <div className="details-modal-footer"><span><span className="online-dot" /> Part of your team</span><button className="secondary-button" onClick={onClose}>Done</button></div>
      </section>
    </div>
  );
}

export default App;
