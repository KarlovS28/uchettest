import express, { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";

// Настроим хранилище для multer
const uploadDir = path.join(process.cwd(), "uploads");

// Создаем директорию uploads, если она не существует
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища multer
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Создаем директорию для каждого типа файлов
    let targetDir = uploadDir;
    
    if (file.fieldname === "photo") {
      targetDir = path.join(uploadDir, "photos");
    } else if (file.fieldname === "document") {
      targetDir = path.join(uploadDir, "documents");
    }
    
    // Создаем директорию, если она не существует
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// Проверка типа файла
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Разрешим загрузку только определенных типов файлов
  if (file.fieldname === "photo") {
    // Для фотографий - только изображения
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Можно загрузить только изображения"));
    }
  } else if (file.fieldname === "document") {
    // Для документов - PDF, Word, Excel, изображения
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Неподдерживаемый формат файла"));
    }
  } else {
    cb(null, false);
  }
};

// Создаем экземпляр multer
const upload = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимальный размер
  },
});

export function setupFileUploads(app: Express) {
  // Маршрут для загрузки фотографии сотрудника
  app.post("/api/upload/photo/:employeeId", upload.single("photo"), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      const employeeId = parseInt(req.params.employeeId);
      
      if (!req.file) {
        return res.status(400).json({ error: "Файл не был загружен" });
      }
      
      // Получаем сотрудника для обновления
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }
      
      // Обновляем путь к фото
      const photoPath = `/uploads/photos/${req.file.filename}`;
      const updatedEmployee = await storage.updateEmployee(employeeId, {
        ...employee,
        photo: photoPath,
      });
      
      res.json({ 
        success: true, 
        photoUrl: photoPath, 
        employee: updatedEmployee 
      });
    } catch (error) {
      res.status(500).json({ error: "Не удалось загрузить фотографию" });
    }
  });

  // Маршрут для загрузки документа сотрудника
  app.post("/api/upload/document/:employeeId", upload.single("document"), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    
    try {
      const employeeId = parseInt(req.params.employeeId);
      
      if (!req.file) {
        return res.status(400).json({ error: "Файл не был загружен" });
      }
      
      // Проверяем существование сотрудника
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Сотрудник не найден" });
      }
      
      // Добавляем запись о документе в хранилище
      const documentPath = `/uploads/documents/${req.file.filename}`;
      const document = await storage.addEmployeeDocument({
        employeeId,
        filename: req.file.originalname,
        path: documentPath,
      });
      
      res.json({ 
        success: true, 
        document 
      });
    } catch (error) {
      res.status(500).json({ error: "Не удалось загрузить документ" });
    }
  });

  // Маршрут для получения статичных файлов из uploads
  app.use("/uploads", (req, res, next) => {
    // Проверяем аутентификацию для доступа к файлам
    if (!req.isAuthenticated()) {
      return res.status(401).send("Требуется авторизация");
    }
    next();
  }, express.static(uploadDir));
}
