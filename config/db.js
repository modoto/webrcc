const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "P@ssword",
  database: "dbcomando",
  port: 5432,
});

module.exports = pool;
