const { db } = require('@vercel/postgres');
const fs = require('fs');

async function check() {
    try {
        console.log("Connecting to database...");
        const client = await db.connect();
        const { rows } = await client.sql`SELECT id, "aiSummary", "fullTranscription" FROM leads WHERE "aiSummary" IS NOT NULL OR "fullTranscription" IS NOT NULL LIMIT 5`;
        console.log("Found rows:", rows.length);
        fs.writeFileSync('db_results.json', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error("DB Error:", e);
        fs.writeFileSync('db_error.txt', e.message);
        process.exit(1);
    }
}
check();
