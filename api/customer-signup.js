// Création d'un compte client (facultatif) — donne accès aux codes promo.

const { createCustomer } = require('./_customers');
const { createSessionToken, SESSION_DURATION_MS } = require('./_customer-auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email, password } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email et mot de passe (8 caractères minimum) requis' });
  }

  const customer = await createCustomer(email, password);
  if (!customer) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const token = createSessionToken(customer.email);
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  res.setHeader('Set-Cookie', `customer_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`);
  return res.status(200).json({ email: customer.email, hasOrdered: customer.hasOrdered });
};
