import { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import jsQR from 'jsqr';
import { T } from './componentes';
import { C } from './tema';

/**
 * Lectura del QR en el NAVEGADOR (versión web de la app).
 *  - EscanerWeb: abre la cámara del computador o del celular (getUserMedia) y cada 200 ms
 *    le pasa el cuadro a jsQR, el mismo decodificador que usan las pruebas de integración.
 *  - BotonSubirQR: si no hay cámara, se sube la foto o el PNG del QR (docs/qr/) y se lee igual.
 * El texto leído (SOPORTE:v1:<código>) va al backend, que es quien dice qué equipo es.
 */
export type EstadoCamaraWeb = 'iniciando' | 'activa' | 'no-disponible';

function decodificar(ctx: CanvasRenderingContext2D, ancho: number, alto: number): string | null {
  const { data } = ctx.getImageData(0, 0, ancho, alto);
  return jsQR(data, ancho, alto, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

export function EscanerWeb({ activo, onLeer, onEstado }: { activo: boolean; onLeer: (texto: string) => void; onEstado: (e: EstadoCamaraWeb) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onLeer, onEstado });
  callbacks.current = { onLeer, onEstado };

  useEffect(() => {
    if (!activo) return undefined;
    let flujo: MediaStream | null = null;
    let temporizador: ReturnType<typeof setInterval> | null = null;
    let cancelado = false;
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });

    callbacks.current.onEstado('iniciando');
    if (!navigator.mediaDevices?.getUserMedia || !ctx) {
      callbacks.current.onEstado('no-disponible');
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        flujo = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => undefined);
        callbacks.current.onEstado('activa');
        temporizador = setInterval(() => {
          if (!v.videoWidth) return;
          // Se reduce el cuadro a máx. 640 px de ancho: jsQR lo lee igual y el navegador no se traba.
          const escala = Math.min(1, 640 / v.videoWidth);
          lienzo.width = Math.round(v.videoWidth * escala);
          lienzo.height = Math.round(v.videoHeight * escala);
          ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
          const texto = decodificar(ctx, lienzo.width, lienzo.height);
          if (texto) callbacks.current.onLeer(texto);
        }, 200);
      })
      .catch(() => callbacks.current.onEstado('no-disponible'));

    return () => {
      cancelado = true;
      if (temporizador) clearInterval(temporizador);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [activo]);

  if (!activo) return null;
  return (
    <video
      ref={video}
      muted
      playsInline
      aria-label="Cámara para leer el QR"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

/** Lee el QR de una imagen (foto o PNG). Prueba a tamaño real y, si es muy grande, reducida. */
async function leerArchivo(archivo: File): Promise<string | null> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falla) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falla(new Error('No se pudo abrir la imagen.'));
      i.src = url;
    });
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    for (const maximo of [1600, 800, 400]) {
      const escala = Math.min(1, maximo / Math.max(img.naturalWidth, img.naturalHeight));
      lienzo.width = Math.round(img.naturalWidth * escala);
      lienzo.height = Math.round(img.naturalHeight * escala);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      const texto = decodificar(ctx, lienzo.width, lienzo.height);
      if (texto) return texto;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BotonSubirQR({ onLeer, onError }: { onLeer: (texto: string) => void; onError: (mensaje: string) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        aria-label="Subir foto del QR"
        data-testid="subir-qr"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const archivo = e.target.files?.[0];
          e.target.value = '';
          if (!archivo) return;
          try {
            const texto = await leerArchivo(archivo);
            if (texto) onLeer(texto);
            else onError('No se encontró un código QR en esa imagen. Intenta con una foto más cerca y enfocada.');
          } catch (err) {
            onError((err as Error).message);
          }
        }}
      />
      <Pressable
        onPress={() => entrada.current?.click()}
        accessibilityRole="button"
        style={({ pressed }) => ({
          borderRadius: 14,
          borderWidth: 1.2,
          borderColor: 'rgba(240,172,78,0.6)',
          paddingVertical: 11,
          paddingHorizontal: 18,
          backgroundColor: pressed ? 'rgba(240,172,78,0.18)' : 'rgba(240,172,78,0.08)',
        })}
      >
        <T peso="negrita" tam={13.5} color={C.naranja}>
          Subir foto del QR
        </T>
      </Pressable>
    </>
  );
}
