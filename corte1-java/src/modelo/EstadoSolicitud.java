package modelo;

/**
 * Ciclo de vida de una solicitud dentro del módulo de asignación.
 */
public enum EstadoSolicitud {
    PENDIENTE,
    ASIGNADA,
    ESCALADA,
    RESUELTA
}
