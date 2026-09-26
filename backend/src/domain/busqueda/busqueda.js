/**
 * Búsqueda de técnico (viene del Corte 1).
 *  - BusquedaPorEdificio: estrategia base, técnico disponible en el mismo edificio.
 *  - FallbackCercaniaDecorator (patrón Decorator, estructural): si la base no
 *    encuentra a nadie, prueba en los edificios cercanos en orden de cercanía.
 *
 * Reto multisede: TODA búsqueda se restringe a la sede de la solicitud. Un técnico
 * de otra sede nunca aparece como candidato (no tiene sentido cruzar la ciudad).
 */
const mismaSedeYDisponible = (solicitud) => (t) => t.sede === solicitud.sede && t.estaDisponible();

class BusquedaPorEdificio {
  buscarTecnico(solicitud, tecnicos, edificio = solicitud.edificio) {
    return tecnicos.filter(mismaSedeYDisponible(solicitud)).find((t) => t.edificioBase === edificio) ?? null;
  }
}

class MapaCercania {
  /** @param {Record<string, string[]>} cercania edificio → edificios cercanos, del más cercano al más lejano */
  constructor(cercania = {}) {
    // Map: un edificio llamado "constructor" o "__proto__" no hereda nada del prototipo.
    this.cercania = new Map(Object.entries(cercania));
  }

  edificiosCercanosA(edificio) {
    return this.cercania.get(edificio) ?? [];
  }
}

class FallbackCercaniaDecorator {
  constructor(busquedaBase, mapaCercania) {
    this.busquedaBase = busquedaBase;
    this.mapaCercania = mapaCercania;
  }

  buscarTecnico(solicitud, tecnicos) {
    const local = this.busquedaBase.buscarTecnico(solicitud, tecnicos);
    if (local) return local;
    for (const edificio of this.mapaCercania.edificiosCercanosA(solicitud.edificio)) {
      const cercano = this.busquedaBase.buscarTecnico(solicitud, tecnicos, edificio);
      if (cercano) return cercano;
    }
    return null;
  }
}

/**
 * Segundo decorador: si ni el edificio ni los cercanos tienen a nadie, toma
 * cualquier técnico disponible de la MISMA sede. Evita que un edificio sin
 * carrito ni vecinos se quede sin atención mientras hay gente libre en la sede.
 */
class CualquieraDeLaSedeDecorator {
  constructor(busquedaBase) {
    this.busquedaBase = busquedaBase;
  }

  buscarTecnico(solicitud, tecnicos) {
    return this.busquedaBase.buscarTecnico(solicitud, tecnicos) ?? tecnicos.find(mismaSedeYDisponible(solicitud)) ?? null;
  }
}

module.exports = { BusquedaPorEdificio, MapaCercania, FallbackCercaniaDecorator, CualquieraDeLaSedeDecorator };
