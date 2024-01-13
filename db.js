// db.js

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Set your database connection URL
});

module.exports = pool;
