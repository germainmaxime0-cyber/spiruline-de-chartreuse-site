// Authentification minimale de /admin.html — un mot de passe partagé (ADMIN_PASSWORD) donne
// un cookie de session signé, valable 12h. Pas de compte utilisateur : usage prévu pour 1-2 personnes.
//
// Variables d'environnement à configurer :
//   ADMIN_PASSWORD        — mot de passe d'accès à /admin.html (choisissez-en un fort)
//   ADMIN_SESSION_SECRET  — chaîne aléatoire longue, utilisée pour signer le cookie de session

const crypto = require('crypto');

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function sign(value) {
  return crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken() {
  const expires = String(Date.now() + SESSION_DURATION_MS);
  return `${expires}.${sign(expires)}`;
}

function isValidSessionToken(token) {
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;
  if (Date.now() > parseInt(expires, 10)) return false;

  const expected = sign(expires);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  return expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function requireAuth(req, res) {
  if (!isValidSessionToken(getCookie(req, 'admin_session'))) {
    res.status(401).json({ error: 'Non authentifié' });
    return false;
  }
  return true;
}

module.exports = { createSessionToken, requireAuth, SESSION_DURATION_MS };
