import { router } from 'expo-router';
import { SERVICIOS } from '@/lib/servicios';
import { Cuerpo, Encabezado, Fila, Pantalla } from '@/ui/componentes';
import { Caja44, Icono } from '@/ui/iconos';

/** Pantalla "9 - Servicios". */
export default function Servicios() {
  return (
    <Pantalla>
      <Encabezado titulo="Servicios" onAtras={() => router.navigate('/inicio')} />
      <Cuerpo gap={14} abajo={120}>
        {SERVICIOS.map((s) => (
          <Fila key={s.ruta} icono={<Caja44 glifo={s.glifo} degradado={s.degradado} />} titulo={s.titulo} subtitulo={s.subtitulo} derecha={<Icono nombre="chevron16" />} onPress={() => router.push(s.ruta)} />
        ))}
      </Cuerpo>
    </Pantalla>
  );
}
