import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, UserRound, Users, X } from "lucide-react";
import { createUser, deleteUser, getUsers, updateUser } from "./api";
import type { AppUser, AppUserInput, UserRole } from "./types";

type UserManagementProps = { token: string };
type UserFormProps = {
  user: AppUser | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: AppUserInput) => Promise<void>;
};

function UserManagement({ token }: UserManagementProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getUsers(token)
      .then((loadedUsers) => {
        if (active) setUsers(loadedUsers);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load users.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function saveUser(input: AppUserInput) {
    setError("");
    setSaving(true);
    try {
      if (editingUser) {
        const updated = await updateUser(token, editingUser.Id, input);
        setUsers((current) => current.map((user) => user.Id === updated.Id ? updated : user));
      } else {
        const created = await createUser(token, input);
        setUsers((current) => [...current, created].sort((a, b) => a.Username.localeCompare(b.Username)));
      }
      setEditingUser(null);
      setCreating(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this user.");
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user: AppUser) {
    if (!window.confirm(`Delete the account for ${user.Username}? This cannot be undone.`)) return;
    setError("");
    setDeletingId(user.Id);
    try {
      await deleteUser(token, user.Id);
      setUsers((current) => current.filter((entry) => entry.Id !== user.Id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this user.");
    } finally {
      setDeletingId(null);
    }
  }

  function closeForm() {
    setEditingUser(null);
    setCreating(false);
  }

  return (
    <section className="user-management">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> ACCESS &amp; PERMISSIONS</div>
          <h1>Manage users.</h1>
          <p>Create accounts, set roles, and control who can sign in.</p>
        </div>
        <button className="primary-button heading-button" onClick={() => { setError(""); setCreating(true); }}>
          <Plus size={17} /> Add user
        </button>
      </div>

      {error && <div className="user-error" role="alert">{error}</div>}
      <section className="directory-card user-directory">
        <div className="directory-header">
          <div><h2>User accounts</h2><p>Only enabled accounts can sign in to PeopleDesk.</p></div>
          <span className="record-count">{users.length} {users.length === 1 ? "account" : "accounts"}</span>
        </div>
        {loading ? (
          <div className="table-state"><span className="loading-spinner" /> Loading user accounts…</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={24} /></div>
            <h3>No user accounts yet.</h3>
            <p>Add an account to let someone sign in to the application.</p>
            <button className="primary-button" onClick={() => setCreating(true)}><Plus size={16} /> Add user</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead><tr><th>USERNAME</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.Id}>
                    <td><div className="employee-cell"><span className="user-avatar"><UserRound size={16} /></span><strong>{user.Username}</strong></div></td>
                    <td><span className={`user-role user-role-${user.Role.toLowerCase()}`}>{user.Role === "Admin" && <ShieldCheck size={13} />}{user.Role}</span></td>
                    <td><span className={`user-status ${user.IsEnabled ? "user-enabled" : "user-disabled"}`}><span />{user.IsEnabled ? "Enabled" : "Disabled"}</span></td>
                    <td>
                      <div className="user-actions">
                        <button className="skill-icon-button" aria-label={`Edit ${user.Username}`} title="Edit user" onClick={() => { setError(""); setEditingUser(user); }}>
                          <Pencil size={15} />
                        </button>
                        <button className="skill-icon-button skill-remove" aria-label={`Delete ${user.Username}`} title="Delete user" disabled={deletingId === user.Id} onClick={() => void removeUser(user)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="directory-footer"><span>ACCOUNT ACCESS</span><span><span className="online-dot" /> Passwords are stored securely</span></div>
      </section>

      {(creating || editingUser) && (
        <UserForm
          key={editingUser?.Id ?? "new"}
          user={editingUser}
          saving={saving}
          onCancel={closeForm}
          onSave={saveUser}
        />
      )}
    </section>
  );
}

function UserForm({ user, saving, onCancel, onSave }: UserFormProps) {
  const [username, setUsername] = useState(user?.Username ?? "");
  const [role, setRole] = useState<UserRole>(user?.Role ?? "User");
  const [password, setPassword] = useState("");
  const [isEnabled, setIsEnabled] = useState(user?.IsEnabled ?? true);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await onSave({
        username: username.trim(),
        role,
        ...(password ? { password } : {}),
        isEnabled,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this user.");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
      <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
        <div className="details-top">
          <span className="details-label"><UserRound size={15} /> USER ACCOUNT</span>
          <button className="close-button" aria-label="Close user form" disabled={saving} onClick={onCancel}><X size={19} /></button>
        </div>
        <h2 id="user-form-title">{user ? "Edit user" : "Create user"}</h2>
        <p className="user-modal-description">Set the account details and access level for this person.</p>
        <form className="user-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="user-username">Username <span>*</span></label>
            <input id="user-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={100} required />
          </div>
          <div className="form-field">
            <label htmlFor="user-role">Role <span>*</span></label>
            <select id="user-role" value={role} onChange={(event) => setRole(event.target.value === "Admin" ? "Admin" : "User")}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
            <span className="user-hint">Admins can manage user accounts. Users can access the employee workspace.</span>
          </div>
          <div className="form-field">
            <label htmlFor="user-password">Password {user ? <span className="optional">(leave blank to keep current)</span> : <span>*</span>}</label>
            <input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required={!user}
              placeholder={user ? "No change" : "At least 8 characters"}
            />
          </div>
          <label className="user-enabled-toggle">
            <input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} />
            <span><strong>Account enabled</strong><small>Disabled users cannot sign in, and active sessions are revoked.</small></span>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="user-form-footer">
            <button className="secondary-button" type="button" disabled={saving} onClick={onCancel}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : user ? "Save changes" : "Create user"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default UserManagement;
