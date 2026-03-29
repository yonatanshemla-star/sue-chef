const { db } = require('@vercel/postgres');
const fs = require('fs');

try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const postgresUrl = env.match(/POSTGRES_URL=([^\s]+)/)?.[1]?.replace(/['"]/g, '');
    if (postgresUrl) {
        process.env.POSTGRES_URL = postgresUrl;
    }
} catch (e) {}

async function check() {
    try {
        const client = await db.connect();
        const { rows } = await client.sql`
            SELECT count(*) as count 
            FROM leads 
            WHERE (data->>'wasRelevant')::boolean = true
        `;
        console.log("ACTUAL_DB_WAS_RELEVANT_COUNT:" + rows[0].count);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
