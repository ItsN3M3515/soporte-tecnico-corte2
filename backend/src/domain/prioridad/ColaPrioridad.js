/* eslint-disable security/detect-object-injection -- los índices del montículo son enteros calculados internamente, no datos externos */
/**
 * Cola de prioridades (montículo binario / max-heap) de solicitudes pendientes.
 *
 * Orden: mayor prioridad primero; si empatan, la más antigua primero (FIFO);
 * si también empatan, por id para que el resultado sea determinista.
 *
 * La prioridad se "congela" al momento de encolar con la política recibida.
 * Como el aging cambia con el tiempo, el caso de uso reconstruye la cola cada
 * vez que necesita el siguiente elemento (las colas por sede son pequeñas).
 */
class ColaPrioridad {
  constructor(politica, ahora) {
    this.politica = politica;
    this.ahora = ahora;
    this.monticulo = [];
  }

  static desde(solicitudes, politica, ahora) {
    const cola = new ColaPrioridad(politica, ahora);
    solicitudes.forEach((s) => cola.encolar(s));
    return cola;
  }

  get tamano() {
    return this.monticulo.length;
  }

  estaVacia() {
    return this.monticulo.length === 0;
  }

  encolar(solicitud) {
    const nodo = { solicitud, prioridad: this.politica.calcular(solicitud, this.ahora) };
    this.monticulo.push(nodo);
    this.#subir(this.monticulo.length - 1);
  }

  verSiguiente() {
    return this.monticulo[0]?.solicitud ?? null;
  }

  desencolar() {
    if (this.estaVacia()) return null;
    const tope = this.monticulo[0];
    const ultimo = this.monticulo.pop();
    if (!this.estaVacia()) {
      this.monticulo[0] = ultimo;
      this.#bajar(0);
    }
    return tope.solicitud;
  }

  /**
   * Devuelve los primeros `limite` elementos en orden, sin modificar la cola (para las pantallas).
   * Con límite k el costo es O(k log n) en vez de ordenar toda la cola (ver análisis de carga).
   */
  aListaOrdenada(limite = Infinity) {
    const copia = ColaPrioridad.desde([], this.politica, this.ahora);
    copia.monticulo = [...this.monticulo];
    const lista = [];
    while (!copia.estaVacia() && lista.length < limite) {
      const prioridad = copia.monticulo[0].prioridad;
      lista.push({ solicitud: copia.desencolar(), prioridad });
    }
    return lista;
  }

  #vaAntes(a, b) {
    if (a.prioridad !== b.prioridad) return a.prioridad > b.prioridad;
    if (a.solicitud.creadaEn !== b.solicitud.creadaEn) return a.solicitud.creadaEn < b.solicitud.creadaEn;
    return String(a.solicitud.id) < String(b.solicitud.id);
  }

  #subir(i) {
    while (i > 0) {
      const padre = Math.floor((i - 1) / 2);
      if (!this.#vaAntes(this.monticulo[i], this.monticulo[padre])) break;
      [this.monticulo[i], this.monticulo[padre]] = [this.monticulo[padre], this.monticulo[i]];
      i = padre;
    }
  }

  #bajar(i) {
    const n = this.monticulo.length;
    for (;;) {
      const izq = 2 * i + 1;
      const der = izq + 1;
      let mejor = i;
      if (izq < n && this.#vaAntes(this.monticulo[izq], this.monticulo[mejor])) mejor = izq;
      if (der < n && this.#vaAntes(this.monticulo[der], this.monticulo[mejor])) mejor = der;
      if (mejor === i) break;
      [this.monticulo[i], this.monticulo[mejor]] = [this.monticulo[mejor], this.monticulo[i]];
      i = mejor;
    }
  }
}

module.exports = { ColaPrioridad };
