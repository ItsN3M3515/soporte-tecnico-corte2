/** Sirve la app web compilada (carpeta .web, ver preparar.js) en el puerto 8082. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '.web');
const TIPOS = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.json': 'application/json' };

if (!fs.existsSync(path.join(RAIZ, 'index.html'))) {
  console.error('Falta compilar la app web: corra "npm run preparar" en la carpeta e2e.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const pedido = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
    let archivo = path.join(RAIZ, pedido);
    // Rutas de la app (expo-router) → index.html; nunca se sale de la carpeta .web.
    if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) archivo = path.join(RAIZ, 'index.html');
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
  })
  .listen(8082, () => console.log('App web de pruebas en http://localhost:8082'));
