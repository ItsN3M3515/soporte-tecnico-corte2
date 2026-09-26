import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { useDatos } from '@/lib/useDatos';
import { salonTexto } from '@/lib/formato';
import type { DemandaSede, ResumenHoy, Solicitud, Tecnico } from '@/lib/tipos';
import { Aviso, BotonPrimario, Cuerpo, Degradado, Encabezado, Fila, Hoja, Insignia, Pantalla, T, Tarjeta, TextoDegradado } from '@/ui/componentes';
import type { NombreG } from '@/ui/tema';
import { C, SOMBRA } from '@/ui/tema';

/**
 * Pantalla "6 - Panel del coordinador" (reto "Enfoque administrativo").
 * Debajo de lo que trae el prototipo se agregó "Demanda por sede" (reto "Multisede").
 */
export default function Coordinador() {
  const { token, perfil, cerrar, pedir, rutaInicio } = useSesion();
  const { datos: resumen } = useDatos<ResumenHoy>('/admin/resumen');
  const { datos: escaladas, recargar } = useDatos<Solicitud[]>('/admin/escaladas');
  const { datos: demanda } = useDatos<DemandaSede[]>('/admin/demanda');
  const { datos: tecnicos, recargar: recargarTecnicos } = useDatos<Tecnico[]>('/admin/tecnicos');
  const [elegida, setElegida] = useState<Solicitud | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asignando, setAsignando] = useState<string | null>(null);
  if (!token || !perfil) return <Redirect href="/" />;
  // Otra cuenta que llegue aquí (p. ej. escribiendo la dirección) vuelve a SU pantalla de inicio.
  if (perfil.rol !== 'ADMIN') return <Redirect href={rutaInicio(perfil.rol)} />;

  const asignar = async (tecnicoId: string) => {
    if (!elegida) return;
    setAsignando(tecnicoId);
    setError(null);
    try {
      await pedir(`/admin/solicitudes/${elegida.id}/asignar`, { metodo: 'POST', cuerpo: { tecnicoId } });
      setElegida(null);
      await Promise.all([recargar(), recargarTecnicos()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAsignando(null);
    }
  };

  const disponibles = (tecnicos ?? []).filter((t) => t.estado === 'DISPONIBLE');
  const prom = resumen?.minutosPromedioResolucion;

  return (
    <Pantalla>
      <Encabezado
        etiquetaAtras="Cerrar sesión"
        titulo="Panel del coordinador"
        onAtras={() => {
          cerrar();
          router.replace('/');
        }}
      />
      <Cuerpo gap={22}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Dato valor={resumen?.escaladasHoy ?? '–'} texto="Escaladas hoy" g="rojo" />
          <Dato valor={resumen?.resueltasHoy ?? '–'} texto="Resueltas hoy" g="verde" />
          <Dato valor={prom === null || prom === undefined ? '–' : `${Math.round(prom)}m`} texto="Tiempo prom." g="morado" />
        </View>

        <T peso="extra" tam={17}>
          Solicitudes escaladas
        </T>
        {escaladas?.length === 0 && (
          <T tam={12.5} color={C.textoSuave}>
            No hay solicitudes escaladas. Todo va a tiempo.
          </T>
        )}
        {escaladas?.map((s) => (
          <Tarjeta key={s.id} opacidad={0.88} radio={20} borde={C.rojoBorde} bordeAncho={1.5} sombra="0px 8px 20px rgba(89,102,153,0.10)" style={est.escalada}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T peso="negrita" tam={14.5}>
                #{s.id}
              </T>
              <Insignia texto="ESCALADA" g="rojo" tam={9.5} />
            </View>
            <T peso="negrita" tam={13.5}>
              {s.titulo}
              {s.codigoEquipo ? ` · ${s.codigoEquipo}` : ''}
            </T>
            {s.tipo === 'FALLA_EQUIPO_FIJO' && s.detalle && (
              <T tam={12.5} color={C.texto}>
                {s.detalle}
              </T>
            )}
            <T tam={12} color={C.textoSuave}>
              {salonTexto(s.salon)}, {s.edificio} · sede {s.sede}
            </T>
            <T peso="medio" tam={11.5} color={C.rojo}>
              {s.motivoEscalacion ?? 'Escalada al coordinador'}
              {s.minutosEsperando ? ` · espera ${s.minutosEsperando} min` : ''}
            </T>
            <BotonPrimario texto="Asignar manualmente" onPress={() => setElegida(s)} alto={39} radio={14} tam={12.5} sombra={false} />
          </Tarjeta>
        ))}

        <T peso="extra" tam={17}>
          Demanda por sede
        </T>
        {demanda?.map((d) => (
          <Tarjeta key={d.sede} opacidad={0.8} radio={20} sombra={SOMBRA.tarjetaSuave} style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T peso="negrita" tam={14.5}>
                Sede {d.sede === 'CAMPUS' ? 'Campus' : d.sede === 'NORTE' ? 'Norte' : d.sede}
              </T>
              {d.deficitTecnicos > 0 ? <Insignia texto={`FALTAN ${d.deficitTecnicos}`} g="rojo" /> : <Insignia texto="CUBIERTA" g="verde" />}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Mini valor={d.enCola} texto="En cola" />
              <Mini valor={d.enAtencion} texto="Atendiendo" />
              <Mini valor={`${d.tecnicosDisponibles}/${d.tecnicosTotal}`} texto="Técnicos libres" />
            </View>
            {d.demandaPorEdificio[0] && (
              <T tam={12} color={C.textoSuave}>
                Más pedidos (24 h): {d.demandaPorEdificio.slice(0, 3).map((e) => `${e.edificio} (${e.total})`).join(', ')}
              </T>
            )}
          </Tarjeta>
        ))}
      </Cuerpo>

      <Hoja visible={!!elegida} onCerrar={() => setElegida(null)} titulo={`Asignar #${elegida?.id ?? ''}`}>
        <T tam={12.5} color={C.textoSuave}>
          Técnicos disponibles de todas las sedes. Si eliges uno de otra sede, se le avisa a ambas.
        </T>
        <Aviso texto={error} />
        {disponibles.length === 0 && <Aviso tipo="info" texto="Ahora no hay técnicos disponibles. Apenas uno termine, la solicitud se le asigna sola." />}
        {disponibles.map((t) => (
          <Fila
            key={t.id}
            tamIcono={40}
            icono={
              <Degradado g="morado" style={est.avatar}>
                <T peso="negrita" tam={15} color={C.blanco}>
                  {t.nombre[0]}
                </T>
              </Degradado>
            }
            titulo={t.nombre}
            subtitulo={`${t.edificioBase} · sede ${t.sede}${elegida && t.sede !== elegida.sede ? ' (otra sede)' : ''}`}
            derecha={asignando === t.id ? <T tam={11}>…</T> : <Insignia texto="ASIGNAR" g="naranja" />}
            onPress={() => asignar(t.id)}
          />
        ))}
      </Hoja>
    </Pantalla>
  );
}

function Dato({ valor, texto, g }: { valor: number | string; texto: string; g: NombreG }) {
  return (
    <Tarjeta opacidad={0.8} radio={18} sombra="0px 8px 16px rgba(89,102,153,0.10)" style={est.dato}>
      <TextoDegradado texto={String(valor)} g={g} tam={23} />
      <T peso="medio" tam={10.5} color={C.textoSuave}>
        {texto}
      </T>
    </Tarjeta>
  );
}

function Mini({ valor, texto }: { valor: number | string; texto: string }) {
  return (
    <View style={est.mini}>
      <T peso="extra" tam={16}>
        {valor}
      </T>
      <T peso="medio" tam={10.5} color={C.textoSuave}>
        {texto}
      </T>
    </View>
  );
}

const est = StyleSheet.create({
  dato: { flex: 1, paddingVertical: 18, paddingHorizontal: 14, gap: 4 },
  escalada: { paddingVertical: 18, paddingHorizontal: 20, gap: 12 },
  mini: { flex: 1, backgroundColor: C.botonSuave, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
