const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getPool } = require("./db");

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

async function getClientById(clientId) {
  const [rows] = await getPool().query(
    "SELECT id, name, client_secret_hash, redirect_uri FROM oauth_clients WHERE id=?",
    [clientId]
  );
  return rows[0];
}

async function verifyClientSecret(client, secret) {
  if (!client?.client_secret_hash) return false;
  return bcrypt.compare(secret, client.client_secret_hash);
}

async function createClientIfMissing({ id, name, secret, redirectUri }) {
  const [rows] = await getPool().query("SELECT id FROM oauth_clients WHERE id=?", [id]);
  if (rows[0]) return;
  const hash = await bcrypt.hash(secret, 10);
  await getPool().query(
    "INSERT INTO oauth_clients (id, name, client_secret_hash, redirect_uri) VALUES (?,?,?,?)",
    [id, name, hash, redirectUri]
  );
}

async function ensureEnvClients() {
  const pairs = [
    {
      id: process.env.CLIENT_ID_BLOG,
      secret: process.env.CLIENT_SECRET_BLOG,
      redirectUri: process.env.REDIRECT_URI_BLOG,
      name: "blog"
    },
    {
      id: process.env.CLIENT_ID_FORUM,
      secret: process.env.CLIENT_SECRET_FORUM,
      redirectUri: process.env.REDIRECT_URI_FORUM,
      name: "forum"
    },
    {
      id: process.env.CLIENT_ID_CLIPBOARD,
      secret: process.env.CLIENT_SECRET_CLIPBOARD,
      redirectUri: process.env.REDIRECT_URI_CLIPBOARD,
      name: "clipboard"
    }
  ];
  for (const item of pairs) {
    if (!item.id || !item.secret || !item.redirectUri) continue;
    await createClientIfMissing(item);
  }
}

module.exports = {
  randomToken,
  getClientById,
  verifyClientSecret,
  createClientIfMissing,
  ensureEnvClients
};
