package tecnicos;

import modelo.Solicitud;

public interface EstadoTecnico {

    void asignar(Tecnico tecnico, Solicitud solicitud);

    void aceptar(Tecnico tecnico);

    void confirmarLlegada(Tecnico tecnico);

    void finalizar(Tecnico tecnico);

    void cancelarAsignacion(Tecnico tecnico);

    boolean estaDisponible();

    boolean estaEsperandoRespuesta();

    String nombre();
}