const { AccesoDenegado, DatoInvalido } = require('../domain/errores');

/** Caso de uso: iniciar sesión y obtener un token con el rol (DOCENTE, ESTUDIANTE, TECNICO, ADMIN). */
class Autenticar {
  constructor({ repoUsuarios, credenciales }) {
    this.repoUsuarios = repoUsuarios;
    this.credenciales = credenciales;
  }

  ejecutar({ usuario, clave }) {
    if (!usuario || !clave) throw new DatoInvalido('Usuario y clave son obligatorios.');
    const encontrado = this.repoUsuarios.buscarPorUsuario(String(usuario).toLowerCase().trim());
    if (!encontrado || !this.credenciales.verificarClave(clave, encontrado.hashClave)) {
      throw new AccesoDenegado('Usuario o clave incorrectos.');
    }
    const perfil = {
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
      rol: encontrado.rol,
      sede: encontrado.sede,
      tecnicoId: encontrado.tecnicoId ?? null,
      correo: encontrado.correo ?? null,
    };
    return { token: this.credenciales.emitirToken(perfil), perfil };
  }
}

module.exports = { Autenticar };
