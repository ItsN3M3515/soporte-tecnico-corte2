package asignacion;

import busqueda.BusquedaTecnico;
import java.util.ArrayList;
import java.util.List;
import modelo.Solicitud;
import tecnicos.Tecnico;

public class GestorAsignaciones {

    private static GestorAsignaciones instancia;

    private final List<Tecnico> tecnicos = new ArrayList<>();

    private GestorAsignaciones() {
    }

    public static synchronized GestorAsignaciones getInstance() {
        if (instancia == null) {
            instancia = new GestorAsignaciones();
        }
        return instancia;
    }

    public synchronized void registrarTecnico(Tecnico tecnico) {
        tecnicos.add(tecnico);
    }

    public synchronized List<Tecnico> getTecnicos() {
        return List.copyOf(tecnicos);
    }

    public synchronized boolean asignar(
            Solicitud solicitud,
            BusquedaTecnico estrategiaBusqueda) {

        Tecnico tecnico = estrategiaBusqueda.buscarTecnico(
                solicitud.getEdificio(),
                tecnicos
        );

        if (tecnico == null) {
            return false;
        }

        tecnico.asignar(solicitud);
        solicitud.setTecnicoAsignado(tecnico);

        return true;
    }

    public synchronized void liberarAsignacion(Solicitud solicitud) {
        Tecnico tecnico = solicitud.getTecnicoAsignado();

        if (tecnico == null) {
            return;
        }

        if (tecnico.estaEsperandoRespuesta()) {
            tecnico.cancelarAsignacion();
            solicitud.setTecnicoAsignado(null);
        }
    }

    public synchronized boolean reasignar(
        Solicitud solicitud,
        BusquedaTecnico estrategiaBusqueda) {

    Tecnico tecnicoAnterior = solicitud.getTecnicoAsignado();

    if (tecnicoAnterior != null) {
        if (!tecnicoAnterior.estaEsperandoRespuesta()) {
            return false;
        }

        tecnicoAnterior.cancelarAsignacion();
        solicitud.setTecnicoAsignado(null);
    }

    List<Tecnico> candidatos = tecnicos.stream()
            .filter(tecnico -> tecnico != tecnicoAnterior)
            .toList();

    Tecnico nuevoTecnico = estrategiaBusqueda.buscarTecnico(
            solicitud.getEdificio(),
            candidatos
    );

    if (nuevoTecnico == null) {
        return false;
    }

    nuevoTecnico.asignar(solicitud);
    solicitud.setTecnicoAsignado(nuevoTecnico);

    return true;
}
}