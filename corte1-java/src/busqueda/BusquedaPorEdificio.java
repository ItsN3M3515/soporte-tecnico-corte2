package busqueda;

import java.util.List;
import tecnicos.Tecnico;

/**
 * Componente base (Decorator): busca un técnico disponible únicamente
 * dentro del edificio de origen de la solicitud.
 */
public class BusquedaPorEdificio implements BusquedaTecnico {

    @Override
    public Tecnico buscarTecnico(String edificio, List<Tecnico> tecnicos) {
        for (Tecnico tecnico : tecnicos) {
            if (tecnico.getEdificioBase().equals(edificio) && tecnico.estaDisponible()) {
                return tecnico;
            }
        }
        return null;
    }
}
