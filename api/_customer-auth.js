// Session de connexion client (facultative) — cookie signé indiquant quel email est connecté.
// Séparé de la session admin (_auth.js) : portée et durée de vie différentes.
//
// Variable d'environnement à configurer :
//   CUSTOMER_SESSION_SECRET — chaîne aléatoire longue, utilisée pour signer le cookie

const crypto = require('crypto');

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function sign(value) {
  return crypto.createHmac('sha256', process.env.CUSTOMER_SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken(email) {
  const expires = String(Date.now() + SESSION_DURATION_MS);
  const payload = `${Buffer.from(email).toString('base64url')}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Retourne l'email du client connecté, ou null si pas de session valide.
function getLoggedInEmail(req) {
  const token = getCookie(req, 'customer_session');
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [emailB64, expires, signature] = parts;
  const payload = `${emailB64}.${expires}`;

  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) return null;
  if (Date.now() > parseInt(expires, 10)) return null;

  try {
    return Buffer.from(emailB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { createSessionToken, getLoggedInEmail, SESSION_DURATION_MS };
