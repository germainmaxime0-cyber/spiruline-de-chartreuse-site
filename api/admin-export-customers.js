// Export CSV du fichier clients (compatible Excel), reconstruit à partir de l'historique des
// commandes (et non du seul compte client) : un client qui commande sans créer de compte
// apparaît donc aussi dans l'export, avec les mêmes informations agrégées.
// Les commandes annulées ne sont pas comptées (ni dans le nombre de commandes, ni dans le
// panier moyen) puisqu'elles ne correspondent pas à une vente effective.

const { requireAuth } = require('./_auth');
const { listOrders } = require('./_orders');

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (/[;"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatEuro(n) {
  return n.toFixed(2).replace('.', ',');
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const orders = (await listOrders(100000)).filter((o) => o.status !== 'annulee');

    const byEmail = new Map();
    for (const order of orders) {
      const email = (order.email || '').trim().toLowerCase();
      if (!email) continue;

      const existing = byEmail.get(email) || {
        email,
        prenom: '',
        nom: '',
        telephone: '',
        rue: '',
        codePostal: '',
        ville: '',
        nombreCommandes: 0,
        montantTotal: 0,
        premiereCommande: order.createdAt,
        derniereCommande: order.createdAt,
      };

      existing.prenom = order.prenom || existing.prenom;
      existing.nom = order.nom || existing.nom;
      existing.telephone = order.telephone || existing.telephone;
      if (order.adresse && order.adresse.rue) {
        existing.rue = order.adresse.rue;
        existing.codePostal = order.adresse.codePostal || '';
        existing.ville = order.adresse.ville || '';
      }
      existing.nombreCommandes += 1;
      existing.montantTotal += order.montantTotalEur || 0;
      if (order.createdAt < existing.premiereCommande) existing.premiereCommande = order.createdAt;
      if (order.createdAt > existing.derniereCommande) existing.derniereCommande = order.createdAt;

      byEmail.set(email, existing);
    }

    const rows = Array.from(byEmail.values()).sort((a, b) => b.montantTotal - a.montantTotal);

    const header = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Adresse', 'Code postal', 'Ville', 'Nombre de commandes', 'Panier moyen (€)', 'Total dépensé (€)', 'Première commande', 'Dernière commande'];
    const lines = [header.join(';')];
    for (const c of rows) {
      const panierMoyen = c.nombreCommandes > 0 ? c.montantTotal / c.nombreCommandes : 0;
      lines.push([
        csvEscape(c.prenom),
        csvEscape(c.nom),
        csvEscape(c.email),
        csvEscape(c.telephone),
        csvEscape(c.rue),
        csvEscape(c.codePostal),
        csvEscape(c.ville),
        c.nombreCommandes,
        formatEuro(panierMoyen),
        formatEuro(c.montantTotal),
        formatDate(c.premiereCommande),
        formatDate(c.derniereCommande),
      ].join(';'));
    }

    const BOM = '﻿';
    const csv = BOM + lines.join('\r\n') + '\r\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clients-spiruline-de-chartreuse.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Erreur export clients :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
