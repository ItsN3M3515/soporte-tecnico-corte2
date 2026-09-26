package tecnicos;

import modelo.EstadoSolicitud;
import modelo.Solicitud;

public class Ocupado implements EstadoTecnico {

    @Override
    public void asignar(Tecnico tecnico, Solicitud solicitud) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya está atendiendo una solicitud.");
    }

    @Override
    public void aceptar(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya está atendiendo una solicitud.");
    }

    @Override
    public void confirmarLlegada(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya confirmó su llegada.");
    }

    @Override
    public void finalizar(Tecnico tecnico) {
        Solicitud solicitud = tecnico.getSolicitudActual();

        if (solicitud != null) {
            solicitud.setEstado(EstadoSolicitud.RESUELTA);
        }

        tecnico.setSolicitudActual(null);
        tecnico.cambiarEstado(new Disponible());
    }

    @Override
    public void cancelarAsignacion(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya está atendiendo la solicitud.");
    }

    @Override
    public boolean estaDisponible() {
        return false;
    }

    @Override
    public boolean estaEsperandoRespuesta() {
        return false;
    }

    @Override
    public String nombre() {
        return "OCUPADO";
    }
}