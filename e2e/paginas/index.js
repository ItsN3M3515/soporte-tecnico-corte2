/**
 * PAGE OBJECT MODEL: cada clase representa una pantalla del prototipo AsisTec y expone
 * lo que una persona hace en ella. Las pruebas hablan en términos de pantallas
 * ("escanear", "reportar falla"), no de selectores; si cambia la interfaz, solo cambia esta capa.
 *
 * Nota de implementación: la app (expo-router) deja montadas las pantallas anteriores de la pila,
 * así que todas las búsquedas se limitan a elementos visibles.
 */
const visible = (locator) => locator.locator('visible=true').first();

class Pantalla {
  constructor(page) {
    this.page = page;
  }

  texto(t) {
    return visible(this.page.getByText(t, { exact: true }));
  }

  contiene(t) {
    return visible(this.page.getByText(t));
  }

  boton(nombre) {
    return visible(this.page.getByRole('button', { name: nombre }));
  }
}

class InicioSesion extends Pantalla {
  async abrir() {
    await this.page.goto('/');
    return this.esperar();
  }

  async esperar() {
    await this.texto('Inicia sesión').waitFor();
    return this;
  }

  /** Botones de "Cuentas de prueba": Docente, Estudiante, Técnico, Coordinador. */
  async entrarComo(rol) {
    await this.texto(rol).click();
  }
}

class Inicio extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/inicio');
    await this.texto('¿Qué necesitas hoy?').waitFor();
    return this;
  }

  /** Pestaña "Perfil" de la barra de abajo (docente y estudiante). */
  async abrirPerfil() {
    await visible(this.page.getByRole('tab', { name: 'Perfil' })).click();
    await this.page.waitForURL('**/perfil');
    return new Perfil(this.page);
  }

  async reportarFalla() {
    await this.texto('Reportar falla de equipo').click();
    return new Escaner(this.page).esperar();
  }

  solicitudActiva() {
    return this.texto('Tu solicitud activa');
  }
}

/** Pantalla "10 - Perfil": muestra quién es y si es docente o estudiante; aquí se cierra sesión. */
class Perfil extends Pantalla {
  async cerrarSesion() {
    await this.boton('Cerrar sesión').click();
    return new InicioSesion(this.page).esperar();
  }
}

/** Pantalla "3a - Escanear QR del equipo". */
class Escaner extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/escanear**');
    return this;
  }

  camaraActiva() {
    return this.texto('Cámara activa: acerca el QR al recuadro.');
  }

  /** Sube la foto/PNG de un QR (la opción para computadores sin cámara). */
  async subirFotoDelQr(ruta) {
    await this.page.getByTestId('subir-qr').setInputFiles(ruta);
  }

  equipoDetectado(codigo) {
    return this.contiene(`Placa ${codigo}`);
  }

  /** Abre "¿Qué le pasa?" para el equipo leído. */
  async reportarFallaDelEquipo() {
    await this.boton('Reportar falla de este equipo').click();
    return new ReportarFalla(this.page).esperar();
  }

  async reservarEquipoParaEsteSalon() {
    await this.texto('Reservar un equipo para este salón').click();
    return new Prestamo(this.page).esperar();
  }

  error(texto) {
    return this.contiene(texto);
  }
}

/** "¿Qué le pasa al equipo?": el paso entre escanear y enviar. Las opciones dependen del equipo. */
class ReportarFalla extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/falla**');
    await this.contiene('¿Qué le pasa al').waitFor();
    return this;
  }

  opcion(texto) {
    return this.texto(texto);
  }

  async elegir(problema) {
    await this.opcion(problema).click();
    return this;
  }

  async describir(texto) {
    await visible(this.page.getByPlaceholder(/Ej:/)).fill(texto);
    return this;
  }

  async enviar() {
    await this.boton('Enviar reporte').click();
    return new Confirmacion(this.page).esperar();
  }
}

/** Pantalla "3c - Préstamo: configuración". */
class Prestamo extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/prestamo**');
    return this;
  }

  salonElegido(texto) {
    return this.texto(texto);
  }

  async enviar() {
    await this.boton('Enviar solicitud').click();
    return new Confirmacion(this.page).esperar();
  }
}

/** Pantalla "7 - Confirmación de envío". */
class Confirmacion extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/confirmacion**');
    await this.texto('¡Solicitud enviada!').waitFor();
    return this;
  }

  async numero() {
    return new URL(this.page.url()).searchParams.get('id');
  }

  async verSeguimiento() {
    await this.boton('Ver seguimiento').click();
    await this.page.waitForURL('**/seguimiento/**');
    return new Seguimiento(this.page);
  }
}

/** Pantalla "4 - Seguimiento en tiempo real". */
class Seguimiento extends Pantalla {
  estado(titulo) {
    return this.texto(titulo);
  }
}

/** Pantalla "5 - Vista del técnico". */
class VistaTecnico extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/tecnico');
    await this.texto('Mis solicitudes de hoy').waitFor();
    return this;
  }

  solicitud(titulo) {
    return this.texto(titulo);
  }

  async aceptar() {
    await this.boton('Aceptar solicitud').click();
  }

  /** En la vista del técnico la flecha de arriba cierra sesión. */
  async cerrarSesion() {
    await this.boton('Cerrar sesión').click();
    return new InicioSesion(this.page).esperar();
  }
}

/** Pantalla "6 - Panel del coordinador". */
class VistaCoordinador extends Pantalla {
  async esperar() {
    await this.page.waitForURL('**/coordinador');
    await this.texto('Panel del coordinador').waitFor();
    return this;
  }

  async cerrarSesion() {
    await this.boton('Cerrar sesión').click();
    return new InicioSesion(this.page).esperar();
  }
}

module.exports = { InicioSesion, Inicio, Perfil, Escaner, ReportarFalla, Prestamo, Confirmacion, Seguimiento, VistaTecnico, VistaCoordinador };
