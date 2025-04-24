import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    // Расширяем типы Express
    interface User extends Omit<User, 'password'> {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dela-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 день
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Маршрут для первоначальной настройки системы (создание организации и админа)
  app.post("/api/setup", async (req, res) => {
    try {
      // Проверяем, есть ли уже пользователи в системе
      const users = await storage.getUsers(1); // Проверка для первой организации
      if (users.length > 0) {
        return res.status(400).json({ error: "Система уже настроена" });
      }

      // Создаем организацию
      const { organizationName, adminUsername, adminPassword, adminFullName, adminPosition } = req.body;
      
      if (!organizationName || !adminUsername || !adminPassword || !adminFullName || !adminPosition) {
        return res.status(400).json({ error: "Не все поля заполнены" });
      }

      const organization = await storage.createOrganization({
        name: organizationName,
      });

      // Создаем администратора с полными правами
      const admin = await storage.createUser({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        fullName: adminFullName,
        position: adminPosition,
        organizationId: organization.id,
        role: "admin",
        permissions: ["full_access"],
      });

      // Авторизуемся как новый администратор
      req.login(admin, (err) => {
        if (err) {
          return res.status(500).json({ error: "Ошибка входа в систему" });
        }
        res.status(201).json({
          message: "Система успешно настроена",
          organization,
          admin: { ...admin, password: undefined },
        });
      });
    } catch (error) {
      console.error("Ошибка при настройке системы:", error);
      res.status(500).json({ error: "Не удалось настроить систему" });
    }
  });

  // Маршрут для входа в систему
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Скрываем пароль из ответа
    const userWithoutPassword = { ...req.user, password: undefined };
    res.status(200).json(userWithoutPassword);
  });

  // Маршрут для выхода из системы
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Маршрут для получения текущего пользователя
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Скрываем пароль из ответа
    const userWithoutPassword = { ...req.user, password: undefined };
    res.json(userWithoutPassword);
  });

  // Проверка, настроена ли система
  app.get("/api/system-status", async (req, res) => {
    try {
      // Проверяем, есть ли уже организации в системе
      const organizations = await storage.getOrganization(1);
      const isSetup = !!organizations;
      
      res.json({ isSetup });
    } catch (error) {
      console.error("Ошибка при проверке статуса системы:", error);
      res.status(500).json({ error: "Не удалось проверить статус системы" });
    }
  });
}