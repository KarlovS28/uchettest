// db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES modules compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Create pool with proper connection string
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://div.devops@localhost:5432/div.devops'
});

// Test connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL database'))
    .catch(err => console.error('❌ Database connection error:', err.message));

// Export both pool and db (which is the same as pool) to satisfy both imports
export const db = pool;
export { pool };

// Also export default for compatibility with any other imports
export default pool;