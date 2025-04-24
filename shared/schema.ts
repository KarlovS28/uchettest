import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Организация
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
});

// Пользователи системы
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  position: text("position").notNull(),
  organizationId: integer("organization_id").notNull(),
  role: text("role").notNull(), // admin, manager, viewer
  permissions: json("permissions").notNull(), // Массив строк с разрешениями
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  position: true,
  organizationId: true,
  role: true,
  permissions: true,
});

// Отделы
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: integer("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  organizationId: true,
});

// Сотрудники
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  departmentId: integer("department_id").notNull(),
  position: text("position").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  hireOrderNumber: text("hire_order_number").notNull(),
  passport: text("passport").notNull(),
  birthDate: timestamp("birth_date").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  photo: text("photo"), // URL к фото
  materialLiabilityType: text("material_liability_type").notNull(), // individual, collective, none
  materialLiabilityDocument: text("material_liability_document"),
  dismissed: boolean("dismissed").notNull().default(false),
  dismissalDate: timestamp("dismissal_date"),
  dismissalOrderNumber: text("dismissal_order_number"),
  organizationId: integer("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  fullName: true,
  departmentId: true,
  position: true,
  hireDate: true,
  hireOrderNumber: true,
  passport: true,
  birthDate: true,
  address: true,
  phone: true,
  photo: true,
  materialLiabilityType: true,
  materialLiabilityDocument: true,
  organizationId: true,
});

// Документы сотрудников
export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
});

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).pick({
  employeeId: true,
  filename: true,
  path: true,
});

// Имущество
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inventoryNumber: text("inventory_number").notNull().unique(),
  description: text("description").notNull(),
  cost: integer("cost").notNull(),
  employeeId: integer("employee_id").notNull(),
  departmentId: integer("department_id").notNull(),
  organizationId: integer("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).pick({
  name: true,
  inventoryNumber: true,
  description: true,
  cost: true,
  employeeId: true,
  departmentId: true,
  organizationId: true,
});

// Типы для экспорта
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Тип с расширенными разрешениями для пользователей
export type UserPermission = 
  | "full_access" 
  | "manage_positions" 
  | "view_employee_data" 
  | "manage_employees" 
  | "manage_departments" 
  | "print_documents" 
  | "manage_liability";

// Схема для проверки разрешений
export const userPermissionsSchema = z.array(z.enum([
  "full_access",
  "manage_positions",
  "view_employee_data",
  "manage_employees",
  "manage_departments",
  "print_documents",
  "manage_liability"
]));
