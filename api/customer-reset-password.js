// Applique le nouveau mot de passe à partir du token reçu par email (usage unique, valable 1h).

const { kv } = require('@vercel/kv');
const { updateCustomerPassword } = require('./_customers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { token, password } = req.body || {};
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ error: 'Lien invalide et mot de passe (8 caractères minimum) requis' });
  }

  const resetKey = `password-reset:${token}`;
  const data = await kv.get(resetKey);
  if (!data || !data.email) {
    return res.status(400).json({ error: 'Ce lien de réinitialisation est invalide ou a expiré' });
  }

  await updateCustomerPassword(data.email, password);
  await kv.del(resetKey);

  return res.status(200).json({ ok: true });
};
