import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { Solicitud } from '@/lib/tipos';
import { edificioCorto, fechaRelativa, fechaYHora, pasoSeguimiento, primerNombre, salonTexto, tituloSeguimiento } from '@/lib/formato';
import { Degradado, T, Tarjeta } from './componentes';
import { Icono } from './iconos';
import { C, SOMBRA } from './tema';

/**
 * Contenido de "4 - Seguimiento en tiempo real": StatusCard (4 pasos), TechCard y DetailCard.
 * Lo usan la pantalla /seguimiento/[id] y la pestaña "Estado".
 */
const PASOS = ['Pendiente', 'Asignada', 'En camino', 'Resuelta'];

const COLOR_PUNTO: Record<string, string> = {
  PROGRAMADA: C.lavanda,
  PENDIENTE: C.inactivo,
  ESCALADA: C.rojo,
  ASIGNADA: C.morado,
  EN_ATENCION: C.naranja,
  RESUELTA: C.verde,
};

export function Seguimiento({ s }: { s: Solicitud }) {
  const paso = pasoSeguimiento(s);
  const tecnico = s.tecnico;
  return (
    <View style={{ gap: 22 }}>
      <Tarjeta opacidad={0.85} radio={24} sombra={SOMBRA.estado} style={est.estado}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[est.punto, { backgroundColor: COLOR_PUNTO[s.estado] }]} />
          <T peso="extra" tam={19}>
            {tituloSeguimiento(s)}
          </T>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {PASOS.map((nombre, i) => (
            <Paso key={nombre} numero={i + 1} nombre={nombre} estado={i + 1 < paso || s.estado === 'RESUELTA' ? 'hecho' : i + 1 === paso ? 'actual' : 'pendiente'} />
          ))}
        </View>
        <Nota s={s} />
      </Tarjeta>

      {tecnico && s.estado !== 'RESUELTA' && (
        <Tarjeta opacidad={0.85} radio={20} sombra={SOMBRA.tarjetaSuave} style={est.tecnico}>
          <Degradado g="morado" style={est.avatar}>
            <T peso="negrita" tam={18} color={C.blanco}>
              {tecnico.nombre[0]}
            </T>
          </Degradado>
          <View style={{ flex: 1, gap: 2 }}>
            <T peso="negrita" tam={15.5} lineas={1}>
              {tecnico.nombre}
            </T>
            <T tam={12} color={C.textoSuave} lineas={1}>
              Técnico de soporte · {tecnico.edificioBase}
            </T>
          </View>
          {tecnico.telefono && (
            <Pressable onPress={() => Linking.openURL(`tel:${tecnico.telefono?.replace(/\s/g, '')}`)} accessibilityRole="button" accessibilityLabel={`Llamar a ${primerNombre(tecnico.nombre)}`}>
              <Icono nombre="telefono" />
            </Pressable>
          )}
        </Tarjeta>
      )}

      <Tarjeta opacidad={0.85} radio={20} sombra={SOMBRA.tarjetaSuave} style={{ padding: 20, gap: 14 }}>
        <T peso="negrita" tam={14.5}>
          Detalle de la solicitud
        </T>
        {filasDetalle(s).map(([etiqueta, valor]) => (
          <View key={etiqueta} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
            <T tam={12.5} color={C.textoSuave}>
              {etiqueta}
            </T>
            <T peso="negrita" tam={12.5} style={{ flex: 1, textAlign: 'right' }}>
              {valor}
            </T>
          </View>
        ))}
      </Tarjeta>
    </View>
  );
}

function Paso({ numero, nombre, estado }: { numero: number; nombre: string; estado: 'hecho' | 'actual' | 'pendiente' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      {estado === 'hecho' && (
        <Degradado g="verde" style={est.circulo}>
          <Icono nombre="pasoCheck" />
        </Degradado>
      )}
      {estado === 'actual' && (
        <Degradado g="naranja" style={[est.circulo, { boxShadow: '0px 4px 12px rgba(240,172,78,0.5)' }]}>
          <T peso="negrita" tam={13} color={C.blanco}>
            {numero}
          </T>
        </Degradado>
      )}
      {estado === 'pendiente' && (
        <View style={[est.circulo, { backgroundColor: C.borde }]}>
          <T peso="negrita" tam={13} color={C.inactivo}>
            {numero}
          </T>
        </View>
      )}
      <T peso={estado === 'actual' ? 'negrita' : 'medio'} tam={10.5} color={estado === 'pendiente' ? C.textoSuave : C.texto} alinear="center">
        {nombre}
      </T>
    </View>
  );
}

function Nota({ s }: { s: Solicitud }) {
  let texto: string | null = null;
  if (s.estado === 'PENDIENTE') texto = s.posicionEnCola ? `Estás en la posición ${s.posicionEnCola} de la cola de tu sede.` : 'Buscando un técnico disponible.';
  if (s.estado === 'PROGRAMADA' && s.programadaPara) texto = `Entra a la cola 30 min antes: ${fechaYHora(s.programadaPara)}.`;
  if (s.estado === 'ESCALADA') texto = 'No había técnicos cerca. El coordinador de soporte la asignará.';
  if (!texto) return null;
  return (
    <T tam={12.5} color={C.textoSuave}>
      {texto}
    </T>
  );
}

const RECURSO: Record<string, string> = { PORTATIL: 'PC', EXTENSION: 'Extensión', OTRO: 'Otro recurso' };
const REVISION: Record<string, string> = { GENERAL: 'General', AIRE_ACONDICIONADO: 'A/C', MOBILIARIO: 'Mobiliario' };
const FALLA: Record<string, string> = { TOMA_DANADA: 'Toma dañada', CABLE_EXPUESTO: 'Cable expuesto', SIN_ENERGIA: 'Sin energía' };
const REQ: Record<string, string> = { AUDIO: 'Audio', VIDEO_BEAM_EXTRA: 'Video beam extra', STREAMING: 'Streaming' };

function filasDetalle(s: Solicitud): [string, string][] {
  const d = s.datos as Record<string, any>;
  const filas: [string, string][] = [];
  if (s.codigoEquipo) filas.push(['Equipo', `${s.descripcionEquipo ?? 'Equipo'} · ${s.codigoEquipo}`]);
  if (s.tipo === 'PRESTAMO_EQUIPO') {
    filas.push(['Préstamo', `${d.cantidad ?? 1} × ${RECURSO[d.recurso] ?? d.recurso}`]);
    const extras = [d.requiereInternet && 'Internet', d.requiereSoftware && d.software].filter(Boolean);
    if (extras.length) filas.push(['Configuración', extras.join(' · ')]);
  }
  if (s.tipo === 'MANTENIMIENTO') filas.push(['Revisión', REVISION[d.tipoRevision] ?? d.tipoRevision]);
  if (s.tipo === 'SOPORTE_EVENTO' && d.requerimientos?.length) filas.push(['Requerimientos', d.requerimientos.map((r: string) => REQ[r] ?? r).join(', ')]);
  if (s.tipo === 'FALLA_ELECTRICA') filas.push(['Falla', FALLA[d.tipoFalla] ?? d.tipoFalla]);
  filas.push(['Ubicación', `${salonTexto(s.salon)}, ${edificioCorto(s.edificio)}`]);
  if (s.programadaPara) filas.push(['Para', fechaYHora(s.programadaPara)]);
  if (s.detalle && s.tipo !== 'PRESTAMO_EQUIPO' && s.tipo !== 'SOPORTE_EVENTO') filas.push([s.tipo === 'FALLA_EQUIPO_FIJO' ? 'Problema' : 'Nota', s.detalle]);
  filas.push(['Creada', fechaRelativa(s.creadaEn)]);
  return filas;
}

const est = StyleSheet.create({
  estado: { paddingVertical: 26, paddingHorizontal: 24, gap: 22 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  circulo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tecnico: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
