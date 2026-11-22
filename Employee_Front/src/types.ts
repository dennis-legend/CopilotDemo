export interface Employee {
  Id: number;
  Name: string;
  Department: string;
  Position: string;
  Age: number;
  Salary: number | null;
  PicPath: string | null;
}

export type EmployeeInput = Omit<Employee, "Id">;

export type SkillProficiency = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface EmployeeSkill {
  Id: number;
  EmployeeId: number;
  SkillName: string;
  Proficiency: SkillProficiency;
}

export interface EmployeeSkillInput {
  skillName: string;
  proficiency: SkillProficiency;
}

export type UserRole = "Admin" | "User";

export interface AppUser {
  Id: number;
  Username: string;
  Role: UserRole;
  IsEnabled: boolean;
}

export interface AppUserInput {
  username: string;
  role: UserRole;
  password?: string;
  isEnabled: boolean;
}
