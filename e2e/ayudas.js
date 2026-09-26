const path = require('node:path');
const fs = require('node:fs/promises');
const { test } = require('@playwright/test');

/** Adjunta la captura al reporte HTML; con CAPTURAS=<carpeta> también la guarda ahí (así se generan las de docs/capturas). */
async function foto(page, nombre) {
  const imagen = await page.screenshot();
  await test.info().attach(nombre, { body: imagen, contentType: 'image/png' });
  if (process.env.CAPTURAS) {
    const archivo = `e2e-${nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase()}.png`;
    await fs.mkdir(process.env.CAPTURAS, { recursive: true });
    await fs.writeFile(path.join(process.env.CAPTURAS, archivo), imagen);
  }
}

module.exports = { foto };
