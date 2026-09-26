# Escaneo de código

Generado con `npm run escaneo` (en `backend/`) el 2026-09-26.

## 1. Análisis estático (ESLint)

Configuración: [`backend/eslint.config.js`](../../backend/eslint.config.js). Revisa **60 archivos** del backend (código y pruebas) con:

| Conjunto de reglas | Qué busca |
|---|---|
| `@eslint/js` recommended | Errores comunes: variables sin usar, código inalcanzable, comparaciones sospechosas |
| `eslint-plugin-security` | Patrones inseguros: expresiones regulares vulnerables a ReDoS, acceso a objetos con claves externas (inyección por prototipo), rutas de archivo construidas con datos externos, `eval` |
| `eslint-plugin-jest` | Pruebas mal escritas: sin `expect`, con `expect` condicional, duplicadas |
| Reglas del equipo | Complejidad ciclomática ≤ 10 por función, anidamiento ≤ 3, y la **regla de dependencia hexagonal** (`src/domain` y `src/application` no pueden importar adaptadores, configuración ni librerías de infraestructura) |

### Primer escaneo vs. escaneo actual

| Regla | Severidad | Primer escaneo | Actual |
|---|---|---|---|
| `jest/expect-expect` | advertencia | 2 | 0 |
| `jest/no-conditional-expect` | error | 4 | 0 |
| `no-unused-vars` | error | 2 | 0 |
| `security/detect-non-literal-fs-filename` | advertencia | 1 | 0 |
| `security/detect-object-injection` | advertencia | 19 | 0 |
| `security/detect-unsafe-regex` | advertencia | 1 | 0 |
| **Total** | | **29** | **0** |

### Qué se corrigió y por qué

| Hallazgo | Dónde | ¿Era un problema real? | Corrección |
|---|---|---|---|
| `security/detect-object-injection` al buscar un estado por nombre | `src/domain/tecnicos/estados.js` | **Sí.** Un estado `"toString"` o `"__proto__"` leído de la BD devolvía una función heredada de `Object.prototype` en vez de fallar. Se escribió primero la prueba que lo demostraba (fallaba) y luego se corrigió | Objeto literal → `Map`. Prueba: `Tecnico.test.js` › "rechaza el nombre heredado del prototipo" |
| Mismo hallazgo en el mapa de cercanía | `src/domain/busqueda/busqueda.js` | **Sí.** Un edificio llamado `"constructor"` rompía la búsqueda de técnico (la función `Object` no es iterable) | Objeto → `Map`. Prueba: `Asignacion.test.js` › "un edificio llamado … no rompe la búsqueda" |
| Mismo hallazgo en la fábrica de solicitudes | `src/domain/modelo/FabricaSolicitudes.js` | No explotable (el tipo ya se validaba antes), pero se unificó el criterio | Objeto → `Map`. Prueba agregada con `"constructor"` y `"__proto__"` |
| `security/detect-unsafe-regex` | `src/domain/modelo/CodigoQR.js` | Riesgo bajo (el texto ya estaba limitado a 40 caracteres), pero la expresión tenía cuantificadores anidados, el patrón típico de ReDoS | Regex simple de caracteres permitidos + reglas de estructura explícitas. Pruebas nuevas: `CAM-K-` y `CAM--K101` |
| `no-unused-vars` | `src/adapters/out/seguridad/CredencialesJWT.js` | No: se descartaban `iat`/`exp` del token a propósito | Se renombraron con `_` para dejar explícita la intención |
| `jest/no-conditional-expect` | `CodigoQR.test.js`, `FabricaSolicitudes.test.js` | Sí, de calidad: un `if` dentro de la prueba puede ocultar que una rama nunca se ejecuta | Se separaron en pruebas de "en el borde" y "fuera del borde" |
| `jest/expect-expect` | `api.int.test.js` | No (usaban `.expect(401)` de Supertest), pero no era obvio al leerlas | Se reescribieron con `expect(res.status)` |
| `security/detect-object-injection` en el montículo | `src/domain/prioridad/ColaPrioridad.js` | **Falso positivo:** los índices son enteros calculados por la propia cola | Se desactivó la regla solo en ese archivo, con la justificación escrita en el código |
| `security/detect-non-literal-fs-filename` | `src/server.js` | Falso positivo: la ruta de la BD la define quien despliega (`DB_PATH`), no un usuario de la API | Desactivada en esa línea, con justificación |

## 2. Análisis de dependencias (`npm audit`)

| Proyecto | Dependencias revisadas | Crítica | Alta | Moderada | Baja |
|---|---|---|---|---|---|
| backend | 556 | 0 | 0 | 0 | 0 |
| app | 646 | 0 | 0 | 14 | 0 |

**Vulnerabilidades de la app (todas llegan con Expo SDK 57; las marcadas como directas son paquetes de Expo que heredan el problema de sus propias dependencias):**

| Paquete | Severidad | ¿Dependencia directa? | Causa |
|---|---|---|---|
| `@expo/cli` | moderate | no | vía @expo/config |
| `@expo/config` | moderate | no | vía @expo/config-plugins |
| `@expo/config-plugins` | moderate | no | vía xcode |
| `@expo/inline-modules` | moderate | no | vía @expo/config-plugins |
| `@expo/local-build-cache-provider` | moderate | no | vía @expo/config |
| `@expo/metro-config` | moderate | no | vía @expo/config |
| `@expo/prebuild-config` | moderate | no | vía @expo/config |
| `decode-uri-component` | moderate | no | decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input |
| `expo` | moderate | sí | vía @expo/cli |
| `expo-router` | moderate | sí | vía query-string |
| `expo-splash-screen` | moderate | sí | vía @expo/config-plugins |
| `query-string` | moderate | no | vía decode-uri-component |
| `uuid` | moderate | no | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided |
| `xcode` | moderate | no | vía uuid |

**Decisión: riesgo aceptado y documentado.** La "solución" que propone `npm audit fix --force` es bajar a versiones antiguas e incompatibles de Expo (por ejemplo `expo@46`), lo que rompe la app. La mayoría son herramientas de compilación (`@expo/cli`, `xcode`, `@expo/config-plugins`) que no llegan al teléfono del usuario. La única en tiempo de ejecución es `decode-uri-component` (vía `expo-router`): una URL mal formada podría congelar **la app de quien la abre**, no el servidor. Se revisará al actualizar Expo; en el Corte 3 este escaneo corre en el pipeline de CI.
