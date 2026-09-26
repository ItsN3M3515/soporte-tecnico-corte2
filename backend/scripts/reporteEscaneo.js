/**
 * Genera ../docs/evidencias/escaneo-codigo.md con el resultado del escaneo de código:
 *  1. Análisis estático con ESLint (+ reglas de seguridad y de arquitectura)
 *  2. Análisis de dependencias con `npm audit` (backend y app)
 * Compara con el primer escaneo guardado en escaneo-eslint-antes.json.
 * Uso: npm run escaneo
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..');
const EVIDENCIAS = path.join(RAIZ, 'docs', 'evidencias');
const correr = (cmd, cwd) => {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 50e6 });
  } catch (e) {
    return e.stdout; // eslint y npm audit salen con código 1 cuando encuentran algo
  }
};

const contar = (resultado) => {
  const porRegla = new Map();
  resultado.forEach((f) =>
    f.messages.forEach((m) => {
      const clave = `${m.ruleId}|${m.severity === 2 ? 'error' : 'advertencia'}`;
      porRegla.set(clave, (porRegla.get(clave) || 0) + 1);
    }),
  );
  return porRegla;
};
const suma = (m) => [...m.values()].reduce((a, b) => a + b, 0);

const antes = JSON.parse(fs.readFileSync(path.join(EVIDENCIAS, 'escaneo-eslint-antes.json'), 'utf8'));
const despues = JSON.parse(correr('npx eslint . -f json', path.join(RAIZ, 'backend')));
const cAntes = contar(antes);
const cDespues = contar(despues);
const reglas = [...new Set([...cAntes.keys(), ...cDespues.keys()])].sort();
const archivos = despues.length;

const auditoria = (carpeta) => {
  const d = JSON.parse(correr('npm audit --json', path.join(RAIZ, carpeta)));
  const v = d.metadata.vulnerabilities;
  const paquetes = Object.entries(d.vulnerabilities || {}).map(([nombre, x]) => ({
    nombre,
    severidad: x.severity,
    directo: x.isDirect,
    causa: typeof x.via[0] === 'string' ? `vía ${x.via[0]}` : x.via[0].title,
  }));
  return { v, total: d.metadata.dependencies.total, paquetes };
};
const aBack = auditoria('backend');
const aApp = auditoria('app');

const fecha = new Date().toISOString().slice(0, 10);
const md = `# Escaneo de código

Generado con \`npm run escaneo\` (en \`backend/\`) el ${fecha}.

## 1. Análisis estático (ESLint)

Configuración: [\`backend/eslint.config.js\`](../../backend/eslint.config.js). Revisa **${archivos} archivos** del backend (código y pruebas) con:

| Conjunto de reglas | Qué busca |
|---|---|
| \`@eslint/js\` recommended | Errores comunes: variables sin usar, código inalcanzable, comparaciones sospechosas |
| \`eslint-plugin-security\` | Patrones inseguros: expresiones regulares vulnerables a ReDoS, acceso a objetos con claves externas (inyección por prototipo), rutas de archivo construidas con datos externos, \`eval\` |
| \`eslint-plugin-jest\` | Pruebas mal escritas: sin \`expect\`, con \`expect\` condicional, duplicadas |
| Reglas del equipo | Complejidad ciclomática ≤ 10 por función, anidamiento ≤ 3, y la **regla de dependencia hexagonal** (\`src/domain\` y \`src/application\` no pueden importar adaptadores, configuración ni librerías de infraestructura) |

### Primer escaneo vs. escaneo actual

| Regla | Severidad | Primer escaneo | Actual |
|---|---|---|---|
${reglas
  .map((k) => {
    const [regla, sev] = k.split('|');
    return `| \`${regla}\` | ${sev} | ${cAntes.get(k) || 0} | ${cDespues.get(k) || 0} |`;
  })
  .join('\n')}
| **Total** | | **${suma(cAntes)}** | **${suma(cDespues)}** |

### Qué se corrigió y por qué

| Hallazgo | Dónde | ¿Era un problema real? | Corrección |
|---|---|---|---|
| \`security/detect-object-injection\` al buscar un estado por nombre | \`src/domain/tecnicos/estados.js\` | **Sí.** Un estado \`"toString"\` o \`"__proto__"\` leído de la BD devolvía una función heredada de \`Object.prototype\` en vez de fallar. Se escribió primero la prueba que lo demostraba (fallaba) y luego se corrigió | Objeto literal → \`Map\`. Prueba: \`Tecnico.test.js\` › "rechaza el nombre heredado del prototipo" |
| Mismo hallazgo en el mapa de cercanía | \`src/domain/busqueda/busqueda.js\` | **Sí.** Un edificio llamado \`"constructor"\` rompía la búsqueda de técnico (la función \`Object\` no es iterable) | Objeto → \`Map\`. Prueba: \`Asignacion.test.js\` › "un edificio llamado … no rompe la búsqueda" |
| Mismo hallazgo en la fábrica de solicitudes | \`src/domain/modelo/FabricaSolicitudes.js\` | No explotable (el tipo ya se validaba antes), pero se unificó el criterio | Objeto → \`Map\`. Prueba agregada con \`"constructor"\` y \`"__proto__"\` |
| \`security/detect-unsafe-regex\` | \`src/domain/modelo/CodigoQR.js\` | Riesgo bajo (el texto ya estaba limitado a 40 caracteres), pero la expresión tenía cuantificadores anidados, el patrón típico de ReDoS | Regex simple de caracteres permitidos + reglas de estructura explícitas. Pruebas nuevas: \`CAM-K-\` y \`CAM--K101\` |
| \`no-unused-vars\` | \`src/adapters/out/seguridad/CredencialesJWT.js\` | No: se descartaban \`iat\`/\`exp\` del token a propósito | Se renombraron con \`_\` para dejar explícita la intención |
| \`jest/no-conditional-expect\` | \`CodigoQR.test.js\`, \`FabricaSolicitudes.test.js\` | Sí, de calidad: un \`if\` dentro de la prueba puede ocultar que una rama nunca se ejecuta | Se separaron en pruebas de "en el borde" y "fuera del borde" |
| \`jest/expect-expect\` | \`api.int.test.js\` | No (usaban \`.expect(401)\` de Supertest), pero no era obvio al leerlas | Se reescribieron con \`expect(res.status)\` |
| \`security/detect-object-injection\` en el montículo | \`src/domain/prioridad/ColaPrioridad.js\` | **Falso positivo:** los índices son enteros calculados por la propia cola | Se desactivó la regla solo en ese archivo, con la justificación escrita en el código |
| \`security/detect-non-literal-fs-filename\` | \`src/server.js\` | Falso positivo: la ruta de la BD la define quien despliega (\`DB_PATH\`), no un usuario de la API | Desactivada en esa línea, con justificación |

## 2. Análisis de dependencias (\`npm audit\`)

| Proyecto | Dependencias revisadas | Crítica | Alta | Moderada | Baja |
|---|---|---|---|---|---|
| backend | ${aBack.total} | ${aBack.v.critical} | ${aBack.v.high} | ${aBack.v.moderate} | ${aBack.v.low} |
| app | ${aApp.total} | ${aApp.v.critical} | ${aApp.v.high} | ${aApp.v.moderate} | ${aApp.v.low} |

${
  aApp.paquetes.length
    ? `**Vulnerabilidades de la app (todas llegan con Expo SDK 57; las marcadas como directas son paquetes de Expo que heredan el problema de sus propias dependencias):**

| Paquete | Severidad | ¿Dependencia directa? | Causa |
|---|---|---|---|
${aApp.paquetes.map((p) => `| \`${p.nombre}\` | ${p.severidad} | ${p.directo ? 'sí' : 'no'} | ${p.causa} |`).join('\n')}

**Decisión: riesgo aceptado y documentado.** La "solución" que propone \`npm audit fix --force\` es bajar a versiones antiguas e incompatibles de Expo (por ejemplo \`expo@46\`), lo que rompe la app. La mayoría son herramientas de compilación (\`@expo/cli\`, \`xcode\`, \`@expo/config-plugins\`) que no llegan al teléfono del usuario. La única en tiempo de ejecución es \`decode-uri-component\` (vía \`expo-router\`): una URL mal formada podría congelar **la app de quien la abre**, no el servidor. Se revisará al actualizar Expo; en el Corte 3 este escaneo corre en el pipeline de CI.`
    : ''
}
`;
fs.writeFileSync(path.join(EVIDENCIAS, 'escaneo-codigo.md'), md);
console.log('docs/evidencias/escaneo-codigo.md generado');
