package busqueda;

import java.util.List;
import java.util.Map;

public class MapaCercania {

    private final Map<String, List<String>> cercania;

    public MapaCercania(Map<String, List<String>> cercania) {
        this.cercania = cercania;
    }

    public List<String> edificiosCercanosA(String edificio) {
        return cercania.getOrDefault(edificio, List.of());
    }
}