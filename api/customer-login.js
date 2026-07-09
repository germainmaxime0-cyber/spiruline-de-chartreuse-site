// Connexion à un compte client existant.

const { getCustomer, verifyPassword, toPublicProfile } = require('./_customers');
const { createSessionToken, SESSION_DURATION_MS } = require('./_customer-auth');
const { checkRateLimit } = require('./_rate-limit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  if (!(await checkRateLimit(req, 'customer-login'))) {
    return res.status(429).json({ error: 'Trop de tentatives. Merci de réessayer dans quelques minutes.' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const customer = await getCustomer(email);
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const token = createSessionToken(customer.email);
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  res.setHeader('Set-Cookie', `customer_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`);
  return res.status(200).json(toPublicProfile(customer));
};
