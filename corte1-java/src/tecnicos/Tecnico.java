package tecnicos;

import modelo.Solicitud;

public class Tecnico {

    private final String nombre;
    private final String edificioBase;
    private EstadoTecnico estado;
    private Solicitud solicitudActual;

    public Tecnico(String nombre, String edificioBase) {
        this.nombre = nombre;
        this.edificioBase = edificioBase;
        this.estado = new Disponible();
        this.solicitudActual = null;
    }

    void cambiarEstado(EstadoTecnico nuevoEstado) {
        this.estado = nuevoEstado;
    }

    void setSolicitudActual(Solicitud solicitud) {
        this.solicitudActual = solicitud;
    }

    public void asignar(Solicitud solicitud) {
        estado.asignar(this, solicitud);
    }

    public void aceptarSolicitud() {
        estado.aceptar(this);
    }

    public void confirmarLlegada() {
        estado.confirmarLlegada(this);
    }

    public void finalizar() {
        estado.finalizar(this);
    }

    public void cancelarAsignacion() {
        estado.cancelarAsignacion(this);
    }

    public boolean estaDisponible() {
        return estado.estaDisponible();
    }

    public boolean estaEsperandoRespuesta() {
        return estado.estaEsperandoRespuesta();
    }

    public Solicitud getSolicitudActual() {
        return solicitudActual;
    }

    public String getNombre() {
        return nombre;
    }

    public String getEdificioBase() {
        return edificioBase;
    }

    public String getEstadoActual() {
        return estado.nombre();
    }

    @Override
    public String toString() {
        return nombre + " (" + edificioBase + ") - " + estado.nombre();
    }
}