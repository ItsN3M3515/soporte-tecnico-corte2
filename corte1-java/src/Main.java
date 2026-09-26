import asignacion.GestorAsignaciones;
import busqueda.BusquedaPorEdificio;
import busqueda.BusquedaTecnico;
import busqueda.FallbackDecorator;
import busqueda.MapaCercania;
import escalacion.CoordinadorHandler;
import escalacion.EscalacionHandler;
import escalacion.TecnicoAsignadoHandler;
import escalacion.TecnicoCercanoHandler;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;
import modelo.Solicitud;
import modelo.TipoSolicitud;
import tecnicos.Tecnico;

public class Main {

    public static void main(String[] args) throws InterruptedException {

        GestorAsignaciones gestor = GestorAsignaciones.getInstance();

        Tecnico laura = new Tecnico("Laura", "Edificio K");
        Tecnico miguel = new Tecnico("Miguel", "Edificio Ad Portas");
        Tecnico sofia = new Tecnico("Sofía", "Edificio H");

        gestor.registrarTecnico(laura);
        gestor.registrarTecnico(miguel);
        gestor.registrarTecnico(sofia);

        MapaCercania mapaDistancias = new MapaCercania(Map.of(
                "Edificio O", List.of("Edificio K", "Edificio Ad Portas")
        ));

        BusquedaTecnico busquedaLocal = new BusquedaPorEdificio();

        BusquedaTecnico estrategiaBusqueda =
                new FallbackDecorator(busquedaLocal, mapaDistancias);

        EscalacionHandler cadenaEscalacion =
                new TecnicoAsignadoHandler(10);

        cadenaEscalacion
                .setSiguiente(
                        new TecnicoCercanoHandler(
                                gestor,
                                estrategiaBusqueda
                        )
                )
                .setSiguiente(new CoordinadorHandler());

        System.out.println(
                "\n--- Escenario 1: Decorator / fallback por cercanía ---"
        );

        Solicitud solicitud1 = new Solicitud(
                "S-001",
                "301",
                "Edificio O",
                TipoSolicitud.FALLA_EQUIPO_FIJO
        );

        boolean asignada1 =
                gestor.asignar(solicitud1, estrategiaBusqueda);

        System.out.println("Asignada: " + asignada1);
        System.out.println(solicitud1);


        System.out.println(
                "\n--- Escenario 2: asignación concurrente ---"
        );

        Solicitud solicitud2 = new Solicitud(
                "S-002",
                "101",
                "Edificio H",
                TipoSolicitud.PRESTAMO_EQUIPO
        );

        Solicitud solicitud3 = new Solicitud(
                "S-003",
                "102",
                "Edificio H",
                TipoSolicitud.FALLA_EQUIPO_FIJO
        );

        CountDownLatch inicio = new CountDownLatch(1);

        AtomicBoolean resultado2 = new AtomicBoolean();
        AtomicBoolean resultado3 = new AtomicBoolean();

        Thread hilo1 = new Thread(() -> {
            esperar(inicio);
            resultado2.set(
                    gestor.asignar(solicitud2, busquedaLocal)
            );
        });

        Thread hilo2 = new Thread(() -> {
            esperar(inicio);
            resultado3.set(
                    gestor.asignar(solicitud3, busquedaLocal)
            );
        });

        hilo1.start();
        hilo2.start();

        inicio.countDown();

        hilo1.join();
        hilo2.join();

        System.out.println(
                "S-002 asignada: " + resultado2.get()
        );

        System.out.println(
                "S-003 asignada: " + resultado3.get()
        );

        System.out.println(
                "Sofía quedó en estado: "
                        + sofia.getEstadoActual()
        );


        System.out.println(
                "\n--- Escenario 3: patrón State ---"
        );

        System.out.println(
                "Laura después de asignar: "
                        + laura.getEstadoActual()
        );

        try {
            laura.confirmarLlegada();
        } catch (IllegalStateException e) {
            System.out.println(
                    "Transición bloqueada: " + e.getMessage()
            );
        }

        laura.aceptarSolicitud();

        System.out.println(
                "Laura después de aceptar: "
                        + laura.getEstadoActual()
        );

        laura.confirmarLlegada();

        System.out.println(
                "Laura después de llegar: "
                        + laura.getEstadoActual()
        );

        laura.finalizar();

        System.out.println(
                "Laura después de finalizar: "
                        + laura.getEstadoActual()
        );

        System.out.println(
                "Estado de S-001: "
                        + solicitud1.getEstado()
        );


        System.out.println(
                "\n--- Escenario 4: Chain of Responsibility ---"
        );

        Solicitud ocupacionMiguel = new Solicitud(
                "S-AUX",
                "410",
                "Edificio Ad Portas",
                TipoSolicitud.FALLA_EQUIPO_FIJO
        );

        gestor.asignar(
                ocupacionMiguel,
                busquedaLocal
        );

        miguel.aceptarSolicitud();

        Solicitud solicitud4 = new Solicitud(
                "S-004",
                "305",
                "Edificio O",
                TipoSolicitud.PRESTAMO_EQUIPO
        );

        gestor.asignar(
                solicitud4,
                estrategiaBusqueda
        );

        System.out.println(
                "Técnico inicialmente asignado: "
                        + solicitud4
                                .getTecnicoAsignado()
                                .getNombre()
        );

        cadenaEscalacion.manejar(solicitud4);

        System.out.println(
                "Estado final de S-004: "
                        + solicitud4.getEstado()
        );

        System.out.println(
                "Técnico final de S-004: "
                        + (
                        solicitud4.getTecnicoAsignado() == null
                                ? "ninguno"
                                : solicitud4
                                        .getTecnicoAsignado()
                                        .getNombre()
                )
        );
    }

    private static void esperar(
            CountDownLatch inicio
    ) {
        try {
            inicio.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}