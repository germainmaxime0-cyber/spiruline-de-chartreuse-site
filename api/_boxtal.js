// Client Boxtal API v3 partagé (authentification + appel HTTP).
//
// Variables d'environnement Vercel à configurer :
//   BOXTAL_ACCESS_KEY   — clé d'accès de votre application API v3 Boxtal (espace développeur Boxtal)
//   BOXTAL_SECRET_KEY   — clé secrète associée
//   BOXTAL_API_URL      — https://api.boxtal.build (test) ou https://api.boxtal.com (production)
//
// Authentification : Basic Auth "accessKey:secretKey" en base64, comme documenté dans le schéma
// officiel de l'API v3 (fichier api-v3.json fourni par le client).

const BOXTAL_API_URL = process.env.BOXTAL_API_URL || 'https://api.boxtal.build';

function authHeader() {
  const token = Buffer.from(`${process.env.BOXTAL_ACCESS_KEY}:${process.env.BOXTAL_SECRET_KEY}`).toString('base64');
  return `Basic ${token}`;
}

async function boxtalRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BOXTAL_API_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`Boxtal ${method} ${path} a échoué (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = { boxtalRequest };
