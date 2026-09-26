/**
 * Prepara las pruebas de navegador (se corre una vez, o cada vez que cambie la app):
 *  1. Compila la versión web de la app apuntando al backend de pruebas (puerto 3100).
 *  2. Descarga el Chromium de Playwright.
 * Uso: npm run preparar
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const correr = (comando, cwd, env = {}) => {
  const r = spawnSync(comando, { cwd, shell: true, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

correr('npx expo export --platform web --clear --output-dir ../e2e/.web', path.join(__dirname, '..', 'app'), {
  EXPO_PUBLIC_API_URL: 'http://localhost:3100',
  CI: '1',
});
correr('npx playwright install chromium', __dirname);
