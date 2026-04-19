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
    const identifier = String(payload.identifier || payload.email || "").trim();
    const password = String(payload.password || "");

    if (!identifier || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    let [rows] = await getPool().query("SELECT * FROM users WHERE email=?", [identifier]);
    if (!rows[0]) {
      [rows] = await getPool().query("SELECT * FROM users WHERE username=?", [identifier]);
    }
    const user = rows[0];
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }

    const token = signAccessToken(user, "2h");
    return {
      statusCode: 200,
      body: JSON.stringify({ token, user: { id: user.id, username: user.username, email: user.email } })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || "Server error" }) };
  }
};
