const { db } = require('@vercel/postgres');
const fs = require('fs');

// Load environment variables from .env.local
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const postgresUrl = env.match(/POSTGRES_URL=([^\s]+)/)?.[1]?.replace(/['"]/g, '');
    if (postgresUrl) {
        process.env.POSTGRES_URL = postgresUrl;
    }
} catch (e) {
    console.error("Failed to load .env.local:", e.message);
}

async function check() {
    try {
        console.log("Connecting to database...");
        const client = await db.connect();
        const { rows } = await client.sql`SELECT count(*) as count FROM leads`;
        console.log("Total leads in DB:", rows[0].count);
        process.exit(0);
    } catch (e) {
        console.error("DB Error:", e);
        process.exit(1);
    }
}
check();
