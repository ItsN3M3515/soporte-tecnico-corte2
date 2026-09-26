package busqueda;

import java.util.List;
import tecnicos.Tecnico;

/**
 * Interfaz común entre el componente base y sus decoradores.
 * Permite envolver la estrategia de búsqueda con capas adicionales
 * de comportamiento sin modificar la lógica base.
 */
public interface BusquedaTecnico {
    Tecnico buscarTecnico(String edificio, List<Tecnico> tecnicos);
}
