package tecnicos;

import modelo.EstadoSolicitud;
import modelo.Solicitud;

public class Disponible implements EstadoTecnico {

    @Override
    public void asignar(Tecnico tecnico, Solicitud solicitud) {
        solicitud.setEstado(EstadoSolicitud.ASIGNADA);
        tecnico.setSolicitudActual(solicitud);
        tecnico.cambiarEstado(new Asignado());
    }

    @Override
    public void aceptar(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " no tiene una solicitud asignada para aceptar.");
    }

    @Override
    public void confirmarLlegada(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " no puede confirmar llegada: no tiene una solicitud asignada.");
    }

    @Override
    public void finalizar(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " no puede finalizar: no está atendiendo ninguna solicitud.");
    }

    @Override
    public void cancelarAsignacion(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " no tiene una asignación pendiente.");
    }

    @Override
    public boolean estaDisponible() {
        return true;
    }

    @Override
    public boolean estaEsperandoRespuesta() {
        return false;
    }

    @Override
    public String nombre() {
        return "DISPONIBLE";
    }
}