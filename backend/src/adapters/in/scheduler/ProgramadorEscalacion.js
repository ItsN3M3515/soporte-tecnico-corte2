/**
 * Adaptador de ENTRADA dirigido por tiempo: cada `intervaloMs` invoca el caso
 * de uso EscalarVencidas. Es el "ProgramadorEscalacion" que el Corte 1 dejó
 * como extensión futura. Corte 2: en el mismo ciclo activa las solicitudes
 * agendadas cuya hora se acerca (ActivarProgramadas), si se le pasa.
 */
class ProgramadorEscalacion {
  constructor(escalarVencidas, { intervaloMs = 30000, log = console, activarProgramadas = null } = {}) {
    this.escalarVencidas = escalarVencidas;
    this.activarProgramadas = activarProgramadas;
    this.intervaloMs = intervaloMs;
    this.log = log;
    this.temporizador = null;
  }

  iniciar() {
    this.temporizador = setInterval(() => this.tick(), this.intervaloMs);
    this.temporizador.unref();
  }

  tick() {
    try {
      const activadas = this.activarProgramadas ? this.activarProgramadas.ejecutar() : [];
      if (activadas.length) this.log.info?.(`[agenda] ${JSON.stringify(activadas)}`);
      const resultado = this.escalarVencidas.ejecutar();
      if (resultado.length) this.log.info?.(`[escalación] ${JSON.stringify(resultado)}`);
      return resultado;
    } catch (error) {
      this.log.error?.('[escalación] falló el ciclo', error);
      return [];
    }
  }

  detener() {
    clearInterval(this.temporizador);
  }
}

module.exports = { ProgramadorEscalacion };
