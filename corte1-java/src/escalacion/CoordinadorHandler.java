package escalacion;

import modelo.EstadoSolicitud;
import modelo.Solicitud;

public class CoordinadorHandler extends EscalacionHandler {

    @Override
    public void manejar(Solicitud solicitud) {
        solicitud.setEstado(EstadoSolicitud.ESCALADA);

        System.out.println("[Escalación] " + solicitud.getId()
                + " escalada al coordinador.");
    }
}