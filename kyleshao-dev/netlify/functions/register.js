const bcrypt = require("bcryptjs");
const { ensureInit, getPool } = require("./_lib/db");
const { signAccessToken } = require("./_lib/jwt");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    await ensureInit();
    const payload = JSON.parse(event.body || "{}");
    const username = String(payload.username || "").trim();
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");

    if (!username || !email || password.length < 8) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid payload" }) };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await getPool().query(
      "INSERT INTO users (username, email, password_hash) VALUES (?,?,?)",
      [username, email, passwordHash]
    );
    const user = { id: result.insertId, username, email };
    const token = signAccessToken(user, "2h");
    return {
      statusCode: 200,
      body: JSON.stringify({ token, user })
    };
  } catch (err) {
    const msg = err?.message || "Server error";
    const code = msg.includes("Duplicate") ? 409 : 500;
    return { statusCode: code, body: JSON.stringify({ error: msg }) };
  }
};
