const { CodigoQR } = require('../domain/modelo/CodigoQR');
const { NoEncontrado, DatoInvalido } = require('../domain/errores');
const { vistaSolicitud } = require('./vistas');

/**
 * Caso de uso: un docente pide un servicio desde la app (todas las pantallas "Nueva solicitud").
 *
 * La ubicación llega de UNA de tres formas:
 *  1. `qr`            → escaneó el QR del equipo (retos "Reservar mediante QR" y "QR asociado al PC")
 *  2. `codigoEquipo`  → el QR estaba dañado y eligió el equipo en "Buscar manualmente por edificio y salón"
 *  3. `ubicacion`     → { edificio, salon }: préstamo, mantenimiento, evento o falla eléctrica
 *
 * En los tres casos la sede sale del registro de equipos del backend, no del cliente
 * (un cliente no puede "mover" una solicitud a otra sede). Si la solicitud es para ahora,
 * se intenta asignar un técnico en la misma transacción; si está agendada queda PROGRAMADA.
 */
class CrearSolicitud {
  constructor({ repoSolicitudes, repoTecnicos, repoEquipos, unidadDeTrabajo, fabrica, gestor, publicador, reloj }) {
    Object.assign(this, { repoSolicitudes, repoTecnicos, repoEquipos, unidadDeTrabajo, fabrica, gestor, publicador, reloj });
  }

  ejecutar({ qr, codigoEquipo, ubicacion, tipo, detalle, datos, claseEnCurso, programadaPara, usuario }) {
    const lugar = this.#resolverUbicacion({ qr, codigoEquipo, ubicacion });
    const ahora = this.reloj.ahora();
    const solicitud = this.fabrica.crear({
      tipo, ubicacion: lugar, detalle, datos, claseEnCurso, programadaPara, creadaPor: usuario, ahora,
    });

    const tecnico = this.unidadDeTrabajo.ejecutar(() => {
      const elegido = solicitud.estaProgramada()
        ? null
        : this.gestor.asignar(solicitud, this.repoTecnicos.listar({ sede: solicitud.sede }), ahora);
      this.repoSolicitudes.guardar(solicitud);
      if (elegido) this.repoTecnicos.guardar(elegido);
      return elegido;
    });

    // Los eventos se publican DESPUÉS de confirmar la transacción: nunca se avisa algo que no quedó guardado.
    const vista = vistaSolicitud(solicitud, { tecnicoNombre: tecnico?.nombre ?? null });
    this.publicador.publicar('solicitud:creada', vista, ['admin', `sede:${solicitud.sede}`]);
    if (tecnico) {
      this.publicador.publicar('solicitud:asignada', vista, [`tecnico:${tecnico.id}`, 'admin', `sede:${solicitud.sede}`]);
    }
    return vista;
  }

  #resolverUbicacion({ qr, codigoEquipo, ubicacion }) {
    if (qr !== undefined && qr !== null) return this.#equipo(CodigoQR.desdeTexto(qr).codigoEquipo);
    if (codigoEquipo) return this.#equipo(CodigoQR.desdeTexto(CodigoQR.generarTexto(String(codigoEquipo))).codigoEquipo);
    if (ubicacion) return this.#salon(ubicacion);
    throw new DatoInvalido('Escanee el QR del equipo o elija el edificio y el salón.');
  }

  #equipo(codigo) {
    const equipo = this.repoEquipos.buscarPorCodigo(codigo);
    if (!equipo) throw new NoEncontrado(`El equipo ${codigo} no está registrado.`);
    return equipo;
  }

  #salon({ edificio, salon } = {}) {
    if (typeof edificio !== 'string' || typeof salon !== 'string' || !edificio || !salon) {
      throw new DatoInvalido('Elija el edificio y el salón.');
    }
    const [equipo] = this.repoEquipos.listarPorSalon(edificio, salon);
    if (!equipo) throw new NoEncontrado(`No existe el salón ${salon} en ${edificio}.`);
    return { salon: equipo.salon, edificio: equipo.edificio, sede: equipo.sede };
  }
}

/** Nombre del Corte 2 (primera versión): se conserva para no romper referencias en la documentación. */
const CrearSolicitudDesdeQR = CrearSolicitud;

module.exports = { CrearSolicitud, CrearSolicitudDesdeQR };
