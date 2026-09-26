const request = require('supertest');
const { crearContenedor } = require('../../src/config/contenedor');
const { sembrar } = require('../../src/config/datosIniciales');
const { crearApp } = require('../../src/adapters/in/http/app');
const { PublicadorSocketIO } = require('../../src/adapters/out/realtime/PublicadorSocketIO');

/**
 * Arma el sistema REAL (mismos adaptadores que producción) sobre una BD SQLite
 * en memoria nueva para cada prueba: aisladas entre sí y sin depender del orden.
 * Solo el reloj puede reemplazarse para controlar el tiempo.
 */
class RelojControlable {
  constructor() {
    this.t = Date.UTC(2026, 8, 22, 13, 0, 0);
  }

  ahora() {
    return this.t;
  }

  avanzarMinutos(m) {
    this.t += m * 60000;
  }
}

const CLAVES = { admin: 'admin123', docente: 'docente123', 'docente.norte': 'docente123', estudiante: 'estudiante123', laura: 'tecnico123', miguel: 'tecnico123', sofia: 'tecnico123', andres: 'tecnico123' };

function crearEntorno() {
  const reloj = new RelojControlable();
  const contenedor = crearContenedor({ rutaBd: ':memory:', secretoJwt: 'secreto-pruebas', reloj, publicador: new PublicadorSocketIO(), log: { error() {}, info() {} } });
  sembrar(contenedor);
  const app = crearApp(contenedor);
  const api = request(app);
  const tokens = {};

  const login = async (usuario) => {
    if (!tokens[usuario]) {
      const res = await api.post('/api/auth/login').send({ usuario, clave: CLAVES[usuario] }).expect(200);
      tokens[usuario] = res.body.token;
    }
    return tokens[usuario];
  };

  // Primero se obtiene el token y DESPUÉS se construye la petición (supertest abre el servidor al crearla).
  const como = (usuario) => ({
    get: async (url) => {
      const token = await login(usuario);
      return api.get(url).set('Authorization', `Bearer ${token}`);
    },
    post: async (url, body) => {
      const token = await login(usuario);
      return api.post(url).set('Authorization', `Bearer ${token}`).send(body);
    },
  });

  const pedir = (codigo, extra = {}, usuario = 'docente') =>
    como(usuario).post('/api/solicitudes', { qr: `SOPORTE:v1:${codigo}`, tipo: 'FALLA_EQUIPO_FIJO', claseEnCurso: true, ...extra });

  return { app, api, contenedor, reloj, login, como, pedir };
}

module.exports = { crearEntorno };
