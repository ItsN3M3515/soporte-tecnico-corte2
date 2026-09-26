package busqueda;

import java.util.List;
import tecnicos.Tecnico;

public class FallbackDecorator implements BusquedaTecnico {

    private final BusquedaTecnico busquedaBase;
    private final MapaCercania mapaCercania;

    public FallbackDecorator(
            BusquedaTecnico busquedaBase,
            MapaCercania mapaCercania) {

        this.busquedaBase = busquedaBase;
        this.mapaCercania = mapaCercania;
    }

    @Override
    public Tecnico buscarTecnico(
            String edificio,
            List<Tecnico> tecnicos) {

        Tecnico tecnico =
                busquedaBase.buscarTecnico(edificio, tecnicos);

        if (tecnico != null) {
            return tecnico;
        }

        for (String edificioCercano
                : mapaCercania.edificiosCercanosA(edificio)) {

            tecnico = busquedaBase.buscarTecnico(
                    edificioCercano,
                    tecnicos
            );

            if (tecnico != null) {
                return tecnico;
            }
        }

        return null;
    }
}