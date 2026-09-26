/**
 * Misma configuración de package.json + un reporte HTML navegable de las pruebas
 * para mostrar en la presentación: ../docs/evidencias/reporte-pruebas.html
 * Uso: npm run test:reporte
 */
const base = require('./package.json').jest;

module.exports = {
  ...base,
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '../docs/evidencias',
        filename: 'reporte-pruebas.html',
        pageTitle: 'Soporte en Aulas · Resultados de pruebas',
        inlineSource: true,
        expand: false,
        hideIcon: true,
        dateFmt: 'yyyy-mm-dd HH:MM',
      },
    ],
  ],
};
