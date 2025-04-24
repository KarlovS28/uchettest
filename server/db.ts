import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from 'dotenv';
import path from 'path'; // ghbdtn

// 1. Явная загрузка .env с абсолютным путём
config({ path: path.resolve(__dirname, './.env') });

// 2. Настройка WebSocket
neonConfig.webSocketConstructor = ws;

// 3. Получение параметров подключения
const connectionParams = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'postgres',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  ssl: process.env.PG_SSL === 'true'
};

// 4. Формирование connectionString
const connectionString = process.env.DATABASE_URL ||
    `postgres://${connectionParams.user}:${connectionParams.password}@${connectionParams.host}:${connectionParams.port}/${connectionParams.database}`;

// 5. Проверка параметров
if (!connectionString) {
  console.error('❌ Не указаны параметры подключения к БД');
  console.log('Добавьте в .env один из вариантов:');
  console.log('1. Полный URL:');
  console.log('DATABASE_URL="postgres://localhost:5432"');
  console.log('2. Или отдельные параметры:');
  console.log('PG_HOST=localhost\nPG_PORT=5432\nPG_DATABASE=mydb\nPG_USER=user\nPG_PASSWORD=pass');
  throw new Error("Database configuration required");
}

// 6. Инициализация пула с явными параметрами
export const pool = new Pool({
  connectionString,
  ...(process.env.DATABASE_URL ? {} : connectionParams) // Добавляем параметры, если не используется DATABASE_URL
});

// 7. Проверка подключения
pool.query('SELECT 1')
    .then(() => console.log('✅ Подключение к PostgreSQL успешно'))
    .catch(err => {
      console.error('❌ Ошибка подключения:', err.message);
      console.log('Проверьте:');
      console.log(`- Доступность хоста: ${connectionParams.host}`);
      console.log(`- Порт: ${connectionParams.port}`);
      console.log(`- Учётные данные пользователя: ${connectionParams.user}`);
      process.exit(1);
    });

export const db = drizzle(pool, { schema });