# Pruebas de punta a punta en el navegador (Playwright)

Abren la app AsisTec (versión web) en Chromium contra el backend real y hacen lo que haría una persona. La cámara es falsa: Chromium transmite un video hecho con el QR impreso de `docs/qr/`, así que la app lee el QR con la cámara de verdad.

| Archivo | Qué prueba |
|---|---|
| `pruebas/qr.spec.js` | La cámara lee el QR del video beam del Salón 301 y la docente reporta la falla · una estudiante sube la foto del QR de un PC y reserva para ese salón · un QR que no es del sistema se rechaza |
| `pruebas/cuentas.spec.js` | Cambiar de usuario: se entra con las 4 cuentas de prueba (docente, estudiante, técnico, coordinador), cada una llega a su pantalla y se cierra sesión · escribir la dirección del panel no lo abre · directo a la API, cada cuenta recibe 403 en lo que no le toca |
| `pruebas/tiempo-real.spec.js` | El técnico del Norte ve aparecer la solicitud sin recargar, la acepta y la docente ve "Técnico en camino" |
| `paginas/index.js` | Page Object Model: una clase por pantalla (InicioSesion, Inicio, Perfil, Escaner, Prestamo, Confirmacion, Seguimiento, VistaTecnico, VistaCoordinador) |

## Correrlas

Antes: `npm install` en `backend/` y en `app/`.

```bash
cd e2e
npm install
npm run preparar   # solo la primera vez o si cambia la app: compila la app web y descarga Chromium
npm test           # levanta backend (3100) y app (8082) solos y corre las 7 pruebas
npm run reporte    # abre el reporte con las capturas de cada paso
```

El resultado queda en `resultados/ultimo.json`; `npm run retos` en `backend/` lo muestra junto a las pruebas de Jest.
