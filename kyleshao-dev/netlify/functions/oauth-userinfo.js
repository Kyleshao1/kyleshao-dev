const { verifyAccessToken } = require("./_lib/jwt");
const { ensureInit, getPool } = require("./_lib/db");

function json(statusCode, payload) {
  return { statusCode, body: JSON.stringify(payload) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    await ensureInit();
    const header = event.headers.authorization || event.headers.Authorization || "";
    if (!header.startsWith("Bearer ")) {
      return json(401, { error: "missing_token" });
    }
    const token = header.slice("Bearer ".length).trim();
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return json(401, { error: "invalid_token" });
    }

    const [rows] = await getPool().query(
      "SELECT id, username, email FROM users WHERE id=? LIMIT 1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user) return json(404, { error: "user_not_found" });

    return json(200, { id: user.id, username: user.username, email: user.email });
  } catch (err) {
    return json(500, { error: err?.message || "server_error" });
  }
};
