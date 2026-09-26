/**
 * Errores de dominio. Son clases propias (no dependen de Express ni de la BD)
 * para que el adaptador HTTP decida cómo traducirlos a códigos de estado.
 */
class ErrorDominio extends Error {
  constructor(mensaje, codigo = 'ERROR_DOMINIO') {
    super(mensaje);
    this.name = this.constructor.name;
    this.codigo = codigo;
  }
}

class DatoInvalido extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'DATO_INVALIDO');
  }
}

class NoEncontrado extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'NO_ENCONTRADO');
  }
}

class TransicionInvalida extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'TRANSICION_INVALIDA');
  }
}

class ConflictoConcurrencia extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'CONFLICTO_CONCURRENCIA');
  }
}

class AccesoDenegado extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'ACCESO_DENEGADO');
  }
}

module.exports = {
  ErrorDominio,
  DatoInvalido,
  NoEncontrado,
  TransicionInvalida,
  ConflictoConcurrencia,
  AccesoDenegado,
};
