import type { AppUser, AppUserInput, Employee, EmployeeInput, EmployeeSkill, EmployeeSkillInput, UserRole } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(username: string, password: string) {
  return request<{ token: string; username: string; role: UserRole }>("/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getUsers(token: string) {
  return request<AppUser[]>("/users", token);
}

export function createUser(token: string, user: AppUserInput) {
  return request<AppUser>("/users", token, {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function updateUser(token: string, userId: number, user: AppUserInput) {
  return request<AppUser>(`/users/${userId}`, token, {
    method: "PUT",
    body: JSON.stringify(user),
  });
}

export function deleteUser(token: string, userId: number) {
  return request<void>(`/users/${userId}`, token, { method: "DELETE" });
}

export function getEmployees(token: string) {
  return request<Employee[]>("/employees", token);
}

export function getEmployee(token: string, id: number) {
  return request<Employee>(`/employees/${id}`, token);
}

export function createEmployee(token: string, employee: EmployeeInput) {
  return request<Employee>("/employees", token, {
    method: "POST",
    body: JSON.stringify({
      name: employee.Name,
      department: employee.Department,
      position: employee.Position,
      age: employee.Age,
      salary: employee.Salary,
      picPath: employee.PicPath,
    }),
  });
}

export function getEmployeeSkills(token: string, employeeId: number) {
  return request<EmployeeSkill[]>(`/employees/${employeeId}/skills`, token);
}

export function createEmployeeSkill(token: string, employeeId: number, skill: EmployeeSkillInput) {
  return request<EmployeeSkill>(`/employees/${employeeId}/skills`, token, {
    method: "POST",
    body: JSON.stringify(skill),
  });
}

export function updateEmployeeSkill(token: string, employeeId: number, skillId: number, skill: EmployeeSkillInput) {
  return request<EmployeeSkill>(`/employees/${employeeId}/skills/${skillId}`, token, {
    method: "PUT",
    body: JSON.stringify(skill),
  });
}

export function deleteEmployeeSkill(token: string, employeeId: number, skillId: number) {
  return request<void>(`/employees/${employeeId}/skills/${skillId}`, token, {
    method: "DELETE",
  });
}
