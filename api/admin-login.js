// Connexion à /admin.html — vérifie le mot de passe (ADMIN_PASSWORD) et pose un cookie de session signé.

const { createSessionToken, SESSION_DURATION_MS } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { password } = req.body || {};
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = createSessionToken();
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`);
  return res.status(200).json({ ok: true });
};
