#!/usr/bin/env node

const API = 'https://panel.sundsvall.dev/api';
const COMPOSE_ID = process.env.DOKPLOY_COMPOSE_ID || 'LCJaryCTwlaSeKNNSt0mb';
const KEY = process.env.DOKPLOY_API_KEY;

if (!KEY) {
  console.error('DOKPLOY_API_KEY is not set');
  process.exit(1);
}

async function call(path, body) {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text}`);
  return text;
}

console.log(`Stopping compose ${COMPOSE_ID}…`);
console.log(await call('compose.stop', { composeId: COMPOSE_ID }));

console.log('Deploying fresh…');
console.log(await call('compose.deploy', { composeId: COMPOSE_ID }));

console.log('\nDone — follow build progress in the Dokploy panel.');
