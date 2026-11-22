CREATE DATABASE IF NOT EXISTS employee_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE employee_management;

CREATE TABLE IF NOT EXISTS AppUser (
  Id INT NOT NULL AUTO_INCREMENT,
  Username VARCHAR(100) NOT NULL,
  Role ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  PasswordHash VARCHAR(200) NOT NULL,
  IsEnabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (Id),
  UNIQUE KEY uq_app_user_username (Username)
);

CREATE TABLE IF NOT EXISTS Employee (
  Id INT NOT NULL AUTO_INCREMENT,
  Name VARCHAR(150) NOT NULL,
  Department VARCHAR(100) NOT NULL,
  Position VARCHAR(100) NOT NULL,
  Age INT NOT NULL,
  Salary DECIMAL(12, 2) DEFAULT NULL,
  PicPath VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (Id)
);

CREATE TABLE IF NOT EXISTS EmployeeSkill (
  Id INT NOT NULL AUTO_INCREMENT,
  EmployeeId INT NOT NULL,
  SkillName VARCHAR(100) NOT NULL,
  Proficiency ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') NOT NULL DEFAULT 'Intermediate',
  PRIMARY KEY (Id),
  UNIQUE KEY uq_employee_skill_name (EmployeeId, SkillName),
  CONSTRAINT fk_employee_skill_employee
    FOREIGN KEY (EmployeeId) REFERENCES Employee (Id)
    ON DELETE CASCADE
);
