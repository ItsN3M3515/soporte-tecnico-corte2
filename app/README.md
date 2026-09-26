# App AsisTec (Expo SDK 57)

Cliente móvil y web del sistema, construido sobre nuestro prototipo de Figma **AsisTec – Prototipo Soporte Técnico**. No contiene reglas de negocio: llama a la API del backend y escucha sus eventos en tiempo real. Es un adaptador de entrada más de la arquitectura hexagonal.

Del prototipo se tomaron los colores, degradados, tipografía (Inter), tamaños y los iconos exportados directamente del archivo de Figma (`src/ui/iconos.tsx`).

## Pantallas

| Ruta (`src/app/`) | Pantalla del prototipo | Rol |
|---|---|---|
| `index.tsx` | Inicio de sesión (no estaba en el prototipo; usa el mismo encabezado) | todos |
| `(docente)/inicio.tsx` | 1 - Inicio | DOCENTE / ESTUDIANTE |
| `nueva.tsx` | 2 - Elegir tipo de solicitud | DOCENTE / ESTUDIANTE |
| `escanear.tsx` | 3a - Escanear QR del equipo (cámara, foto del QR o búsqueda manual) | DOCENTE / ESTUDIANTE |
| `falla.tsx` | ¿Qué le pasa al equipo? (después de escanear; opciones según el equipo) | DOCENTE / ESTUDIANTE |
| `cuando.tsx` | 3b - ¿Cuándo lo necesitas? | DOCENTE / ESTUDIANTE |
| `prestamo.tsx` | 3c - Préstamo: configuración / agendado + calendario | DOCENTE / ESTUDIANTE |
| `seguimiento/[id].tsx` y `(docente)/estado.tsx` | 4 - Seguimiento en tiempo real | DOCENTE / ESTUDIANTE |
| `tecnico.tsx` | 5 - Vista del técnico | TECNICO |
| `coordinador.tsx` | 6 - Panel del coordinador (+ demanda por sede) | ADMIN |
| `confirmacion.tsx` | 7 - Confirmación de envío | DOCENTE / ESTUDIANTE |
| `mis-solicitudes.tsx` | 8 - Mis solicitudes | DOCENTE / ESTUDIANTE |
| `(docente)/servicios.tsx` | 9 - Servicios | DOCENTE / ESTUDIANTE |
| `(docente)/perfil.tsx` | 10 - Perfil | DOCENTE / ESTUDIANTE |
| `notificaciones.tsx` | 11 - Notificaciones | DOCENTE / ESTUDIANTE |
| `mantenimiento.tsx` | 12 - Agendar mantenimiento | DOCENTE / ESTUDIANTE |
| `evento.tsx` | 13 - Soporte para eventos | DOCENTE / ESTUDIANTE |
| `electrica.tsx` | 14 - Reportar falla eléctrica | DOCENTE / ESTUDIANTE |

| Carpeta | Contenido |
|---|---|
| `src/ui/` | `EscanerWeb.web.tsx` (lector de QR en el navegador: cámara + jsQR, o foto subida), `tema.ts` (tokens de Figma), `componentes.tsx` (Header, BackButton, SeamFade, Field, Toggle, Stepper, Chips, SubmitBtn...), `iconos.tsx`, `Seguimiento.tsx`, `Selectores.tsx` (edificio/salón y calendario) |
| `src/lib/` | `sesion.tsx` (token y cliente HTTP), `tiempoReal.tsx` (una conexión Socket.IO compartida), `useDatos.ts` (pide y refresca con cada evento), `formato.ts` (fechas y textos en español) |

## Ejecutar

```bash
npm install
npx expo start          # "w" para web, o escanear el QR de la terminal con Expo Go
```

El backend debe estar corriendo (`cd ../backend && npm start`). Si la app no lo encuentra, toque "Servidor: ..." en la pantalla de inicio de sesión, o cree `app/.env` con `EXPO_PUBLIC_API_URL=http://<IP>:3000`.

Docentes y estudiantes ven las mismas pantallas (los dos reservan y reportan).

Leer un QR:

- **Celular (Expo Go):** la cámara (`expo-camera`) lee los QR de `docs/qr/imprimir.html`, abierto en el computador o impreso.
- **Navegador:** la app pide permiso a la cámara del computador y lee el QR con jsQR. Si no hay cámara, el botón "Subir foto del QR" lee un PNG (por ejemplo, uno de `docs/qr/`).
- **QR dañado:** "Buscar manualmente por edificio y salón".

Las pruebas de punta a punta de estas pantallas están en `../e2e` (Playwright).

## Verificar

```bash
npm run typecheck       # TypeScript
npm run export:web      # compila la versión web en dist/
```
