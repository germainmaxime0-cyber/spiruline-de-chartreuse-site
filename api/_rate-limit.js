// Limite le nombre de tentatives par adresse IP sur les endpoints sensibles (connexion,
// mot de passe oublié), pour empêcher un essai automatisé de centaines de mots de passe
// d'affilée. Utilise Vercel KV (déjà en place pour les commandes/clients), pas de dépendance
// supplémentaire.

const { kv } = require('@vercel/kv');

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Retourne true si la requête est autorisée à continuer, false si la limite est atteinte.
// Incrémente le compteur à chaque appel (succès ou échec), remis à zéro après WINDOW_SECONDS.
async function checkRateLimit(req, keyPrefix) {
  const ip = getClientIp(req);
  const key = `ratelimit:${keyPrefix}:${ip}`;
  const attempts = await kv.incr(key);
  if (attempts === 1) {
    await kv.expire(key, WINDOW_SECONDS);
  }
  return attempts <= MAX_ATTEMPTS;
}

module.exports = { checkRateLimit };
