package modelo;

import tecnicos.Tecnico;

/**
 * Representa una solicitud de soporte técnico creada desde un salón.
 * Es el objeto central que fluye a través de la asignación y la escalación.
 */
public class Solicitud {

    private final String id;
    private final String salon;
    private final String edificio;
    private final TipoSolicitud tipo;
    private EstadoSolicitud estado;
    private Tecnico tecnicoAsignado;

    public Solicitud(String id, String salon, String edificio, TipoSolicitud tipo) {
        this.id = id;
        this.salon = salon;
        this.edificio = edificio;
        this.tipo = tipo;
        this.estado = EstadoSolicitud.PENDIENTE;
    }

    public String getId() {
        return id;
    }

    public String getSalon() {
        return salon;
    }

    public String getEdificio() {
        return edificio;
    }

    public TipoSolicitud getTipo() {
        return tipo;
    }

    public EstadoSolicitud getEstado() {
        return estado;
    }

    public void setEstado(EstadoSolicitud estado) {
        this.estado = estado;
    }

    public Tecnico getTecnicoAsignado() {
        return tecnicoAsignado;
    }

    public void setTecnicoAsignado(Tecnico tecnicoAsignado) {
        this.tecnicoAsignado = tecnicoAsignado;
    }

    @Override
    public String toString() {
        return String.format("Solicitud[%s] %s - %s (%s) -> %s",
                id, salon, tipo, estado,
                tecnicoAsignado == null ? "sin asignar" : tecnicoAsignado.getNombre());
    }
}
