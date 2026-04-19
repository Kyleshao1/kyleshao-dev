const { ensureInit, getPool } = require("./_lib/db");
const { verifyAccessToken } = require("./_lib/jwt");
const { randomToken, getClientById, ensureEnvClients } = require("./_lib/oauth");

function json(statusCode, payload) {
  return { statusCode, body: JSON.stringify(payload) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    await ensureInit();
    await ensureEnvClients();
    const params = event.queryStringParameters || {};
    const clientId = params.client_id;
    const redirectUri = params.redirect_uri;
    const state = params.state;
    const responseType = params.response_type;
    const scope = params.scope || "";
    const token = params.token || (event.headers.authorization || "").replace("Bearer ", "");

    if (!clientId || !redirectUri || responseType !== "code") {
      return json(400, { error: "invalid_request" });
    }

    const client = await getClientById(clientId);
    if (!client || client.redirect_uri !== redirectUri) {
      return json(400, { error: "invalid_client" });
    }

    if (!token) {
      return json(401, { error: "login_required" });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return json(401, { error: "invalid_token" });
    }

    const code = randomToken(24);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await getPool().query(
      "INSERT INTO oauth_codes (code, client_id, user_id, redirect_uri, scope, expires_at) VALUES (?,?,?,?,?,?)",
      [code, clientId, payload.sub, redirectUri, scope, expiresAt]
    );

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);

    return {
      statusCode: 302,
      headers: { Location: url.toString() }
    };
  } catch (err) {
    return json(500, { error: err?.message || "server_error" });
  }
};
