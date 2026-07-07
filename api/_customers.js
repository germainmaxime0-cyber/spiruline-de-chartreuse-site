// Stockage des comptes clients (facultatifs) dans Vercel KV.
// Les mots de passe ne sont jamais stockés en clair : hachés avec scrypt (Node natif, pas de dépendance).

const crypto = require('crypto');
const { kv } = require('@vercel/kv');

const customerKey = (email) => `customer:${email.trim().toLowerCase()}`;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const hashBuf = Buffer.from(hash);
  const checkBuf = Buffer.from(check);
  return hashBuf.length === checkBuf.length && crypto.timingSafeEqual(hashBuf, checkBuf);
}

async function getCustomer(email) {
  return kv.get(customerKey(email));
}

async function createCustomer(email, password, profile) {
  const existing = await getCustomer(email);
  if (existing) return null;
  const customer = {
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    hasOrdered: false,
    prenom: profile.prenom,
    nom: profile.nom,
    telephone: profile.telephone,
    rue: profile.rue,
    codePostal: profile.codePostal,
    ville: profile.ville,
    pays: profile.pays || 'FR',
  };
  await kv.set(customerKey(email), customer);
  return customer;
}

async function markCustomerOrdered(email) {
  const customer = await getCustomer(email);
  if (!customer) return null;
  const updated = { ...customer, hasOrdered: true };
  await kv.set(customerKey(email), updated);
  return updated;
}

// Version du compte renvoyée au navigateur : jamais le hash du mot de passe.
function toPublicProfile(customer) {
  const { passwordHash, ...publicProfile } = customer;
  return publicProfile;
}

module.exports = { getCustomer, createCustomer, verifyPassword, markCustomerOrdered, toPublicProfile };
