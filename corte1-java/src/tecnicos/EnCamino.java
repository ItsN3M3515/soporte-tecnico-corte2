package tecnicos;

import modelo.Solicitud;

public class EnCamino implements EstadoTecnico {

    @Override
    public void asignar(Tecnico tecnico, Solicitud solicitud) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya está en camino a otra solicitud.");
    }

    @Override
    public void aceptar(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya aceptó la solicitud.");
    }

    @Override
    public void confirmarLlegada(Tecnico tecnico) {
        tecnico.cambiarEstado(new Ocupado());
    }

    @Override
    public void finalizar(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " debe confirmar su llegada antes de finalizar.");
    }

    @Override
    public void cancelarAsignacion(Tecnico tecnico) {
        throw new IllegalStateException(
                tecnico.getNombre() + " ya aceptó la solicitud y está en camino.");
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
        return "EN_CAMINO";
    }
}