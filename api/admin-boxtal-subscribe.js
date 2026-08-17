// Outil ponctuel (à usage unique) : crée la souscription Boxtal à l'événement TRACKING_CHANGED,
// pointant vers /api/boxtal-webhook. Le format exact du corps de la requête n'est pas confirmé par
// la documentation publique Boxtal — plusieurs noms de champs plausibles sont tentés, les réponses
// d'erreur de Boxtal indiquent généralement clairement le champ manquant/incorrect à ajuster.
//
// Une fois la souscription créée, Boxtal renvoie un secret de validation (voir leur doc webhooks) :
// à copier dans la variable d'environnement Vercel BOXTAL_WEBHOOK_SECRET.
//
// À supprimer une fois la souscription créée avec succès (pas besoin de le refaire).

const { requireAuth } = require('./_auth');
const { boxtalRequest } = require('./_boxtal');

const SITE_URL = process.env.SITE_URL || 'https://www.spirulinedechartreuse.com';
const WEBHOOK_URL = `${SITE_URL}/api/boxtal-webhook`;

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  // Si déjà existante : GET liste les souscriptions actuelles au lieu d'en recréer une.
  if (req.method === 'GET') {
    try {
      const data = await boxtalRequest('/v3.1/subscription');
      return res.status(200).json(data);
    } catch (err) {
      return res.status(502).json({ error: 'Échec de la lecture des souscriptions', status: err.status, data: err.data || err.message });
    }
  }

  try {
    const data = await boxtalRequest('/v3.1/subscription', {
      method: 'POST',
      body: { eventType: 'TRACKING_CHANGED', url: WEBHOOK_URL },
    });
    return res.status(200).json(data);
  } catch (err) {
    console.error('Échec création souscription Boxtal :', err.status, err.data || err.message);
    return res.status(502).json({ error: 'Échec de la création de la souscription', status: err.status, data: err.data || err.message });
  }
};
