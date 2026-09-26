package tecnicos;

import modelo.Solicitud;

public class Asignado implements EstadoTecnico {

    @Override
    public void asignar(Tecnico tecnico, Solicitud solicitud) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya tiene una solicitud asignada.");
    }

    @Override
    public void aceptar(Tecnico tecnico) {
        tecnico.cambiarEstado(new EnCamino());
    }

    @Override
    public void confirmarLlegada(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " debe aceptar la solicitud antes de confirmar llegada.");
    }

    @Override
    public void finalizar(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " aún no está atendiendo la solicitud.");
    }

    @Override
    public void cancelarAsignacion(Tecnico tecnico) {
        tecnico.setSolicitudActual(null);
        tecnico.cambiarEstado(new Disponible());
    }

    @Override
    public boolean estaDisponible() {
        return false;
    }

    @Override
    public boolean estaEsperandoRespuesta() {
        return true;
    }

    @Override
    public String nombre() {
        return "ASIGNADO";
    }
}