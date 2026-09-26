package escalacion;

import modelo.Solicitud;
import tecnicos.Tecnico;

public class TecnicoAsignadoHandler extends EscalacionHandler {

    private final int tiempoLimiteMinutos;

    public TecnicoAsignadoHandler(int tiempoLimiteMinutos) {
        this.tiempoLimiteMinutos = tiempoLimiteMinutos;
    }

    @Override
    public void manejar(Solicitud solicitud) {
        Tecnico tecnico = solicitud.getTecnicoAsignado();

        if (tecnico != null && !tecnico.estaEsperandoRespuesta()) {
            System.out.println("[Escalación] " + solicitud.getId()
                    + " ya fue atendida por " + tecnico.getNombre());
            return;
        }

        if (tecnico != null) {
            System.out.println("[Escalación] " + solicitud.getId()
                    + ": " + tecnico.getNombre()
                    + " no respondió en " + tiempoLimiteMinutos + " min.");
        } else {
            System.out.println("[Escalación] " + solicitud.getId()
                    + " no tiene técnico asignado.");
        }

        if (siguiente != null) {
            siguiente.manejar(solicitud);
        }
    }
}