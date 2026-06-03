// src/config/db.js — PostgreSQL connection pool
import pg from 'pg';

const { Pool } = pg;

let pool;

export function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.PG_URI,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
            console.error('⚠️  PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

// Helper: run a query
export async function query(text, params) {
    const p = getPool();
    return p.query(text, params);
}

// Helper: get a client (for transactions)
export async function getClient() {
    const p = getPool();
    return p.connect();
}

// Verify connection on startup
export async function connectDB() {
    try {
        const p = getPool();
        const result = await p.query('SELECT NOW() as now, current_database() as db');
        console.log(`✅ PostgreSQL conectado: ${result.rows[0].db} @ ${result.rows[0].now}`);
        return true;
    } catch (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
        throw err;
    }
}

export default { getPool, query, getClient, connectDB };
