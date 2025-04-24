import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupFileUploads } from "./files";
import * as z from "zod";
import {
  insertUserSchema,
  insertDepartmentSchema,
  insertEmployeeSchema,
  insertInventoryItemSchema,
  insertEmployeeDocumentSchema,
  userPermissionsSchema
} from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

// Вспомогательная функция для проверки разрешений пользователя
function checkPermission(req: Request, permission: string): boolean {
  if (!req.user) return false;
  
  // @ts-ignore - добавляем permissions в тип User, но не обновляем глобальный тип
  const permissions = req.user.permissions as string[];
  return permissions.includes("full_access") || permissions.includes(permission);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка аутентификации
  setupAuth(app);
  
  // Настройка загрузки файлов
  setupFileUploads(app);

  // **************** API маршруты ****************
  
  // Проверка статуса системы
  app.get("/api/system-status", async (_req: Request, res: Response) => {
    try {
      // Проверяем, есть ли хотя бы одна организация и пользователь
      const firstOrg = await storage.getOrganization(1);
      const isSetup = !!firstOrg;
      
      res.json({ isSetup });
    } catch (error) {
      res.status(500).json({ error: "Не удалось проверить статус системы" });
    }
  });
  
  // Первоначальная настройка системы
  app.post("/api/setup", async (req: Request, res: Response) => {
    try {
      // Проверяем, не настроена ли уже система
      const firstOrg = await storage.getOrganization(1);
      if (firstOrg) {
        return res.status(400).json({ error: "Система уже настроена" });
      }
      
      const { organizationName, adminUsername, adminPassword, adminFullName, adminPosition } = req.body;
      
      if (!organizationName || !adminUsername || !adminPassword || !adminFullName || !adminPosition) {
        return res.status(400).json({ error: "Не указаны все необходимые данные" });
      }
      
      // Создаем организацию
      const organization = await storage.createOrganization({
        name: organizationName
      });
      
      // Создаем администратора
      const admin = await storage.createUser({
        username: adminUsername,
        password: adminPassword,
        fullName: adminFullName,
        position: adminPosition,
        organizationId: organization.id,
        role: "admin",
        permissions: ["full_access"]
      });
      
      res.status(201).json({
        message: "Система успешно настроена",
        organization,
        admin
      });
    } catch (error) {
      res.status(500).json({ error: "Не удалось настроить систему" });
    }
  });
  
  // Организации
  app.post("/api/organizations", async (req: Request, res: Response) => {
    try {
      const orgData = req.body;
      const org = await storage.createOrganization(orgData);
      res.status(201).json(org);
    } catch (error) {
      res.status(400).json({ error: "Не удалось создать организацию" });
    }
  });

  app.get("/api/organizations/:id", async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const org = await storage.getOrganization(orgId);
      
      if (!org) {
        return res.status(404).json({ error: "Организация не найдена" });
      }
      
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить данные организации" });
    }
  });

  // Пользователи
  app.get("/api/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "view_employee_data")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      const organizationId = req.user.organizationId;
      const users = await storage.getUsers(organizationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить список пользователей" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_employees")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const userData = req.body;
      
      // Проверим разрешения через zod
      const permissionsResult = userPermissionsSchema.safeParse(userData.permissions);
      if (!permissionsResult.success) {
        return res.status(400).json({ error: "Неверно указаны разрешения пользователя" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: "Не удалось создать пользователя" });
    }
  });

  // Отделы
  app.get("/api/departments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      const organizationId = req.user.organizationId;
      const departments = await storage.getDepartments(organizationId);
      
      // Если запрошена статистика, добавим ее
      if (req.query.stats === "true") {
        const stats = await storage.getDepartmentStats(organizationId);
        res.json(stats);
      } else {
        res.json(departments);
      }
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить список отделов" });
    }
  });

  app.post("/api/departments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_departments")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      departmentData.organizationId = req.user.organizationId;
      
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Неверные данные отдела", details: error.format() });
      }
      res.status(400).json({ error: "Не удалось создать отдел" });
    }
  });

  app.put("/api/departments/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_departments")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const departmentId = parseInt(req.params.id);
      const departmentData = req.body;
      
      const department = await storage.updateDepartment(departmentId, departmentData);
      
      if (!department) {
        return res.status(404).json({ error: "Отдел не найден" });
      }
      
      res.json(department);
    } catch (error) {
      res.status(400).json({ error: "Не удалось обновить отдел" });
    }
  });

  app.delete("/api/departments/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_departments")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const departmentId = parseInt(req.params.id);
      const success = await storage.deleteDepartment(departmentId);
      
      if (!success) {
        return res.status(404).json({ error: "Отдел не найден" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Не удалось удалить отдел" });
    }
  });

  // Сотрудники
  app.get("/api/employees", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      const organizationId = req.user.organizationId;
      let departmentId: number | undefined;
      
      if (req.query.departmentId) {
        departmentId = parseInt(req.query.departmentId as string);
      }
      
      const employees = await storage.getEmployees(organizationId, departmentId);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить список сотрудников" });
    }
  });

  app.get("/api/employees/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      const employeeId = parseInt(req.params.id);
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }
      
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      if (employee.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: "Нет доступа к данным этого сотрудника" });
      }
      
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить данные сотрудника" });
    }
  });

  app.post("/api/employees", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_employees")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      employeeData.organizationId = req.user.organizationId;
      
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Неверные данные сотрудника", details: error.format() });
      }
      res.status(400).json({ error: "Не удалось создать сотрудника" });
    }
  });

  app.put("/api/employees/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_employees")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const employeeId = parseInt(req.params.id);
      const employeeData = req.body;
      
      const employee = await storage.updateEmployee(employeeId, employeeData);
      
      if (!employee) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }
      
      res.json(employee);
    } catch (error) {
      res.status(400).json({ error: "Не удалось обновить данные сотрудника" });
    }
  });

  // Увольнение сотрудника
  app.post("/api/employees/:id/dismiss", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_employees")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const employeeId = parseInt(req.params.id);
      const { dismissalDate, dismissalOrderNumber } = req.body;
      
      if (!dismissalDate || !dismissalOrderNumber) {
        return res.status(400).json({ error: "Требуется указать дату увольнения и номер приказа" });
      }
      
      const employee = await storage.dismissEmployee(
        employeeId, 
        new Date(dismissalDate), 
        dismissalOrderNumber
      );
      
      if (!employee) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }
      
      res.json(employee);
    } catch (error) {
      res.status(400).json({ error: "Не удалось уволить сотрудника" });
    }
  });

  // Документы сотрудников
  app.get("/api/employees/:id/documents", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      const employeeId = parseInt(req.params.id);
      const documents = await storage.getEmployeeDocuments(employeeId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить документы сотрудника" });
    }
  });

  app.delete("/api/employees/documents/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_employees")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const documentId = parseInt(req.params.id);
      const success = await storage.deleteEmployeeDocument(documentId);
      
      if (!success) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Не удалось удалить документ" });
    }
  });

  // Имущество
  app.get("/api/inventory", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      let items = [];
      
      // Получение имущества по сотруднику
      if (req.query.employeeId) {
        const employeeId = parseInt(req.query.employeeId as string);
        items = await storage.getInventoryItems(employeeId);
      }
      // Получение имущества по отделу
      else if (req.query.departmentId) {
        const departmentId = parseInt(req.query.departmentId as string);
        items = await storage.getInventoryItemsByDepartment(departmentId);
      }
      // Если не указано ни то, ни другое - ошибка
      else {
        return res.status(400).json({ error: "Требуется указать employeeId или departmentId" });
      }
      
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Не удалось получить список имущества" });
    }
  });

  app.post("/api/inventory", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_liability")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      itemData.organizationId = req.user.organizationId;
      
      const item = await storage.createInventoryItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Неверные данные имущества", details: error.format() });
      }
      res.status(400).json({ error: "Не удалось добавить имущество" });
    }
  });

  app.put("/api/inventory/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_liability")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const itemId = parseInt(req.params.id);
      const itemData = req.body;
      
      const item = await storage.updateInventoryItem(itemId, itemData);
      
      if (!item) {
        return res.status(404).json({ error: "Имущество не найдено" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Не удалось обновить имущество" });
    }
  });

  app.delete("/api/inventory/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_liability")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      const itemId = parseInt(req.params.id);
      const success = await storage.deleteInventoryItem(itemId);
      
      if (!success) {
        return res.status(404).json({ error: "Имущество не найдено" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Не удалось удалить имущество" });
    }
  });

  // **************** Экспорт и импорт данных ****************
  
  // Используем уже импортированный XLSX
  const upload = multer({ dest: 'uploads/' });
  
  // Импорт списка сотрудников из Excel
  app.post("/api/import/employees", upload.single("file"), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_employees")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }
      
      // Чтение файла Excel
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Валидация и преобразование данных
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      const organizationId = req.user.organizationId;
      
      // Обработка каждой строки
      for (const row of data) {
        try {
          // Преобразуем даты из строк в объекты Date
          let hireDate;
          let birthDate;
          
          try {
            hireDate = new Date(row.hireDate || row.ДатаПриема);
            if (isNaN(hireDate.getTime())) {
              hireDate = new Date(); // Если не удалось преобразовать, используем текущую дату
            }
          } catch (e) {
            hireDate = new Date();
          }
          
          try {
            birthDate = new Date(row.birthDate || row.ДатаРождения);
            if (isNaN(birthDate.getTime())) {
              birthDate = new Date(1980, 0, 1); // Дата по умолчанию
            }
          } catch (e) {
            birthDate = new Date(1980, 0, 1);
          }
          
          const employeeData = {
            fullName: row.fullName || row.ФИО || "",
            position: row.position || row.Должность || "",
            departmentId: parseInt(String(row.departmentId || row.ОтделИд || "0")),
            hireDate: hireDate,
            hireOrderNumber: String(row.hireOrderNumber || row.НомерПриказа || ""),
            passport: String(row.passport || row.Паспорт || ""),
            birthDate: birthDate,
            address: String(row.address || row.Адрес || ""),
            phone: String(row.phone || row.Телефон || ""),
            materialLiabilityType: String(row.materialLiabilityType || row.ТипМатОтветственности || "none"),
            materialLiabilityDocument: null,
            organizationId: organizationId,
            dismissed: false,
            dismissalDate: null,
            dismissalOrderNumber: null,
            photo: null
          };

          // Проверка обязательных полей
          if (!employeeData.fullName || !employeeData.position || !employeeData.departmentId) {
            results.failed++;
            results.errors.push(`Строка ${results.success + results.failed}: Не указаны обязательные поля`);
            continue;
          }

          // Создание сотрудника
          await storage.createEmployee(employeeData);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Строка ${results.success + results.failed}: ${error}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Ошибка при импорте сотрудников:", error);
      res.status(500).json({ error: "Ошибка при импорте сотрудников" });
    }
  });
  
  // Импорт списка инвентаря из Excel
  app.post("/api/import/inventory", upload.single("file"), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    if (!checkPermission(req, "manage_liability")) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }
      
      // Чтение файла Excel
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Результаты импорта
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      const organizationId = req.user.organizationId;
      
      // Обработка каждой строки
      for (const row of data) {
        try {
          const inventoryData = {
            name: String(row.name || row.Наименование || ""),
            inventoryNumber: String(row.inventoryNumber || row.ИнвентарныйНомер || ""),
            description: String(row.description || row.Описание || ""),
            cost: parseInt(String(row.cost || row.value || row.Стоимость || "0")),
            employeeId: parseInt(String(row.employeeId || row.СотрудникИд || "0")),
            departmentId: parseInt(String(row.departmentId || row.ОтделИд || "0")),
            organizationId: organizationId
          };

          // Проверка обязательных полей
          if (!inventoryData.name || (!inventoryData.employeeId && !inventoryData.departmentId)) {
            results.failed++;
            results.errors.push(`Строка ${results.success + results.failed}: Не указаны обязательные поля`);
            continue;
          }

          // Создание записи инвентаря
          await storage.createInventoryItem(inventoryData);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Строка ${results.success + results.failed}: ${error}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Ошибка при импорте инвентаря:", error);
      res.status(500).json({ error: "Ошибка при импорте инвентаря" });
    }
  });
  
  // Экспорт списка сотрудников в Excel
  app.get("/api/export/employees", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      // @ts-ignore - тип User не включает organizationId из типа в схеме
      const organizationId = req.user.organizationId;
      let departmentId = undefined;
      
      if (req.query.departmentId) {
        departmentId = parseInt(req.query.departmentId as string);
      }
      
      // Получаем список сотрудников
      const employees = await storage.getEmployees(organizationId, departmentId);
      
      // Преобразуем для экспорта
      const exportData = employees.map(employee => ({
        'ФИО': employee.fullName,
        'Должность': employee.position,
        'Отдел (ID)': employee.departmentId,
        'Дата приема': employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '',
        'Номер приказа': employee.hireOrderNumber,
        'Паспорт': employee.passport,
        'Дата рождения': employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : '',
        'Адрес': employee.address,
        'Телефон': employee.phone,
        'Тип мат. ответственности': employee.materialLiabilityType,
        'Статус': employee.dismissed ? 'Уволен' : 'Работает',
        'Дата увольнения': employee.dismissalDate ? new Date(employee.dismissalDate).toLocaleDateString() : ''
      }));
      
      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Сотрудники");
      
      // Отправляем файл
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
      
      // Создаем бинарные данные и отправляем
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      res.send(excelBuffer);
    } catch (error) {
      console.error("Ошибка при экспорте сотрудников:", error);
      res.status(500).json({ error: "Ошибка при экспорте сотрудников" });
    }
  });
  
  // Экспорт списка инвентаря в Excel
  app.get("/api/export/inventory", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      let items = [];
      
      // Получение имущества по сотруднику или отделу
      if (req.query.employeeId) {
        const employeeId = parseInt(req.query.employeeId as string);
        items = await storage.getInventoryItems(employeeId);
      } else if (req.query.departmentId) {
        const departmentId = parseInt(req.query.departmentId as string);
        items = await storage.getInventoryItemsByDepartment(departmentId);
      } else {
        return res.status(400).json({ error: "Требуется указать employeeId или departmentId" });
      }
      
      // Преобразуем для экспорта
      const exportData = items.map(item => ({
        'Наименование': item.name,
        'Инвентарный номер': item.inventoryNumber,
        'Стоимость': item.cost,
        'Сотрудник (ID)': item.employeeId,
        'Отдел (ID)': item.departmentId,
        'Описание': item.description || ''
      }));
      
      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Инвентарь");
      
      // Отправляем файл
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory.xlsx');
      
      // Создаем бинарные данные и отправляем
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      res.send(excelBuffer);
    } catch (error) {
      console.error("Ошибка при экспорте инвентаря:", error);
      res.status(500).json({ error: "Ошибка при экспорте инвентаря" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
