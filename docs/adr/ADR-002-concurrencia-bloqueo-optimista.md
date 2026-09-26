# ADR-002 — Del Singleton sincronizado al bloqueo optimista

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto

En el Corte 1, `GestorAsignaciones` era un **Singleton** con métodos `synchronized`, para que dos solicitudes simultáneas no le asignaran el mismo técnico. El mismo README del Corte 1 reconocía el límite: `synchronized` solo protege dentro de una JVM, y si hubiera varias instancias del servidor dejaría de servir.

En el Corte 2 el estado ya no vive en memoria sino en SQLite, y el backend es Node.js, que no tiene `synchronized` (tiene un solo hilo de eventos).

## Opciones consideradas

1. **Mantener el Singleton con un mutex en memoria.** No protege entre instancias y en Node no aporta nada: un caso de uso síncrono ya no se interrumpe a la mitad.
2. **Bloqueo pesimista** (`SELECT … FOR UPDATE`). SQLite no lo soporta, y en PostgreSQL bloquearía filas mientras se decide.
3. **Bloqueo optimista con columna `version`.** Cada técnico guarda un número de versión. Al guardar, el `UPDATE` exige `WHERE version = <la que leí>`. Si otra operación lo cambió antes, no se actualiza ninguna fila y se lanza `ConflictoConcurrencia`.

## Decisión

Opción 3, más una **transacción** por caso de uso (puerto `UnidadDeTrabajo`):

- `src/adapters/out/persistence/sqlite/repositorios.js` → `RepositorioTecnicosSqlite.guardar()` (UPDATE condicionado por `version`)
- `src/adapters/out/persistence/sqlite/repositorios.js` → `UnidadDeTrabajoSqlite` (todo o nada)
- `GestorAsignaciones` deja de ser Singleton. Es una sola instancia creada en `src/config/contenedor.js` e inyectada (inversión de dependencias).

## Consecuencias

- **+** Funciona igual con una o varias instancias del servidor, siempre que compartan la misma BD.
- **+** Se prueba sin hilos: `tests/integration/persistencia.int.test.js` simula dos lectores de la misma versión y verifica que el segundo recibe `ConflictoConcurrencia`.
- **+** Si algo falla a mitad de la asignación, la transacción revierte todo (también probado).
- **−** Quien pierde la carrera recibe un 409 y debe reintentar. Hoy la app muestra el error y no reintenta sola (pendiente para el Corte 3).
- **−** SQLite es un archivo local: para tener varias instancias de verdad hay que migrar a PostgreSQL. El puerto no cambia, solo el adaptador.
