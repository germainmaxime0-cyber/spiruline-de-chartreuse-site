// Outil ponctuel : liste les catégories de contenu Boxtal disponibles (GET /content-category),
// pour trouver l'identifiant correspondant à "denrée non périssable" / "compléments alimentaires"
// et le renseigner dans la variable d'environnement BOXTAL_CONTENT_CATEGORY_ID.
// À supprimer une fois la bonne catégorie identifiée et configurée.

const { requireAuth } = require('./_auth');
const { boxtalRequest } = require('./_boxtal');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const data = await boxtalRequest('/shipping/v3.1/content-category');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erreur lecture des catégories Boxtal :', err.status, err.data || err.message);
    return res.status(502).json({ error: 'Échec de la récupération des catégories', status: err.status, data: err.data || err.message });
  }
};
