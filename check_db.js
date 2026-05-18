const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/POSTGRES_URL=([^\n]+)/)[1].trim();
process.env.POSTGRES_URL = url;

const { sql } = require('@vercel/postgres');

async function main() {
  try {
    const res = await sql`SELECT count(*) FROM leads`;
    console.log('Total Leads:', res.rows[0].count);
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
