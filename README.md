# PeopleDesk Employee Management

A React + TypeScript employee-management web app and a Node.js/Express API backed by local MySQL.

## Requirements

- Node.js 18 or newer
- MySQL 8 or compatible

## Database setup

Run `Employee_API/schema.sql` with your local MySQL server. It creates the `employee_management` database and the `AppUser`, `Employee`, and `EmployeeSkill` tables:

`AppUser` stores each account's username, role (`Admin` or `User`), a password hash, and enabled status. User passwords are hashed by the API and are never returned by its endpoints.

| Column | Type | Notes |
| --- | --- | --- |
| Id | INT | Auto-increment primary key |
| Name | VARCHAR(150) | Required |
| Department | VARCHAR(100) | Required |
| Position | VARCHAR(100) | Required |
| Age | INT | Required |
| Salary | DECIMAL(12,2) | Nullable |
| PicPath | VARCHAR(500) | Nullable |

`EmployeeSkill` stores `Id`, `EmployeeId`, `SkillName`, and `Proficiency` (`Beginner`, `Intermediate`, `Advanced`, or `Expert`). It is linked to `Employee` and is deleted automatically when its employee is deleted. Re-running the schema script adds this table to an existing database without removing employee data.

## Start the API

```powershell
cd Employee_API
Copy-Item .env.example .env
```

Edit `.env` for your local MySQL credentials. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to establish the bootstrap administrator account, and replace `JWT_SECRET` with a long random secret. The bootstrap account remains available for initial setup; administrators can create additional accounts in the Users section. Then:

```powershell
npm install
npm run dev
```

The API listens on `http://localhost:3001`. `POST /api/auth/login` accepts the bootstrap administrator or an enabled database account and issues an eight-hour token. Employee endpoints require a bearer token. User management uses `GET` and `POST /api/users`, plus `PUT` and `DELETE /api/users/:id`; these routes require an Admin account. User creation and updates accept lower-camel-case `username`, `role`, `password`, and `isEnabled` fields. Passwords must contain at least eight characters, and at least one enabled database administrator must remain. Disabling or deleting a database account invalidates that account's existing sessions. `GET /api/health` is available without signing in.

Employee skills are managed through `GET` and `POST /api/employees/:id/skills`, plus `PUT` and `DELETE /api/employees/:id/skills/:skillId`. These routes use the same bearer token as the employee endpoints.

For direct API testing in PowerShell, sign in first and pass the returned token:

```powershell
$login = Invoke-RestMethod http://localhost:3001/api/auth/login `
  -Method Post `
  -ContentType 'application/json' `
  -Body (@{ username = 'your-admin'; password = 'your-password' } | ConvertTo-Json)

$login.token
```

## Start the web app

In another terminal:

```powershell
cd Employee_Front
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`) and sign in with the bootstrap credentials or a user account created by an administrator. The app redirects to the employee list after successful login. Administrators can open **Users** to create, edit, enable/disable, and delete application accounts. Use **Add employee** to create a record, select a row to view its details, and manage the employee's skills from the details view. The frontend proxies `/api` requests to the local API; set `VITE_API_URL` only when hosting the API at a different origin.

The bootstrap administrator is configured through environment variables, while additional application accounts are stored in the `AppUser` table.

The codes are generated with the help of Github copilot.
