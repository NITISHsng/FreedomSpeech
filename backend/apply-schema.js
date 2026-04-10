const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set in .env file.');
  console.log('Please add your Supabase connection string to .env, e.g.:');
  console.log('DATABASE_URL=postgresql://postgres:[password]@db.quorqmrjjbolwrdussah.supabase.co:5432/postgres');
  process.exit(1);
}

const sql = postgres(connectionString);

async function applySchema() {
  try {
    console.log('🚀 Loading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

    console.log('⚡ Applying schema to database...');
    // Split by semicolon to run multiple commands if needed, 
    // but postgres.js allows multi-statement in some cases.
    // However, it's safer to run it as a broad raw query.
    await sql.unsafe(schemaSql);

    console.log('✅ Schema applied successfully!');
  } catch (err) {
    console.error('❌ Error applying schema:', err.message);
  } finally {
    process.exit();
  }
}

applySchema();
