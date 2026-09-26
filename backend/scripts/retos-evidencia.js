/**
 * Qué prueba se muestra como evidencia de cada reto (lo usa scripts/generarEvidencia.js).
 * `test` es un trozo ÚNICO del título de la prueba dentro de su archivo.
 * `item` es el número del reto en la lista del profesor (tiempo real y cola comparten el 4).
 * `e2e` son las pruebas de navegador (Playwright, carpeta e2e/) que muestran el mismo reto en la app.
 */
module.exports = [
  {
    reto: 'Reservar mediante QR',
    item: 1,
    exige: 'Que el docente o el estudiante pida soporte o reserve un equipo escaneando el QR, sin llamar.',
    atributo: 'Usabilidad · Disponibilidad',
    decision: 'Pantalla "3a - Escanear QR" (expo-camera) sobre el caso de uso `CrearSolicitud`; **Factory Method** `FabricaSolicitudes` con reglas por tipo.',
    pruebas: [
      { tipo: 'Integración con imagen real', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'escanear el QR impreso del video beam' },
      { tipo: 'Integración: después de escanear, qué le pasa depende del equipo', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'las opciones dependen del equipo' },
      { tipo: 'Integración: problema que no aplica o "Otro" sin describir → 400', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'se rechaza %s (400)', resultado: 'se rechaza' },
      { tipo: 'Unitaria: qué le pasa al equipo (clases de equivalencia)', archivo: 'tests/unit/dominio/FabricaSolicitudes.test.js', test: "('rechaza %s'", resultado: 'rechaza un problema' },
      { tipo: 'Integración con imagen real', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'reservar un portátil escaneando' },
      { tipo: 'Integración: una estudiante reserva por QR', archivo: 'tests/integration/prototipo.int.test.js', test: 'una estudiante reserva un PC por QR' },
      { tipo: 'Integración (QR dañado → búsqueda manual)', archivo: 'tests/integration/prototipo.int.test.js', test: 'ubicaciones → equipos del salón' },
      { tipo: 'Unitaria (Factory Method)', archivo: 'tests/unit/dominio/FabricaSolicitudes.test.js', test: 'rechaza un préstamo con elemento' },
    ],
    e2e: [
      { archivo: 'pruebas/qr.spec.js', test: 'la cámara del navegador lee el QR del video beam' },
      { archivo: 'pruebas/qr.spec.js', test: 'una estudiante sube la foto del QR del PC' },
    ],
  },
  {
    reto: 'QR asociado al PC',
    item: 2,
    exige: 'Cada QR identifica UN equipo; la ubicación la decide el servidor, no el QR.',
    atributo: 'Integridad · Seguridad',
    decision: 'Objeto de valor `CodigoQR` (formato `SOPORTE:v1:<código>`) + tabla `equipos` con llave foránea; QR impreso con corrección de errores H.',
    pruebas: [
      { tipo: 'Integración con imágenes reales', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'los 61 QR impresos' },
      { tipo: 'Integración: QR manipulado', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'un QR copiado de otro salón' },
      { tipo: 'Integración: stickers rayados', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'con el 10 % del centro rayado' },
      { tipo: 'Integración: stickers rayados (medición)', archivo: 'tests/integration/escaneoQR.int.test.js', test: 'medido sobre los 61 QR' },
      { tipo: 'Unitaria: valores límite', archivo: 'tests/unit/dominio/CodigoQR.test.js', test: 'caracteres (fuera del borde)' },
    ],
    e2e: [{ archivo: 'pruebas/qr.spec.js', test: 'un QR que no es del sistema se lee pero se rechaza' }],
  },
  {
    reto: 'Enfoque administrativo',
    item: 3,
    exige: 'Roles con permisos distintos (docente, estudiante, técnico, coordinador) y un panel de coordinación que actúe, no solo mire.',
    atributo: 'Seguridad · Mantenibilidad',
    decision: 'Roles en el JWT verificados en el adaptador HTTP; pantalla "6 - Panel del coordinador" con `Consultas.resumenHoy()`, `Consultas.escaladas()` y el caso de uso `AsignarManualmente`.',
    pruebas: [
      { tipo: 'Integración: roles', archivo: 'tests/integration/api.int.test.js', test: 'un técnico no puede ver el panel administrativo' },
      { tipo: 'Integración: una estudiante no entra al panel ni a acciones de técnico', archivo: 'tests/integration/prototipo.int.test.js', test: 'una estudiante no entra a', resultado: 'una estudiante no entra' },
      { tipo: 'Integración: cada cuenta ve solo el detalle de SUS solicitudes', archivo: 'tests/integration/prototipo.int.test.js', test: 'cada cuenta ve solo el detalle de SUS solicitudes' },
      { tipo: 'Unitaria: quién NO puede ver una solicitud (clases de equivalencia)', archivo: 'tests/unit/aplicacion/CasosDeUso.test.js', test: 'NO la ve %s', resultado: 'NO la ve' },
      { tipo: 'Integración: panel del coordinador', archivo: 'tests/integration/prototipo.int.test.js', test: 'pantalla 6: tarjetas del día' },
      { tipo: 'Unitaria: "hoy" en hora de Bogotá', archivo: 'tests/unit/aplicacion/CasosDeUsoPrototipo.test.js', test: '"hoy" en el panel es el día en Bogotá' },
    ],
    e2e: [
      { archivo: 'pruebas/cuentas.spec.js', test: 'cambiando de usuario, cada cuenta llega a su pantalla' },
      { archivo: 'pruebas/cuentas.spec.js', test: 'escribir la dirección del panel del coordinador' },
      { archivo: 'pruebas/cuentas.spec.js', test: 'directo a la API, sin pasar por la app' },
    ],
  },
  {
    reto: 'Reporte en tiempo real',
    item: 4,
    exige: 'Que técnico, docente y coordinador vean los cambios sin recargar.',
    atributo: 'Rendimiento · Usabilidad',
    decision: 'Puerto `PublicadorEventos` + adaptador Socket.IO con salas por rol, sede y usuario (ADR-003); **Decorator** `NotificacionesDocente` guarda los avisos del docente.',
    pruebas: [
      { tipo: 'Integración productor→consumidor (sockets reales)', archivo: 'tests/integration/tiempoReal.int.test.js', test: 'el técnico recibe la solicitud asignada' },
      { tipo: 'Integración: el docente ve el cambio y recibe el aviso', archivo: 'tests/integration/prototipo.int.test.js', test: 'cuando el técnico acepta, al docente' },
      { tipo: 'Unitaria: avisos del docente (Decorator)', archivo: 'tests/unit/aplicacion/CasosDeUsoPrototipo.test.js', test: 'cada cambio de SU solicitud' },
      { tipo: 'Integración: seguridad del canal', archivo: 'tests/integration/tiempoReal.int.test.js', test: 'una conexión sin token' },
    ],
    e2e: [{ archivo: 'pruebas/tiempo-real.spec.js', test: 'el técnico del Norte ve aparecer la solicitud sin recargar' }],
  },
  {
    reto: 'Cola de prioridades',
    item: 4,
    exige: 'Si no hay técnicos libres, atender primero lo urgente sin que lo demás espere para siempre.',
    atributo: 'Rendimiento · Equidad',
    decision: 'Montículo `ColaPrioridad` + **Strategy** `PoliticaImpactoYEspera` (impacto + envejecimiento). Las solicitudes agendadas entran a la cola 30 min antes (`ActivarProgramadas`).',
    pruebas: [
      { tipo: 'Unitaria: aging, valores límite', archivo: 'tests/unit/dominio/Prioridad.test.js', test: 'puntos de espera' },
      { tipo: 'Unitaria: sin inanición', archivo: 'tests/unit/dominio/Prioridad.test.js', test: 'sin inanición' },
      { tipo: 'Unitaria: orden de los servicios nuevos', archivo: 'tests/unit/dominio/ServiciosPrototipo.test.js', test: 'falla de equipo > falla eléctrica' },
      { tipo: 'Unitaria: agenda → cola (valor límite 29/30 min)', archivo: 'tests/unit/aplicacion/CasosDeUsoPrototipo.test.js', test: 'entra a la cola 30 min antes' },
      { tipo: 'Sistema (caja negra)', archivo: 'tests/integration/flujoSistema.e2e.test.js', test: 'de escanear el QR a resolver' },
    ],
  },
  {
    reto: 'Multisede (distribución y demanda)',
    item: 5,
    exige: 'Cada sede atiende con sus técnicos; el coordinador ve demanda y déficit por sede y puede redistribuir.',
    atributo: 'Escalabilidad · Disponibilidad',
    decision: 'Búsqueda restringida por sede con **Decorator** doble; métricas por sede; "Asignar manualmente" permite mandar un técnico de otra sede.',
    pruebas: [
      { tipo: 'Unitaria', archivo: 'tests/unit/dominio/Asignacion.test.js', test: 'NUNCA asigna un técnico de otra sede' },
      { tipo: 'Integración', archivo: 'tests/integration/api.int.test.js', test: 'si el NORTE está saturado' },
      { tipo: 'Unitaria: redistribución manual', archivo: 'tests/unit/aplicacion/CasosDeUsoPrototipo.test.js', test: 'puede mandar un técnico de OTRA sede' },
      { tipo: 'Integración tiempo real', archivo: 'tests/integration/tiempoReal.int.test.js', test: 'otra sede NO recibe' },
    ],
  },
  {
    reto: 'Pantalla del trabajador',
    item: null,
    exige: 'El técnico ve su solicitud y solo puede hacer el siguiente paso válido; si no responde o cancela, otro la toma.',
    atributo: 'Usabilidad · Consistencia',
    decision: 'Pantalla "5 - Vista del técnico" sobre `AtenderSolicitud` y el **State** del Corte 1; escalación automática con **Chain of Responsibility**.',
    pruebas: [
      { tipo: 'Unitaria: State', archivo: 'tests/unit/dominio/Tecnico.test.js', test: 'recorre el ciclo completo' },
      { tipo: 'Unitaria: botón "Cancelar"', archivo: 'tests/unit/aplicacion/CasosDeUsoPrototipo.test.js', test: 'la solicitud pasa a otro técnico de la sede' },
      { tipo: 'Unitaria: escalación por tiempo (límite 4/5 min)', archivo: 'tests/unit/aplicacion/CasosDeUso.test.js', test: 'a los 5 minutos sin aceptar' },
      { tipo: 'Integración', archivo: 'tests/integration/api.int.test.js', test: 'si Laura no acepta en 5 minutos' },
    ],
  },
  {
    reto: 'Servicios del prototipo AsisTec (Figma)',
    item: null,
    exige: 'Que cada pantalla del prototipo haga algo real: préstamo ahora/agendado, mantenimiento, eventos, falla eléctrica, mis solicitudes y notificaciones.',
    atributo: 'Modificabilidad · Usabilidad',
    decision: 'Cada servicio es un creador más en `FabricaSolicitudes` (abierto/cerrado); los casos de uso y la API no cambiaron de forma.',
    pruebas: [
      { tipo: 'Unitaria: préstamo', archivo: 'tests/unit/dominio/ServiciosPrototipo.test.js', test: '"Lo necesito ahora" por salón' },
      { tipo: 'Unitaria: agenda, valores límite', archivo: 'tests/unit/dominio/ServiciosPrototipo.test.js', test: 'una fecha %s se rechaza', resultado: 'una fecha' },
      { tipo: 'Integración: pantallas 12, 13 y 14', archivo: 'tests/integration/prototipo.int.test.js', test: 'pantallas 12, 13 y 14' },
      { tipo: 'Integración: pantallas 8 y 11', archivo: 'tests/integration/prototipo.int.test.js', test: 'pantalla 8 "Mis solicitudes"' },
    ],
  },
];
