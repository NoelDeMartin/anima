export async function animaReset() {
  await fetch('http://localhost:1191/__e2e__/reset', { method: 'POST' });
}
