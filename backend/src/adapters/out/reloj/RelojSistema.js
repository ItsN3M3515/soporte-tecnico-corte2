/** Adaptador del puerto Reloj con la hora real del sistema. */
class RelojSistema {
  ahora() {
    return Date.now();
  }
}

module.exports = { RelojSistema };
