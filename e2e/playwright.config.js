// @ts-check
const path = require('node:path');
const { defineConfig } = require('@playwright/test');
const { crearVideoDeQr } = require('./camara-falsa');

/**
 * PRUEBAS DE SISTEMA EN EL NAVEGADOR (caja negra) con Playwright y Page Object Model.
 * Levantan el backend real (BD nueva) y la app web compilada, y la usan como una persona:
 * la cámara del navegador es un video con el QR impreso CAM-O-301-VB01.
 */
const VIDEO_QR = path.join(__dirname, '.tmp', 'qr-camara.y4m');
crearVideoDeQr('CAM-O-301-VB01', VIDEO_QR);

module.exports = defineConfig({
  testDir: './pruebas',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // comparten el backend: los técnicos ocupados en una prueba cuentan en la siguiente
  reporter: [['list'], ['html', { outputFolder: 'reporte', open: 'never' }], ['json', { outputFile: 'resultados/ultimo.json' }]],
  use: {
    baseURL: 'http://localhost:8082',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    permissions: ['camera'],
    screenshot: 'on',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${VIDEO_QR}`],
    },
  },
  webServer: [
    { command: 'node servidores/backend.js', url: 'http://localhost:3100/api/salud', reuseExistingServer: false, timeout: 30_000 },
    { command: 'node servidores/web.js', url: 'http://localhost:8082', reuseExistingServer: false, timeout: 30_000 },
  ],
});
