import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { useDatos } from '@/lib/useDatos';
import { ESTILO_TIPO, salonTexto } from '@/lib/formato';
import type { PanelTecnico, Solicitud } from '@/lib/tipos';
import { Aviso, BotonPrimario, BotonSuave, Cargando, Cuerpo, Encabezado, Insignia, Pantalla, T, Tarjeta } from '@/ui/componentes';
import { Mancha42 } from '@/ui/iconos';
import { C, SOMBRA } from '@/ui/tema';

/**
 * Pantalla "5 - Vista del técnico" (reto "Pantalla del trabajador").
 * Botón principal según el estado (patrón State en el backend):
 * ASIGNADO → Aceptar · EN_CAMINO → Confirmar llegada · OCUPADO → Marcar como resuelta.
 */
const ESTADO_TECNICO = {
  DISPONIBLE: { fondo: '#EEF0FC', punto: C.morado, texto: C.morado },
  ASIGNADO: { fondo: '#FCEBD1', punto: C.naranja, texto: '#9A5B0B' },
  EN_CAMINO: { fondo: C.verdeFondo, punto: C.verde, texto: C.verdeTexto },
  OCUPADO: { fondo: '#ECE6F7', punto: C.violeta, texto: C.violeta },
};

const ACCION = {
  ASIGNADO: { texto: 'Aceptar solicitud', ruta: '/tecnicos/yo/aceptar', insignia: { texto: 'NUEVA', g: 'morado' as const } },
  EN_CAMINO: { texto: 'Confirmar llegada', ruta: '/tecnicos/yo/llegada', insignia: { texto: 'EN CAMINO', g: 'naranja' as const } },
  OCUPADO: { texto: 'Marcar como resuelta', ruta: '/tecnicos/yo/finalizar', insignia: { texto: 'EN EL SALÓN', g: 'verde' as const } },
};

export default function Tecnico() {
  const { token, perfil, pedir, cerrar, rutaInicio } = useSesion();
  const { datos, error, recargar } = useDatos<PanelTecnico>('/tecnicos/yo/panel');
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  if (!token || !perfil) return <Redirect href="/" />;
  // Otra cuenta que llegue aquí (p. ej. escribiendo la dirección) vuelve a SU pantalla de inicio.
  if (perfil.rol !== 'TECNICO') return <Redirect href={rutaInicio(perfil.rol)} />;

  const hacer = async (ruta: string) => {
    setOcupado(true);
    setErrorAccion(null);
    try {
      await pedir(ruta, { metodo: 'POST' });
      await recargar();
    } catch (e) {
      setErrorAccion((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const tecnico = datos?.tecnico;
  const actual = datos?.solicitudActual ?? null;
  const accion = tecnico && tecnico.estado !== 'DISPONIBLE' ? ACCION[tecnico.estado] : null;
  const colores = ESTADO_TECNICO[tecnico?.estado ?? 'DISPONIBLE'];
  const proximas = (datos?.colaSede.items ?? []).filter((s) => s.id !== actual?.id).slice(0, 5);

  return (
    <Pantalla>
      <Encabezado
        etiquetaAtras="Cerrar sesión"
        titulo="Mis solicitudes de hoy"
        onAtras={() => {
          cerrar();
          router.replace('/');
        }}
      />
      <Cuerpo gap={18}>
        <Aviso texto={error} />
        {!datos && !error && <Cargando />}
        {tecnico && (
          <View style={[est.miEstado, { backgroundColor: colores.fondo }]}>
            <View style={[est.punto, { backgroundColor: colores.punto }]} />
            <T peso="negrita" tam={13} color={colores.texto} style={{ flex: 1 }} lineas={1}>
              Tu estado: {textoEstado(tecnico.estado, actual)}
            </T>
          </View>
        )}

        {actual && accion ? (
          <Tarjeta opacidad={0.88} radio={22} sombra="0px 10px 24px rgba(89,102,153,0.12)" style={{ padding: 22, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <T peso="negrita" tam={16} style={{ flex: 1 }} lineas={1}>
                {actual.titulo} · {salonTexto(actual.salon)}
              </T>
              <Insignia texto={accion.insignia.texto} g={accion.insignia.g} tam={9.5} />
            </View>
            <T tam={12.5} color={C.textoSuave}>
              {actual.edificio} · {actual.tipo === 'PRESTAMO_EQUIPO' ? 'Préstamo pedido' : 'Falla reportada'} hace {actual.minutosDesdeCreada ?? 0} min
              {actual.claseEnCurso ? ' · clase en curso' : ''}
            </T>
            {actual.codigoEquipo && (
              <T tam={12} color={C.textoSuave}>
                Placa {actual.codigoEquipo}
              </T>
            )}
            {detalleCorto(actual) && (
              <View style={est.problema}>
                <T peso="negrita" tam={11} color={C.naranja}>
                  {actual.tipo === 'FALLA_EQUIPO_FIJO' ? 'QUÉ LE PASA' : 'DETALLE'}
                </T>
                <T peso="semi" tam={13.5} color={C.texto}>
                  {detalleCorto(actual)}
                </T>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <BotonPrimario texto={accion.texto} onPress={() => hacer(accion.ruta)} cargando={ocupado} alto={41} radio={14} tam={12.5} sombra={false} style={{ flex: 1 }} />
              {tecnico?.estado !== 'OCUPADO' && <BotonSuave texto="Cancelar" onPress={() => hacer('/tecnicos/yo/cancelar')} style={{ width: 84 }} />}
            </View>
            <Aviso texto={errorAccion} />
          </Tarjeta>
        ) : (
          datos && (
            <Tarjeta opacidad={0.88} radio={22} sombra={SOMBRA.tarjetaSuave} style={{ padding: 22, gap: 6 }}>
              <T peso="negrita" tam={16}>
                Sin solicitudes asignadas
              </T>
              <T tam={12.5} color={C.textoSuave}>
                Cuando llegue una, aparece aquí sin recargar la pantalla.
              </T>
            </Tarjeta>
          )
        )}

        {datos && (
          <>
            <T peso="extra" tam={16}>
              Próximas en tu cola {datos.colaSede.total > proximas.length ? `(${datos.colaSede.total})` : ''}
            </T>
            {proximas.length === 0 && (
              <T tam={12.5} color={C.textoSuave}>
                La cola de {tecnico?.sede === 'NORTE' ? 'la sede Norte' : 'tu sede'} está vacía.
              </T>
            )}
            {proximas.map((s) => (
              <Tarjeta key={s.id} opacidad={0.75} radio={18} sombra={null} style={est.mini}>
                <Mancha42 tipo={ESTILO_TIPO[s.tipo].mini} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T peso="negrita" tam={13.5} lineas={1}>
                    {s.titulo}
                  </T>
                  <T tam={11.5} color={C.textoSuave} lineas={1}>
                    {salonTexto(s.salon)} · {s.edificio}
                    {s.minutosEsperando ? ` · espera ${s.minutosEsperando} min` : ''}
                  </T>
                  {s.tipo === 'FALLA_EQUIPO_FIJO' && s.detalle && (
                    <T tam={11.5} color={C.texto} lineas={1}>
                      {s.detalle}
                    </T>
                  )}
                </View>
                {s.estado === 'ESCALADA' && <Insignia texto="ESCALADA" g="rojo" />}
              </Tarjeta>
            ))}
          </>
        )}
      </Cuerpo>
    </Pantalla>
  );
}

function textoEstado(estado: string, s: Solicitud | null) {
  const lugar = s ? salonTexto(s.salon) : '';
  switch (estado) {
    case 'ASIGNADO':
      return `Nueva solicitud en ${lugar}`;
    case 'EN_CAMINO':
      return `En camino a ${lugar}`;
    case 'OCUPADO':
      return `Atendiendo en ${lugar}`;
    default:
      return 'Disponible';
  }
}

function detalleCorto(s: Solicitud): string | null {
  const d = s.datos as Record<string, any>;
  if (s.tipo === 'PRESTAMO_EQUIPO') return `${d.cantidad ?? 1} unidad(es)${d.requiereInternet ? ' · con internet' : ''}${d.software ? ` · ${d.software}` : ''}`;
  return s.detalle;
}

const est = StyleSheet.create({
  problema: { gap: 4, backgroundColor: 'rgba(240,172,78,0.12)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  miEstado: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
});
