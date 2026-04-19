const { ensureInit, getPool } = require("./_lib/db");
const { signAccessToken } = require("./_lib/jwt");
const { getClientById, verifyClientSecret, randomToken, ensureEnvClients } = require("./_lib/oauth");

function json(statusCode, payload) {
  return { statusCode, body: JSON.stringify(payload) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    await ensureInit();
    await ensureEnvClients();
    const body = JSON.parse(event.body || "{}");
    const {
      grant_type,
      code,
      client_id,
      client_secret,
      redirect_uri
    } = body;

    if (grant_type !== "authorization_code") {
      return json(400, { error: "unsupported_grant_type" });
    }
    if (!code || !client_id || !client_secret || !redirect_uri) {
      return json(400, { error: "invalid_request" });
    }

    const client = await getClientById(client_id);
    if (!client || client.redirect_uri !== redirect_uri) {
      return json(400, { error: "invalid_client" });
    }
    const ok = await verifyClientSecret(client, client_secret);
    if (!ok) {
      return json(401, { error: "invalid_client" });
    }

    const [rows] = await getPool().query(
      "SELECT * FROM oauth_codes WHERE code=? AND client_id=? LIMIT 1",
      [code, client_id]
    );
    const row = rows[0];
    if (!row) {
      return json(400, { error: "invalid_code" });
    }
    if (row.redirect_uri !== redirect_uri) {
      return json(400, { error: "invalid_redirect_uri" });
    }
    if (new Date(row.expires_at) < new Date()) {
      return json(400, { error: "code_expired" });
    }

    const [userRows] = await getPool().query(
      "SELECT id, username, email FROM users WHERE id=? LIMIT 1",
      [row.user_id]
    );
    const user = userRows[0];
    if (!user) {
      return json(400, { error: "user_not_found" });
    }

    const accessToken = signAccessToken(user, "1h");
    const refreshToken = randomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await getPool().query(
      "INSERT INTO oauth_tokens (access_token, refresh_token, client_id, user_id, scope, expires_at) VALUES (?,?,?,?,?,?)",
      [accessToken, refreshToken, client_id, user.id, row.scope || "", expiresAt]
    );
    await getPool().query("DELETE FROM oauth_codes WHERE code=?", [code]);

    return json(200, {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken
    });
  } catch (err) {
    return json(500, { error: err?.message || "server_error" });
  }
};
