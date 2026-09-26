package escalacion;

import modelo.Solicitud;

/**
 * Patrón Chain of Responsibility.
 * Cada eslabón decide si puede resolver la solicitud no atendida o si
 * debe pasarla al siguiente. Ningún eslabón necesita conocer la cadena
 * completa, y ninguna solicitud queda huérfana sin que algún eslabón
 * haya intentado atenderla.
 */
public abstract class EscalacionHandler {

    protected EscalacionHandler siguiente;

    public EscalacionHandler setSiguiente(EscalacionHandler siguiente) {
        this.siguiente = siguiente;
        return siguiente;
    }

    public abstract void manejar(Solicitud solicitud);
}
