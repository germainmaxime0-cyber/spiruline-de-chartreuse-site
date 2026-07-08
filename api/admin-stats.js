// Statistiques de vente pour /admin.html : total commandes/CA/panier moyen, répartition par
// catégorie et produits les plus vendus (en quantité — on ne stocke pas le prix unitaire par
// article dans les commandes, seulement le montant total), et une série quotidienne (date, CA,
// nombre de commandes) que le front-end regroupe ensuite par semaine/mois/année.
// Les commandes annulées sont exclues : elles ne correspondent pas à une vente effective.

const { requireAuth } = require('./_auth');
const { listOrders } = require('./_orders');

const CATEGORY_KEYWORDS = [
  { key: 'paillettes', label: 'Paillettes' },
  { key: 'comprimés', label: 'Comprimés' },
  { key: 'poudre', label: 'Poudre' },
];

function detectCategory(description) {
  const lower = (description || '').toLowerCase();
  for (const { key, label } of CATEGORY_KEYWORDS) {
    if (lower.includes(key)) return label;
  }
  return 'Autre';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const orders = (await listOrders(100000)).filter((o) => o.status !== 'annulee');

    let totalRevenue = 0;
    const categoryQty = {};
    const productQty = {};
    const dailyMap = new Map();

    for (const order of orders) {
      totalRevenue += order.montantTotalEur || 0;

      const day = (order.createdAt || '').slice(0, 10);
      if (day) {
        const entry = dailyMap.get(day) || { date: day, revenue: 0, orders: 0 };
        entry.revenue += order.montantTotalEur || 0;
        entry.orders += 1;
        dailyMap.set(day, entry);
      }

      for (const item of order.contenu || []) {
        const cat = detectCategory(item.description);
        categoryQty[cat] = (categoryQty[cat] || 0) + item.quantite;
        productQty[item.description] = (productQty[item.description] || 0) + item.quantite;
      }
    }

    const topProducts = Object.entries(productQty)
      .map(([description, quantite]) => ({ description, quantite }))
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 10);

    const categories = Object.entries(categoryQty)
      .map(([label, quantite]) => ({ label, quantite }))
      .sort((a, b) => b.quantite - a.quantite);

    const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      totalOrders: orders.length,
      totalRevenue,
      averageBasket: orders.length > 0 ? totalRevenue / orders.length : 0,
      categories,
      topProducts,
      dailySeries,
    });
  } catch (err) {
    console.error('Erreur calcul des statistiques :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
