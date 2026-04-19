const mysql = require("mysql2/promise");

let pool;
let initPromise;

function getPool() {
  if (!pool) {
    const uri = process.env.DATABASE_URL;
    if (!uri) {
      throw new Error("Missing DATABASE_URL");
    }
    pool = mysql.createPool(uri);
  }
  return pool;
}

async function ensureTables() {
  const conn = await getPool().getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        client_secret_hash VARCHAR(255) NOT NULL,
        redirect_uri VARCHAR(512) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS oauth_codes (
        code VARCHAR(128) PRIMARY KEY,
        client_id VARCHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        redirect_uri VARCHAR(512) NOT NULL,
        scope VARCHAR(512),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        access_token VARCHAR(256) NOT NULL UNIQUE,
        refresh_token VARCHAR(256) UNIQUE,
        client_id VARCHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        scope VARCHAR(512),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS site_accounts (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        site_key ENUM('blog','forum','clipboard') NOT NULL,
        site_user_id VARCHAR(128) NOT NULL,
        site_username VARCHAR(64) NOT NULL,
        merged_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_site_user (site_key, site_user_id),
        UNIQUE KEY uq_site_username (site_key, site_username)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS merge_logs (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        site_key ENUM('blog','forum','clipboard') NOT NULL,
        site_username VARCHAR(64) NOT NULL,
        merged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        detail VARCHAR(512)
      )
    `);
  } finally {
    conn.release();
  }
}

async function ensureInit() {
  if (!initPromise) initPromise = ensureTables();
  return initPromise;
}

module.exports = { getPool, ensureInit };
