import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { MESES_TITULO, hora } from '@/lib/formato';
import type { Ubicaciones } from '@/lib/tipos';
import { Aviso, BotonPrimario, Chips, Degradado, Hoja, T } from './componentes';
import { Icono } from './iconos';
import { C } from './tema';

export interface Lugar {
  edificio: string;
  salon: string;
}

/**
 * Selector de "Edificio y salón". En el prototipo es un campo de texto; aquí se eligen
 * de la lista que da el backend para que la solicitud siempre apunte a un salón real
 * (y a la sede correcta). Solo muestra la sede del usuario (docente o estudiante).
 */
export function SelectorLugar({ visible, onCerrar, onElegir, inicial }: { visible: boolean; onCerrar: () => void; onElegir: (l: Lugar) => void; inicial?: Lugar | null }) {
  const { pedir, perfil } = useSesion();
  const [ubicaciones, setUbicaciones] = useState<Ubicaciones[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edificio, setEdificio] = useState<string | null>(inicial?.edificio ?? null);
  const [salon, setSalon] = useState<string | null>(inicial?.salon ?? null);

  useEffect(() => {
    if (!visible || ubicaciones) return;
    pedir<Ubicaciones[]>('/ubicaciones').then(setUbicaciones, (e) => setError((e as Error).message));
  }, [visible, ubicaciones, pedir]);

  const edificios = useMemo(
    () => (ubicaciones ?? []).filter((u) => !perfil?.sede || u.sede === perfil.sede).flatMap((u) => u.edificios),
    [ubicaciones, perfil],
  );
  const salones = edificios.find((e) => e.edificio === edificio)?.salones ?? [];

  return (
    <Hoja visible={visible} onCerrar={onCerrar} titulo="Edificio y salón">
      <Aviso texto={error} />
      <T peso="negrita" tam={13.5}>
        Edificio
      </T>
      <Chips
        opciones={edificios.map((e) => ({ valor: e.edificio, texto: e.edificio }))}
        seleccion={edificio ? [edificio] : []}
        onCambio={(v) => {
          setEdificio(v);
          setSalon(null);
        }}
        colorActivo={C.naranja}
      />
      {edificio && (
        <>
          <T peso="negrita" tam={13.5}>
            Salón
          </T>
          <Chips opciones={salones.map((s) => ({ valor: s, texto: s }))} seleccion={salon ? [salon] : []} onCambio={setSalon} colorActivo={C.naranja} />
        </>
      )}
      <BotonPrimario
        texto="Confirmar ubicación"
        g="naranja"
        alto={52}
        radio={16}
        tam={15}
        deshabilitado={!edificio || !salon}
        onPress={() => {
          if (edificio && salon) onElegir({ edificio, salon });
        }}
      />
    </Hoja>
  );
}

// ---------- CalendarOverlay ----------
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const HORAS = [7, 10, 12, 14, 16, 18];
const MAX_DIAS = 90;
const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** "Selecciona fecha y hora" (CalendarOverlay del prototipo). Devuelve milisegundos. */
export function SelectorFecha({ visible, onCerrar, onElegir, valor }: { visible: boolean; onCerrar: () => void; onElegir: (ms: number) => void; valor: number | null }) {
  const hoy = inicioDia(new Date());
  const limite = new Date(hoy.getTime() + MAX_DIAS * 86400000);
  const [mes, setMes] = useState(() => {
    const base = valor ? new Date(valor) : hoy;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [dia, setDia] = useState<Date | null>(valor ? inicioDia(new Date(valor)) : null);
  const [horaElegida, setHoraElegida] = useState<number | null>(valor ? new Date(valor).getHours() : null);

  const semanas = useMemo(() => {
    const primero = (mes.getDay() + 6) % 7; // lunes = 0
    const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const celdas: (Date | null)[] = [...Array(primero).fill(null), ...Array.from({ length: diasMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))];
    while (celdas.length % 7) celdas.push(null);
    return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));
  }, [mes]);

  const momento = dia && horaElegida !== null ? new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), horaElegida).getTime() : null;
  const yaPaso = momento !== null && momento <= Date.now();
  const puedeAtras = mes > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const puedeAdelante = new Date(mes.getFullYear(), mes.getMonth() + 1, 1) <= limite;

  return (
    <Hoja visible={visible} onCerrar={onCerrar} titulo="Selecciona fecha y hora">
      <View style={est.calendario}>
        <View style={est.filaMes}>
          <Pressable disabled={!puedeAtras} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} style={{ opacity: puedeAtras ? 1 : 0.35 }} accessibilityLabel="Mes anterior">
            <Icono nombre="mesAnterior" />
          </Pressable>
          <T peso="negrita" tam={15}>
            {MESES_TITULO[mes.getMonth()]} {mes.getFullYear()}
          </T>
          <Pressable disabled={!puedeAdelante} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} style={{ opacity: puedeAdelante ? 1 : 0.35 }} accessibilityLabel="Mes siguiente">
            <Icono nombre="mesSiguiente" />
          </Pressable>
        </View>
        <View style={est.semana}>
          {DIAS_SEMANA.map((d, i) => (
            <T key={i} peso="negrita" tam={11.5} color={C.textoSuave} alinear="center" style={{ flex: 1 }}>
              {d}
            </T>
          ))}
        </View>
        {semanas.map((semana, i) => (
          <View key={i} style={est.semana}>
            {semana.map((d, j) => {
              if (!d) return <View key={j} style={est.celda} />;
              const fuera = d < hoy || d > limite;
              const elegido = dia?.getTime() === d.getTime();
              return (
                <Pressable key={j} disabled={fuera} onPress={() => setDia(d)} style={est.celda} accessibilityLabel={`${d.getDate()}`}>
                  {elegido ? (
                    <Degradado g="naranja" style={[est.num, { boxShadow: '0px 4px 10px rgba(240,172,78,0.35)' }]}>
                      <T peso="negrita" tam={13} color={C.blanco}>
                        {d.getDate()}
                      </T>
                    </Degradado>
                  ) : (
                    <View style={est.num}>
                      <T peso="medio" tam={13} color={fuera ? C.apagado : C.texto}>
                        {d.getDate()}
                      </T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <T peso="negrita" tam={13.5}>
        Hora
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: -10 }} contentContainerStyle={{ gap: 8, paddingVertical: 10, paddingRight: 4 }}>
        {HORAS.map((h) => {
          const activa = horaElegida === h;
          const texto = hora(new Date(2026, 0, 1, h).getTime());
          return (
            <Pressable key={h} onPress={() => setHoraElegida(h)} accessibilityRole="button" accessibilityState={{ selected: activa }}>
              {activa ? (
                <Degradado g="naranja" style={[est.hora, { boxShadow: '0px 6px 14px rgba(240,172,78,0.35)' }]}>
                  <T peso="negrita" tam={12.5} color={C.blanco}>
                    {texto}
                  </T>
                </Degradado>
              ) : (
                <View style={[est.hora, est.horaInactiva]}>
                  <T peso="negrita" tam={12.5}>
                    {texto}
                  </T>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {yaPaso && <Aviso texto="Esa hora ya pasó. Elige otra." />}
      <BotonPrimario
        texto="Confirmar fecha"
        g="naranja"
        alto={52}
        radio={16}
        tam={15}
        deshabilitado={momento === null || yaPaso}
        onPress={() => {
          if (momento !== null) onElegir(momento);
        }}
      />
    </Hoja>
  );
}

const est = StyleSheet.create({
  calendario: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: C.borde, borderWidth: 1.2, borderRadius: 20, padding: 18, gap: 14 },
  filaMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  semana: { flexDirection: 'row' },
  celda: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hora: { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 11, minWidth: 74, alignItems: 'center' },
  horaInactiva: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: C.borde, borderWidth: 1.2 },
});
