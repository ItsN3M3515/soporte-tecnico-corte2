# Evidencia de ejecución de pruebas

Generado con `npm run evidencia` (Jest `--json`) · **278 de 278 pruebas pasan** · 15 archivos · 2026-09-26.

Versión navegable: [reporte-pruebas.html](reporte-pruebas.html) (se genera con `npm run test:reporte`). Evidencia organizada por reto: [evidencia-por-reto.md](evidencia-por-reto.md).


## `tests/integration/api.int.test.js` — 23 pruebas, 10.2 s

- ✅ API REST seguridad y roles (reto "Enfoque administrativo") sin token responde 401
- ✅ API REST seguridad y roles (reto "Enfoque administrativo") login con clave incorrecta responde 403
- ✅ API REST seguridad y roles (reto "Enfoque administrativo") un técnico no puede ver el panel administrativo (403)
- ✅ API REST seguridad y roles (reto "Enfoque administrativo") un docente no puede usar la pantalla del trabajador (403)
- ✅ API REST seguridad y roles (reto "Enfoque administrativo") un técnico no puede crear solicitudes (403)
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") resolver el QR muestra la ubicación registrada del equipo
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") crear por QR responde 201 y queda asignada
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") reservar un portátil con el QR del salón
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") QR de otro sistema → 400
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") préstamo sin decir qué → 400
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") equipo no registrado → 404
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") JSON mal formado → 400
- ✅ API REST solicitud por QR (retos "Reservar mediante QR" y "QR asociado al PC") ruta inexistente → 404
- ✅ API REST multisede una solicitud del NORTE se asigna al técnico del NORTE y no toca el CAMPUS
- ✅ API REST multisede si el NORTE está saturado, la solicitud espera en la cola del NORTE aunque el CAMPUS tenga técnicos libres
- ✅ API REST multisede el panel admin reporta la demanda y el déficit por sede
- ✅ API REST cola con límite (mitigación de la prueba de estrés) devuelve solo las primeras N pero informa el total
- ✅ API REST cola con límite (mitigación de la prueba de estrés) limite=0 → 400
- ✅ API REST cola con límite (mitigación de la prueba de estrés) limite=501 → 400
- ✅ API REST cola con límite (mitigación de la prueba de estrés) limite=abc → 400
- ✅ API REST cola con límite (mitigación de la prueba de estrés) limite=2.5 → 400
- ✅ API REST escalación automática por tiempo si Laura no acepta en 5 minutos se reasigna; el coordinador lo ve
- ✅ API REST escalación automática por tiempo el ProgramadorEscalacion (adaptador de entrada por tiempo) ejecuta el mismo caso de uso

## `tests/integration/escaneoQR.int.test.js` — 16 pruebas, 86.1 s

- ✅ Escaneo de QR con imágenes reales escanear el QR impreso del video beam del salón 101 (Edificio K) crea la solicitud y la asigna a Laura
- ✅ Escaneo de QR con imágenes reales después de escanear: decir QUÉ le pasa al equipo las opciones dependen del equipo: el video beam y el PC del mismo salón tienen problemas distintos
- ✅ Escaneo de QR con imágenes reales después de escanear: decir QUÉ le pasa al equipo se rechaza un problema que no es de ese equipo (control remoto de un PC) (400) y no se crea nada
- ✅ Escaneo de QR con imágenes reales después de escanear: decir QUÉ le pasa al equipo se rechaza "Otro problema" sin describirlo (400) y no se crea nada
- ✅ Escaneo de QR con imágenes reales después de escanear: decir QUÉ le pasa al equipo se rechaza un problema inventado (400) y no se crea nada
- ✅ Escaneo de QR con imágenes reales después de escanear: decir QUÉ le pasa al equipo "Otro problema" con descripción: el técnico lee lo que escribió la persona
- ✅ Escaneo de QR con imágenes reales reservar un portátil escaneando el QR del PC del salón 102 (Edificio H)
- ✅ Escaneo de QR con imágenes reales los 61 QR impresos en docs/qr se leen y cada uno apunta a SU equipo registrado (QR asociado al PC)
- ✅ Escaneo de QR con imágenes reales un QR pequeño (120 px, como visto de lejos) también se lee
- ✅ Escaneo de QR con imágenes reales un QR que no es del sistema (por ejemplo, un enlace web) se lee pero la API lo rechaza con 400
- ✅ Escaneo de QR con imágenes reales un QR con formato correcto pero de un equipo que no existe → 404 y no se crea nada
- ✅ Escaneo de QR con imágenes reales un QR copiado de otro salón NO puede cambiar la ubicación: manda la BD, no el QR
- ✅ Escaneo de QR con imágenes reales stickers rayados (por qué se imprime con corrección de errores H) con el 10 % del centro rayado, el QR impreso (nivel H) se sigue leyendo
- ✅ Escaneo de QR con imágenes reales stickers rayados (por qué se imprime con corrección de errores H) con el mismo rayón, un QR de nivel M ya no se lee (por eso se descartó M)
- ✅ Escaneo de QR con imágenes reales stickers rayados (por qué se imprime con corrección de errores H) medido sobre los 61 QR impresos: con el 10 % rayado se leen al menos el 95 %
- ✅ Escaneo de QR con imágenes reales stickers rayados (por qué se imprime con corrección de errores H) con el 30 % rayado no se lee nada, y la app no llega a enviar solicitud

## `tests/integration/flujoSistema.e2e.test.js` — 1 pruebas, 0.7 s

- ✅ Flujo de sistema end-to-end de escanear el QR a resolver, con cola de prioridades y panel admin

## `tests/integration/persistencia.int.test.js` — 5 pruebas, 0.0 s

- ✅ Adaptadores de persistencia SQLite guarda y rehidrata un técnico con su estado (State se reconstruye desde la BD)
- ✅ Adaptadores de persistencia SQLite bloqueo optimista: dos operaciones que leyeron la misma versión no pueden ganar ambas
- ✅ Adaptadores de persistencia SQLite la unidad de trabajo revierte todo si algo falla a mitad de camino
- ✅ Adaptadores de persistencia SQLite listarAbiertas filtra por sede y excluye las resueltas
- ✅ Adaptadores de persistencia SQLite la BD rechaza una solicitud de un equipo que no existe (integridad referencial)

## `tests/integration/prototipo.int.test.js` — 21 pruebas, 8.7 s

- ✅ API del prototipo AsisTec pantalla 1 → login devuelve nombre y correo para "Mi perfil"
- ✅ API del prototipo AsisTec estudiantes: también reservan y reportan, igual que los docentes una estudiante reserva un PC por QR y lo ve en "Mis solicitudes"; la docente no lo ve en las suyas
- ✅ API del prototipo AsisTec estudiantes: también reservan y reportan, igual que los docentes cada cuenta ve solo el detalle de SUS solicitudes: la docente no abre el seguimiento de la estudiante (403)
- ✅ API del prototipo AsisTec estudiantes: también reservan y reportan, igual que los docentes una estudiante no entra a get /api/admin/resumen (403)
- ✅ API del prototipo AsisTec estudiantes: también reservan y reportan, igual que los docentes una estudiante no entra a post /api/tecnicos/yo/aceptar (403)
- ✅ API del prototipo AsisTec pantalla 3a: "Buscar manualmente por edificio y salón" (QR dañado) ubicaciones → equipos del salón → solicitud con el equipo elegido
- ✅ API del prototipo AsisTec pantalla 3a: "Buscar manualmente por edificio y salón" (QR dañado) /api/equipos?edificio=Edificio%20O&salon=999 → 404
- ✅ API del prototipo AsisTec pantalla 3a: "Buscar manualmente por edificio y salón" (QR dañado) /api/equipos?edificio=Edificio%20O → 400
- ✅ API del prototipo AsisTec pantallas 3b/3c: préstamo ahora y agendado ahora → asignado; agendado → PROGRAMADA y entra a la cola 30 min antes
- ✅ API del prototipo AsisTec pantallas 3b/3c: préstamo ahora y agendado datos inválidos → 400 con el mensaje para mostrar en la app
- ✅ API del prototipo AsisTec pantallas 12, 13 y 14: mantenimiento, evento en el auditorio y falla eléctrica
- ✅ API del prototipo AsisTec pantalla 8 "Mis solicitudes" y pantalla 11 "Notificaciones"
- ✅ API del prototipo AsisTec pantalla 5: "Cancelar" pasa la solicitud a otro técnico
- ✅ API del prototipo AsisTec pantalla 6: tarjetas del día, escaladas con motivo y "Asignar manualmente" con un técnico de otra sede
- ✅ API del prototipo AsisTec docente get /api/admin/resumen → 403
- ✅ API del prototipo AsisTec docente post /api/tecnicos/yo/cancelar → 403
- ✅ API del prototipo AsisTec admin post /api/admin/solicitudes/S-0001/asignar → 400
- ✅ Persistencia de los campos nuevos (SQLite real) datos JSON, agenda, escalación y equipo opcional sobreviven ida y vuelta
- ✅ Persistencia de los campos nuevos (SQLite real) notificaciones: la más reciente primero y marcar leídas
- ✅ Persistencia de los campos nuevos (SQLite real) una BD de la versión anterior se recrea con el esquema nuevo al abrirla
- ✅ Tiempo real para el docente (seguimiento y notificaciones) cuando el técnico acepta, al docente le llegan el cambio de estado y el aviso

## `tests/integration/tiempoReal.int.test.js` — 4 pruebas, 2.3 s

- ✅ Tiempo real con Socket.IO el técnico recibe la solicitud asignada sin recargar la pantalla
- ✅ Tiempo real con Socket.IO el admin recibe la creación y los cambios de estado
- ✅ Tiempo real con Socket.IO un técnico de otra sede NO recibe eventos del CAMPUS (aislamiento multisede)
- ✅ Tiempo real con Socket.IO una conexión sin token válido es rechazada

## `tests/unit/aplicacion/CasosDeUso.test.js` — 34 pruebas, 0.1 s

- ✅ CrearSolicitud crea y asigna al técnico del edificio, y avisa en tiempo real a él, a la sede y al admin
- ✅ CrearSolicitud sin técnicos disponibles queda PENDIENTE y solo avisa a la sede y al admin
- ✅ CrearSolicitud un equipo que no existe da NoEncontrado y no guarda nada
- ✅ CrearSolicitud un QR inválido se rechaza antes de consultar el repositorio
- ✅ CrearSolicitud una solicitud de la sede NORTE nunca se asigna a un técnico del CAMPUS
- ✅ AtenderSolicitud (pantalla del trabajador) aceptar → llegada → finalizar resuelve y le asigna la siguiente más prioritaria
- ✅ AtenderSolicitud (pantalla del trabajador) finalizar con la cola vacía deja al técnico disponible
- ✅ AtenderSolicitud (pantalla del trabajador) un técnico sin solicitud activa no puede aceptar
- ✅ AtenderSolicitud (pantalla del trabajador) un técnico inexistente da NoEncontrado
- ✅ AtenderSolicitud (pantalla del trabajador) no puede finalizar sin haber llegado
- ✅ EscalarVencidas antes del límite de 5 minutos no toca nada (valor límite: 4 min)
- ✅ EscalarVencidas a los 5 minutos sin aceptar se reasigna a otro técnico (valor límite: 5 min)
- ✅ EscalarVencidas sin nadie más, escala al coordinador
- ✅ EscalarVencidas una solicitud en cola 9 minutos → 0 escaladas (límite 10 min)
- ✅ EscalarVencidas una solicitud en cola 10 minutos → 1 escaladas (límite 10 min)
- ✅ EscalarVencidas una solicitud ya aceptada no se escala aunque pase el tiempo
- ✅ Consultas (panel técnico y administrativo) la cola de la sede sale ordenada con posición, prioridad y minutos de espera
- ✅ Consultas (panel técnico y administrativo) con límite devuelve solo las primeras pero el total completo (valores límite 1 y N)
- ✅ Consultas (panel técnico y administrativo) el docente ve su posición en la cola
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) la ve quien la creó
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) la ve el técnico asignado
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) la ve otro técnico de la misma sede
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) la ve el coordinador
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) NO la ve una estudiante que no la creó (AccesoDenegado → 403)
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) NO la ve otro docente de la misma sede (AccesoDenegado → 403)
- ✅ Consultas (panel técnico y administrativo) quién puede ver el detalle de una solicitud (Enfoque administrativo) NO la ve un técnico de otra sede (AccesoDenegado → 403)
- ✅ Consultas (panel técnico y administrativo) una solicitud inexistente da NoEncontrado
- ✅ Consultas (panel técnico y administrativo) el panel del técnico incluye su solicitud actual y la cola de su sede
- ✅ Consultas (panel técnico y administrativo) la demanda por sede calcula déficit, tiempos y edificios más demandados
- ✅ Autenticar con clave correcta devuelve token y perfil sin el hash
- ✅ Autenticar rechaza { usuario: 'laura', clave: 'mala' }
- ✅ Autenticar rechaza { usuario: 'nadie', clave: 'x' }
- ✅ Autenticar rechaza { usuario: '', clave: 'x' }
- ✅ Autenticar rechaza { usuario: 'laura' }

## `tests/unit/aplicacion/CasosDeUsoPrototipo.test.js` — 26 pruebas, 0.0 s

- ✅ CrearSolicitud — las tres formas de indicar el lugar por salón (préstamo): la sede sale del registro, no del cliente
- ✅ CrearSolicitud — las tres formas de indicar el lugar búsqueda manual (QR dañado): con el código del equipo elegido en la lista
- ✅ CrearSolicitud — las tres formas de indicar el lugar un salón que no existe se rechaza y no guarda nada
- ✅ CrearSolicitud — las tres formas de indicar el lugar un edificio vacío se rechaza y no guarda nada
- ✅ CrearSolicitud — las tres formas de indicar el lugar sin QR, sin equipo y sin salón se rechaza y no guarda nada
- ✅ CrearSolicitud — las tres formas de indicar el lugar un código manual con caracteres raros se rechaza y no guarda nada
- ✅ CrearSolicitud — las tres formas de indicar el lugar una agendada NO toma técnico aunque haya uno libre
- ✅ ActivarProgramadas (agenda → cola de prioridades) entra a la cola 30 min antes de la hora pedida, no antes
- ✅ ActivarProgramadas (agenda → cola de prioridades) sin técnicos queda PENDIENTE y su espera cuenta desde la activación
- ✅ AtenderSolicitud.cancelar (botón "Cancelar" del técnico) la solicitud pasa a otro técnico de la sede y avisa a ambos
- ✅ AtenderSolicitud.cancelar (botón "Cancelar" del técnico) si no hay nadie más, vuelve a la cola (nunca se reasigna al mismo que canceló)
- ✅ AsignarManualmente (panel del coordinador) puede mandar un técnico de OTRA sede a una solicitud escalada (redistribución multisede)
- ✅ AsignarManualmente (panel del coordinador) un técnico ocupado no se puede asignar (lo impide el patrón State)
- ✅ AsignarManualmente (panel del coordinador) solicitud inexistente → NoEncontrado
- ✅ AsignarManualmente (panel del coordinador) técnico inexistente → NoEncontrado
- ✅ EscalarVencidas — motivo visible para el coordinador nadie en la sede
- ✅ EscalarVencidas — motivo visible para el coordinador el técnico no respondió
- ✅ Consultas del prototipo "Mis solicitudes": activas con su técnico, historial aparte y solo las propias
- ✅ Consultas del prototipo "hoy" en el panel es el día en Bogotá (UTC-5): lo resuelto antes de la medianoche local no cuenta
- ✅ Consultas del prototipo ubicaciones agrupa sede → edificio → salones sin repetir
- ✅ Consultas del prototipo búsqueda manual: lista los equipos del salón o dice que no hay
- ✅ Consultas del prototipo seguimiento: incluye el técnico con su estado (para el paso "En camino")
- ✅ NotificacionesDocente (Decorator del publicador) cada cambio de SU solicitud le llega al docente como aviso y en su sala
- ✅ NotificacionesDocente (Decorator del publicador) si guardar el aviso falla, la operación principal NO se cae
- ✅ NotificacionesDocente (Decorator del publicador) eventos sin docente (p. ej. notificacion:nueva) pasan tal cual, sin sala extra
- ✅ NotificacionesDocente (Decorator del publicador) el auditorio se nombra tal cual (no "Salón Auditorio")

## `tests/unit/arquitectura.test.js` — 3 pruebas, 0.0 s

- ✅ Regla de dependencia hexagonal src/domain no depende de infraestructura
- ✅ Regla de dependencia hexagonal src/application no depende de infraestructura
- ✅ Regla de dependencia hexagonal src/domain no depende de src/application

## `tests/unit/dominio/Asignacion.test.js` — 22 pruebas, 0.0 s

- ✅ Búsqueda de técnico (Decorator) y multisede prefiere al técnico disponible del mismo edificio
- ✅ Búsqueda de técnico (Decorator) y multisede sin técnico en el edificio, usa el más cercano según el mapa (orden importa)
- ✅ Búsqueda de técnico (Decorator) y multisede si el cercano está ocupado, pasa al siguiente cercano
- ✅ Búsqueda de técnico (Decorator) y multisede sin cercanos disponibles, toma cualquiera libre de la misma sede
- ✅ Búsqueda de técnico (Decorator) y multisede NUNCA asigna un técnico de otra sede aunque sea el único libre
- ✅ Búsqueda de técnico (Decorator) y multisede la búsqueda base sola no hace fallback
- ✅ Búsqueda de técnico (Decorator) y multisede un edificio que no está en el mapa no tiene cercanos
- ✅ Búsqueda de técnico (Decorator) y multisede un edificio llamado "constructor" no rompe la búsqueda
- ✅ Búsqueda de técnico (Decorator) y multisede un edificio llamado "__proto__" no rompe la búsqueda
- ✅ Búsqueda de técnico (Decorator) y multisede un edificio llamado "toString" no rompe la búsqueda
- ✅ GestorAsignaciones usa la estrategia de búsqueda inyectada (doble de prueba)
- ✅ GestorAsignaciones si no hay técnico, la solicitud queda PENDIENTE en la cola
- ✅ GestorAsignaciones reasignar excluye al técnico que no respondió
- ✅ GestorAsignaciones no reasigna si el técnico ya aceptó
- ✅ GestorAsignaciones al quedar libre, el técnico toma la solicitud más prioritaria de SU sede
- ✅ GestorAsignaciones un técnico ocupado no toma nada de la cola
- ✅ GestorAsignaciones con la cola vacía no asigna nada
- ✅ Cadena de escalación (Chain of Responsibility) si el técnico ya aceptó, la cadena se detiene en el primer eslabón
- ✅ Cadena de escalación (Chain of Responsibility) si no respondió y hay otro técnico, se reasigna
- ✅ Cadena de escalación (Chain of Responsibility) si no hay nadie más, llega al coordinador y la solicitud queda ESCALADA (nunca se pierde)
- ✅ Cadena de escalación (Chain of Responsibility) una solicitud pendiente sin técnico también termina escalada
- ✅ Cadena de escalación (Chain of Responsibility) un eslabón sin siguiente devuelve SIN_ACCION y la clase base es abstracta

## `tests/unit/dominio/CodigoQR.test.js` — 23 pruebas, 0.0 s

- ✅ CodigoQR clase válida extrae el código del equipo de un QR bien formado
- ✅ CodigoQR clase válida normaliza a mayúsculas y quita espacios alrededor
- ✅ CodigoQR clase válida generarTexto y desdeTexto son inversos
- ✅ CodigoQR clase válida el objeto es inmutable
- ✅ CodigoQR clases inválidas rechaza QR vacío
- ✅ CodigoQR clases inválidas rechaza QR solo espacios
- ✅ CodigoQR clases inválidas rechaza QR no es texto
- ✅ CodigoQR clases inválidas rechaza QR nulo
- ✅ CodigoQR clases inválidas rechaza un enlace web
- ✅ CodigoQR clases inválidas rechaza otro prefijo
- ✅ CodigoQR clases inválidas rechaza partes de más
- ✅ CodigoQR clases inválidas rechaza una versión no soportada
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "CAM K 101"
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "CAM_K_101"
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "CAMK101"
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "-CAM-K"
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "CAM-K-"
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "CAM--K101"
- ✅ CodigoQR clases inválidas rechaza el código con formato inválido "CAM-K-1';DROP"
- ✅ CodigoQR valores límite de longitud código de 5 caracteres (en el borde) es válido
- ✅ CodigoQR valores límite de longitud código de 40 caracteres (en el borde) es válido
- ✅ CodigoQR valores límite de longitud código de 4 caracteres (fuera del borde) se rechaza
- ✅ CodigoQR valores límite de longitud código de 41 caracteres (fuera del borde) se rechaza

## `tests/unit/dominio/FabricaSolicitudes.test.js` — 21 pruebas, 0.0 s

- ✅ FabricaSolicitudes crea una falla copiando la ubicación desde el equipo (no desde el QR)
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) acepta problema del catálogo sin descripción
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) acepta problema del catálogo con descripción
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) acepta "Otro problema" con descripción
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) acepta equipo fuera del catálogo con problema genérico
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) rechaza un problema de otro tipo de equipo (control remoto en un PC)
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) rechaza un problema inexistente
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) rechaza "Otro problema" sin descripción
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) rechaza "Otro problema" con descripción en blanco
- ✅ FabricaSolicitudes falla de equipo: qué le pasa (depende del equipo escaneado) rechaza una descripción de más de 200 caracteres
- ✅ FabricaSolicitudes crea un préstamo de portátil
- ✅ FabricaSolicitudes rechaza un préstamo con elemento "undefined"
- ✅ FabricaSolicitudes rechaza un préstamo con elemento "PROYECTOR"
- ✅ FabricaSolicitudes rechaza un préstamo con elemento ""
- ✅ FabricaSolicitudes rechaza el tipo desconocido undefined
- ✅ FabricaSolicitudes rechaza el tipo desconocido BORRAR
- ✅ FabricaSolicitudes rechaza el tipo desconocido null
- ✅ FabricaSolicitudes rechaza el tipo desconocido constructor
- ✅ FabricaSolicitudes rechaza el tipo desconocido __proto__
- ✅ FabricaSolicitudes descripción de 200 caracteres (en el borde) es válida
- ✅ FabricaSolicitudes descripción de 201 caracteres (fuera del borde) se rechaza

## `tests/unit/dominio/Prioridad.test.js` — 18 pruebas, 0.0 s

- ✅ PoliticaImpactoYEspera (Strategy) FALLA_EQUIPO_FIJO con clase en curso=true recién creada vale 100
- ✅ PoliticaImpactoYEspera (Strategy) FALLA_EQUIPO_FIJO con clase en curso=false recién creada vale 50
- ✅ PoliticaImpactoYEspera (Strategy) PRESTAMO_EQUIPO con clase en curso=true recién creada vale 60
- ✅ PoliticaImpactoYEspera (Strategy) PRESTAMO_EQUIPO con clase en curso=false recién creada vale 30
- ✅ PoliticaImpactoYEspera (Strategy) tras 0 minutos suma 0 puntos de espera
- ✅ PoliticaImpactoYEspera (Strategy) tras 1 minutos suma 2 puntos de espera
- ✅ PoliticaImpactoYEspera (Strategy) tras 59 minutos suma 118 puntos de espera
- ✅ PoliticaImpactoYEspera (Strategy) tras 60 minutos suma 120 puntos de espera
- ✅ PoliticaImpactoYEspera (Strategy) tras 61 minutos suma 120 puntos de espera
- ✅ PoliticaImpactoYEspera (Strategy) tras 600 minutos suma 120 puntos de espera
- ✅ PoliticaImpactoYEspera (Strategy) una solicitud de baja prioridad que espera lo suficiente supera a una urgente recién llegada (sin inanición)
- ✅ ColaPrioridad una cola vacía no devuelve nada
- ✅ ColaPrioridad saca primero la de mayor prioridad
- ✅ ColaPrioridad con igual prioridad respeta el orden de llegada (FIFO)
- ✅ ColaPrioridad con igual prioridad y hora desempata por id (resultado determinista)
- ✅ ColaPrioridad aListaOrdenada no vacía la cola original
- ✅ ColaPrioridad mantiene el orden correcto con muchos elementos (propiedad del montículo)
- ✅ ColaPrioridad con la política de orden de llegada se comporta como una cola FIFO (el Strategy es intercambiable)

## `tests/unit/dominio/ServiciosPrototipo.test.js` — 32 pruebas, 0.0 s

- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) "Lo necesito ahora" por salón: queda PENDIENTE, con clase en curso y los datos de la configuración
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) "Agendar para después": queda PROGRAMADA, sin clase en curso y con la fecha elegida
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) cantidad 1 es válida
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) cantidad 10 es válida
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) cantidad 0 se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) cantidad 11 se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) cantidad 2.5 se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) cantidad "3" se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) si activa "Acceso a páginas/software específico" debe decir cuál
- ✅ FabricaSolicitudes — servicios del prototipo préstamo (pantallas 3b y 3c) con el interruptor apagado, el texto de software se descarta
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) una fecha en el pasado se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) una fecha justo ahora se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) una fecha a más de 90 días se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) una fecha que no es un número se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) una fecha a exactamente 90 días es válida (borde)
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) mantenimiento y evento exigen fecha
- ✅ FabricaSolicitudes — servicios del prototipo agenda (calendario de las pantallas 3c, 12 y 13) las fallas no se pueden agendar: se atienden de inmediato
- ✅ FabricaSolicitudes — servicios del prototipo mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14) mantenimiento con tipo de revisión y notas
- ✅ FabricaSolicitudes — servicios del prototipo mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14) mantenimiento con un tipo de revisión que no está en los chips se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14) evento: nombre obligatorio y requerimientos sin repetir
- ✅ FabricaSolicitudes — servicios del prototipo mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14) evento con requerimientos ["KARAOKE"] se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14) evento con requerimientos "AUDIO" se rechaza
- ✅ FabricaSolicitudes — servicios del prototipo mantenimiento, evento y falla eléctrica (pantallas 12, 13 y 14) falla eléctrica: el chip elegido es obligatorio y la descripción queda como detalle
- ✅ FabricaSolicitudes — servicios del prototipo una falla de equipo sin equipo (solo el salón) se rechaza: hay que escanear o buscarlo
- ✅ FabricaSolicitudes — servicios del prototipo sin salón no se crea nada
- ✅ Prioridad de los servicios nuevos (Strategy) con clase en curso: falla de equipo > falla eléctrica > evento > préstamo > mantenimiento
- ✅ Prioridad de los servicios nuevos (Strategy) una agendada empieza a envejecer cuando se activa, no cuando se pidió
- ✅ Solicitud y Técnico — transiciones nuevas activar solo aplica a una PROGRAMADA
- ✅ Solicitud y Técnico — transiciones nuevas liberar sin técnico asignado no tiene sentido
- ✅ Solicitud y Técnico — transiciones nuevas escalar guarda cuándo y por qué (lo que lee el coordinador)
- ✅ Solicitud y Técnico — transiciones nuevas "Cancelar" en camino: el técnico queda disponible y la solicitud vuelve a PENDIENTE
- ✅ Solicitud y Técnico — transiciones nuevas ya en el salón (OCUPADO) no se puede cancelar: hay que finalizar

## `tests/unit/dominio/Tecnico.test.js` — 29 pruebas, 0.0 s

- ✅ Tecnico (State) recorre el ciclo completo y deja la solicitud resuelta
- ✅ Tecnico (State) al asignar queda esperando respuesta y la solicitud guarda el técnico
- ✅ Tecnico (State) cancelar una asignación devuelve la solicitud a la cola
- ✅ Tecnico (State) transiciones inválidas en DISPONIBLE no se permite aceptar
- ✅ Tecnico (State) transiciones inválidas en DISPONIBLE no se permite confirmarLlegada
- ✅ Tecnico (State) transiciones inválidas en DISPONIBLE no se permite finalizar
- ✅ Tecnico (State) transiciones inválidas en DISPONIBLE no se permite cancelarAsignacion
- ✅ Tecnico (State) transiciones inválidas en ASIGNADO no se permite asignar
- ✅ Tecnico (State) transiciones inválidas en ASIGNADO no se permite confirmarLlegada
- ✅ Tecnico (State) transiciones inválidas en ASIGNADO no se permite finalizar
- ✅ Tecnico (State) transiciones inválidas en EN_CAMINO no se permite aceptar
- ✅ Tecnico (State) transiciones inválidas en EN_CAMINO no se permite finalizar
- ✅ Tecnico (State) transiciones inválidas en EN_CAMINO no se permite cancelarAsignacion
- ✅ Tecnico (State) transiciones inválidas en OCUPADO no se permite asignar
- ✅ Tecnico (State) transiciones inválidas en OCUPADO no se permite confirmarLlegada
- ✅ Tecnico (State) rehidrata el estado desde su nombre (como viene de la BD)
- ✅ Tecnico (State) rechaza el nombre heredado del prototipo "toString"
- ✅ Tecnico (State) rechaza el nombre heredado del prototipo "__proto__"
- ✅ Tecnico (State) rechaza el nombre heredado del prototipo "constructor"
- ✅ Tecnico (State) la clase base obliga a implementar el nombre
- ✅ Tecnico (State) aVista expone solo datos planos
- ✅ Solicitud (reglas propias) no se puede asignar una solicitud ya resuelta
- ✅ Solicitud (reglas propias) no se puede marcar en atención si no está asignada
- ✅ Solicitud (reglas propias) no se puede resolver si no está en atención
- ✅ Solicitud (reglas propias) una solicitud escalada se puede volver a asignar
- ✅ Solicitud (reglas propias) con 0 ms de espera lleva 0 minutos
- ✅ Solicitud (reglas propias) con 59999 ms de espera lleva 0 minutos
- ✅ Solicitud (reglas propias) con 60000 ms de espera lleva 1 minutos
- ✅ Solicitud (reglas propias) con -5000 ms de espera lleva 0 minutos

## Cobertura de las pruebas unitarias (dominio + aplicación)

```
---------------------------|---------|----------|---------|---------|---------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s         
---------------------------|---------|----------|---------|---------|---------------------------
All files                  |   98.62 |    91.23 |   96.38 |   98.58 |                           
 application               |   98.23 |    88.52 |   94.23 |   97.87 |                           
  ActivarProgramadas.js    |   95.45 |     90.9 |    87.5 |   94.73 | 20                        
  AsignarManualmente.js    |     100 |      100 |     100 |     100 |                           
  AtenderSolicitud.js      |     100 |      100 |     100 |     100 |                           
  Autenticar.js            |     100 |    91.66 |     100 |     100 | 21                        
  Consultas.js             |   99.09 |    93.87 |   97.77 |   98.87 | 117                       
  CrearSolicitud.js        |     100 |    96.29 |     100 |     100 | 60                        
  EscalarVencidas.js       |     100 |     87.5 |     100 |     100 | 14,26                     
  NotificacionesDocente.js |   97.43 |     91.3 |   93.75 |   96.87 | 50                        
  vistas.js                |   78.57 |    41.17 |   57.14 |   78.57 | 20-22                     
 domain                    |   88.88 |        0 |   83.33 |   88.88 |                           
  errores.js               |   88.88 |        0 |   83.33 |   88.88 | 33                        
 domain/asignacion         |     100 |      100 |     100 |     100 |                           
  GestorAsignaciones.js    |     100 |      100 |     100 |     100 |                           
 domain/busqueda           |     100 |    93.33 |     100 |     100 |                           
  busqueda.js              |     100 |    93.33 |     100 |     100 | 20                        
 domain/escalacion         |      96 |    84.61 |     100 |      96 |                           
  cadena.js                |      96 |    84.61 |     100 |      96 | 60                        
 domain/modelo             |    98.9 |    94.33 |   97.43 |   99.39 |                           
  CodigoQR.js              |     100 |      100 |     100 |     100 |                           
  FabricaSolicitudes.js    |   98.88 |    92.22 |     100 |     100 | 34,51,107,115-120,142,185 
  Solicitud.js             |   98.11 |    95.45 |   91.66 |   98.11 | 54                        
  enums.js                 |     100 |      100 |     100 |     100 |                           
  problemasEquipo.js       |     100 |      100 |     100 |     100 |                           
 domain/prioridad          |     100 |      100 |     100 |     100 |                           
  ColaPrioridad.js         |     100 |      100 |     100 |     100 |                           
  politicas.js             |     100 |      100 |     100 |     100 |                           
 domain/tecnicos           |     100 |       70 |     100 |     100 |                           
  Tecnico.js               |     100 |     62.5 |     100 |     100 | 15                        
  estados.js               |     100 |      100 |     100 |     100 |                           
---------------------------|---------|----------|---------|---------|---------------------------
```
