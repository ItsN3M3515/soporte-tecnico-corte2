package escalacion;

import asignacion.GestorAsignaciones;
import busqueda.BusquedaTecnico;
import modelo.Solicitud;

public class TecnicoCercanoHandler extends EscalacionHandler {

    private final GestorAsignaciones gestorAsignaciones;
    private final BusquedaTecnico estrategiaBusqueda;

    public TecnicoCercanoHandler(
            GestorAsignaciones gestorAsignaciones,
            BusquedaTecnico estrategiaBusqueda) {

        this.gestorAsignaciones = gestorAsignaciones;
        this.estrategiaBusqueda = estrategiaBusqueda;
    }

    @Override
    public void manejar(Solicitud solicitud) {
        boolean reasignada = gestorAsignaciones.reasignar(
                solicitud,
                estrategiaBusqueda
        );

        if (reasignada) {
            System.out.println("[Escalación] " + solicitud.getId()
                    + " reasignada a "
                    + solicitud.getTecnicoAsignado().getNombre());
            return;
        }

        System.out.println("[Escalación] " + solicitud.getId()
                + " sin otro técnico disponible. Escalando al coordinador.");

        if (siguiente != null) {
            siguiente.manejar(solicitud);
        }
    }
}