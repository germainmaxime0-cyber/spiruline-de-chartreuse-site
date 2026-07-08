// Demande de réinitialisation de mot de passe — envoie un lien à usage unique par email,
// valable 1h. Ne révèle jamais si un email existe ou non (réponse générique dans tous les cas).

const crypto = require('crypto');
const { kv } = require('@vercel/kv');
const { getCustomer } = require('./_customers');
const { sendEmail } = require('./_mailer');

const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1h
const SITE_URL = process.env.SITE_URL || 'https://www.spirulinedechartreuse.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email } = req.body || {};
  const genericResponse = { message: 'Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.' };

  if (!email) {
    return res.status(200).json(genericResponse);
  }

  try {
    const customer = await getCustomer(email);
    if (customer) {
      const token = crypto.randomBytes(32).toString('hex');
      await kv.set(`password-reset:${token}`, { email: customer.email }, { ex: RESET_TOKEN_TTL_SECONDS });

      const resetUrl = `${SITE_URL}/reset-password.html?token=${token}`;
      await sendEmail({
        to: customer.email,
        subject: 'Réinitialisation de votre mot de passe — Spiruline de Chartreuse',
        html: `
          <p>Bonjour ${customer.prenom || ''},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        `,
      });
    }
  } catch (err) {
    console.error('Échec envoi email de réinitialisation :', err.message);
  }

  return res.status(200).json(genericResponse);
};
