// Stockage des commandes payées, en attente d'envoi vers Boxtal (page /admin.html).
// Utilise Vercel KV (Redis) : à activer depuis l'onglet Storage du projet Vercel,
// ce qui injecte automatiquement les variables d'environnement KV_* nécessaires.

const { kv } = require('@vercel/kv');

const INDEX_KEY = 'orders:index';
const orderKey = (id) => `order:${id}`;

async function saveOrder(order) {
  await kv.set(orderKey(order.id), order);
  await kv.lpush(INDEX_KEY, order.id);
}

async function listOrders(limit = 100) {
  const ids = await kv.lrange(INDEX_KEY, 0, limit - 1);
  const orders = await Promise.all(ids.map((id) => kv.get(orderKey(id))));
  return orders.filter(Boolean);
}

async function getOrder(id) {
  return kv.get(orderKey(id));
}

async function updateOrder(id, patch) {
  const order = await getOrder(id);
  if (!order) return null;
  const updated = { ...order, ...patch };
  await kv.set(orderKey(id), updated);
  return updated;
}

// Numéro de commande court : AAMMJJX, où X est le numéro d'ordre de la commande ce jour-là
// (1 pour la 1ère commande du jour, 2 pour la 2e, etc.). Le compteur repart de zéro chaque jour
// puisqu'il est stocké sous une clé KV différente par date (ex. order-counter:260708).
// kv.incr est atomique : même si deux commandes arrivent en même temps, chacune reçoit un numéro distinct.
async function generateOrderNumber() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const seq = await kv.incr(`order-counter:${datePart}`);
  return `${datePart}${seq}`;
}

module.exports = { saveOrder, listOrders, getOrder, updateOrder, generateOrderNumber };
