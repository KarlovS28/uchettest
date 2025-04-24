import { 
  User, InsertUser, Department, InsertDepartment, 
  Employee, InsertEmployee, InventoryItem, InsertInventoryItem,
  Organization, InsertOrganization, EmployeeDocument, InsertEmployeeDocument
} from "@shared/schema";
import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  organizations as organizationsTable,
  users as usersTable,
  departments as departmentsTable,
  employees as employeesTable,
  employeeDocuments as employeeDocumentsTable,
  inventoryItems as inventoryItemsTable,
} from "@shared/schema";
import { pool } from "./db";

// Интерфейс хранилища данных
export interface IStorage {
  // Сессии
  sessionStore: session.Store;
  
  // Организации
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  
  // Пользователи
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(organizationId: number): Promise<User[]>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Отделы
  getDepartment(id: number): Promise<Department | undefined>;
  getDepartments(organizationId: number): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<Department>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;
  
  // Сотрудники
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployees(organizationId: number, departmentId?: number): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee | undefined>;
  dismissEmployee(id: number, dismissalDate: Date, dismissalOrderNumber: string): Promise<Employee | undefined>;
  
  // Документы сотрудников
  getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]>;
  addEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument>;
  deleteEmployeeDocument(id: number): Promise<boolean>;
  
  // Имущество
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  getInventoryItems(employeeId: number): Promise<InventoryItem[]>;
  getInventoryItemsByDepartment(departmentId: number): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  
  // Статистика
  getDepartmentStats(organizationId: number): Promise<{
    departmentId: number;
    departmentName: string;
    employeeCount: number;
    inventoryCount: number;
  }[]>;
}

// Реализация хранилища на базе данных PostgreSQL
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Организации
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, id));
    return organization;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db
      .insert(organizationsTable)
      .values({
        ...organization,
        createdAt: new Date(),
      })
      .returning();
    return newOrg;
  }

  // Пользователи
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(usersTable)
      .values({
        ...user,
        createdAt: new Date(),
      })
      .returning();
    return newUser;
  }

  async getUsers(organizationId: number): Promise<User[]> {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.organizationId, organizationId));
    return users;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(usersTable)
      .set(userData)
      .where(eq(usersTable.id, id))
      .returning();
    return updatedUser;
  }

  // Отделы
  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, id));
    return department;
  }

  async getDepartments(organizationId: number): Promise<Department[]> {
    const departments = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.organizationId, organizationId));
    return departments;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDept] = await db
      .insert(departmentsTable)
      .values({
        ...department,
        createdAt: new Date(),
      })
      .returning();
    return newDept;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const [updatedDept] = await db
      .update(departmentsTable)
      .set(departmentData)
      .where(eq(departmentsTable.id, id))
      .returning();
    return updatedDept;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await db
      .delete(departmentsTable)
      .where(eq(departmentsTable.id, id));
    return true; // В drizzle нет прямого способа узнать количество удаленных строк
  }

  // Сотрудники
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, id));
    return employee;
  }

  async getEmployees(organizationId: number, departmentId?: number): Promise<Employee[]> {
    if (departmentId) {
      return db
        .select()
        .from(employeesTable)
        .where(
          and(
            eq(employeesTable.organizationId, organizationId),
            eq(employeesTable.departmentId, departmentId)
          )
        );
    } else {
      return db
        .select()
        .from(employeesTable)
        .where(eq(employeesTable.organizationId, organizationId));
    }
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employeesTable)
      .values({
        ...employee,
        createdAt: new Date(),
        dismissed: false,
        dismissalDate: null,
        dismissalOrderNumber: null,
        photo: null,
      })
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db
      .update(employeesTable)
      .set(employeeData)
      .where(eq(employeesTable.id, id))
      .returning();
    return updatedEmployee;
  }

  async dismissEmployee(id: number, dismissalDate: Date, dismissalOrderNumber: string): Promise<Employee | undefined> {
    const [dismissedEmployee] = await db
      .update(employeesTable)
      .set({
        dismissed: true,
        dismissalDate,
        dismissalOrderNumber,
      })
      .where(eq(employeesTable.id, id))
      .returning();
    return dismissedEmployee;
  }

  // Документы сотрудников
  async getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
    const documents = await db
      .select()
      .from(employeeDocumentsTable)
      .where(eq(employeeDocumentsTable.employeeId, employeeId));
    return documents;
  }

  async addEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const [newDocument] = await db
      .insert(employeeDocumentsTable)
      .values(document)
      .returning();
    return newDocument;
  }

  async deleteEmployeeDocument(id: number): Promise<boolean> {
    await db
      .delete(employeeDocumentsTable)
      .where(eq(employeeDocumentsTable.id, id));
    return true;
  }

  // Имущество
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db
      .select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, id));
    return item;
  }

  async getInventoryItems(employeeId: number): Promise<InventoryItem[]> {
    const items = await db
      .select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.employeeId, employeeId));
    return items;
  }

  async getInventoryItemsByDepartment(departmentId: number): Promise<InventoryItem[]> {
    const items = await db
      .select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.departmentId, departmentId));
    return items;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db
      .insert(inventoryItemsTable)
      .values({
        ...item,
        createdAt: new Date(),
      })
      .returning();
    return newItem;
  }

  async updateInventoryItem(id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const [updatedItem] = await db
      .update(inventoryItemsTable)
      .set(itemData)
      .where(eq(inventoryItemsTable.id, id))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    await db
      .delete(inventoryItemsTable)
      .where(eq(inventoryItemsTable.id, id));
    return true;
  }

  // Статистика
  async getDepartmentStats(organizationId: number): Promise<{
    departmentId: number;
    departmentName: string;
    employeeCount: number;
    inventoryCount: number;
  }[]> {
    const departments = await this.getDepartments(organizationId);
    
    // Для каждого департамента находим количество сотрудников и инвентаря
    return Promise.all(departments.map(async (dept) => {
      const employees = await this.getEmployees(organizationId, dept.id);
      const inventory = await this.getInventoryItemsByDepartment(dept.id);
      
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: employees.length,
        inventoryCount: inventory.length,
      };
    }));
  }
}

// Реализация MemStorage для поддержки обратной совместимости
export class MemStorage implements IStorage {
  private organizations: Map<number, Organization>;
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private employees: Map<number, Employee>;
  private employeeDocuments: Map<number, EmployeeDocument>;
  private inventoryItems: Map<number, InventoryItem>;
  
  private orgId: number;
  private userId: number;
  private departmentId: number;
  private employeeId: number;
  private documentId: number;
  private inventoryId: number;
  
  sessionStore: session.Store;

  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.departments = new Map();
    this.employees = new Map();
    this.employeeDocuments = new Map();
    this.inventoryItems = new Map();
    
    this.orgId = 1;
    this.userId = 1;
    this.departmentId = 1;
    this.employeeId = 1;
    this.documentId = 1;
    this.inventoryId = 1;
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Очищать устаревшие сессии каждые 24 часа
    });
  }

  // Организации
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const id = this.orgId++;
    const newOrg: Organization = { 
      ...organization, 
      id, 
      createdAt: new Date() 
    };
    this.organizations.set(id, newOrg);
    return newOrg;
  }

  // Пользователи
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUsers(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.organizationId === organizationId
    );
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Отделы
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getDepartments(organizationId: number): Promise<Department[]> {
    return Array.from(this.departments.values()).filter(
      (dept) => dept.organizationId === organizationId
    );
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const id = this.departmentId++;
    const newDept: Department = { 
      ...department, 
      id, 
      createdAt: new Date() 
    };
    this.departments.set(id, newDept);
    return newDept;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const department = this.departments.get(id);
    if (!department) return undefined;
    
    const updatedDepartment = { ...department, ...departmentData };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    return this.departments.delete(id);
  }

  // Сотрудники
  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployees(organizationId: number, departmentId?: number): Promise<Employee[]> {
    return Array.from(this.employees.values()).filter(
      (employee) => {
        if (departmentId) {
          return employee.organizationId === organizationId && 
                employee.departmentId === departmentId;
        }
        return employee.organizationId === organizationId;
      }
    );
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeId++;
    const newEmployee: Employee = { 
      ...employee, 
      id, 
      dismissed: false,
      dismissalDate: null,
      dismissalOrderNumber: null,
      photo: null,
      createdAt: new Date() 
    };
    this.employees.set(id, newEmployee);
    return newEmployee;
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updatedEmployee = { ...employee, ...employeeData };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  async dismissEmployee(id: number, dismissalDate: Date, dismissalOrderNumber: string): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const dismissedEmployee = { 
      ...employee, 
      dismissed: true, 
      dismissalDate, 
      dismissalOrderNumber 
    };
    this.employees.set(id, dismissedEmployee);
    return dismissedEmployee;
  }

  // Документы сотрудников
  async getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
    return Array.from(this.employeeDocuments.values()).filter(
      (doc) => doc.employeeId === employeeId
    );
  }

  async addEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const id = this.documentId++;
    const newDocument: EmployeeDocument = { 
      ...document, 
      id, 
      uploadDate: new Date() 
    };
    this.employeeDocuments.set(id, newDocument);
    return newDocument;
  }

  async deleteEmployeeDocument(id: number): Promise<boolean> {
    return this.employeeDocuments.delete(id);
  }

  // Имущество
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async getInventoryItems(employeeId: number): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.employeeId === employeeId
    );
  }

  async getInventoryItemsByDepartment(departmentId: number): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.departmentId === departmentId
    );
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.inventoryId++;
    const newItem: InventoryItem = { 
      ...item, 
      id, 
      createdAt: new Date() 
    };
    this.inventoryItems.set(id, newItem);
    return newItem;
  }

  async updateInventoryItem(id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const item = this.inventoryItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.inventoryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    return this.inventoryItems.delete(id);
  }

  // Статистика
  async getDepartmentStats(organizationId: number): Promise<{
    departmentId: number;
    departmentName: string;
    employeeCount: number;
    inventoryCount: number;
  }[]> {
    const departments = await this.getDepartments(organizationId);
    const result = [];

    for (const dept of departments) {
      const employees = await this.getEmployees(organizationId, dept.id);
      const inventory = await this.getInventoryItemsByDepartment(dept.id);

      result.push({
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: employees.length,
        inventoryCount: inventory.length
      });
    }

    return result;
  }
}

// Используем хранилище на основе базы данных
export const storage = new DatabaseStorage();