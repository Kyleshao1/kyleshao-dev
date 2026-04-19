const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("Missing JWT_SECRET");
}

function signAccessToken(user, expiresIn = "1h") {
  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };
