"""Agrupa la salida CSV de k6 (--out csv=...) en ventanas de 10 s.
Uso: python perf/analizar_csv.py resultados/estres.csv"""
import csv, collections, sys

ruta = sys.argv[1]
datos = collections.defaultdict(lambda: collections.defaultdict(list))
creadas, fallos = collections.Counter(), collections.Counter()
t0 = None
with open(ruta) as f:
    for r in csv.DictReader(f):
        if r['metric_name'] != 'http_req_duration':
            continue
        t = int(r['timestamp']); t0 = t0 or t
        v = (t - t0) // 10 * 10
        nombre = dict(kv.split('=') for kv in r['extra_tags'].split('&') if '=' in kv).get('nombre', '')
        datos[v][nombre].append(float(r['metric_value']))
        if nombre == 'crear_solicitud':
            creadas[v] += 1
            if r['status'] != '201':
                fallos[v] += 1

p95 = lambda xs: sorted(xs)[max(0, int(len(xs) * 0.95) - 1)] if xs else 0
acumuladas = 0
print('| Segundo | Solicitudes/s atendidas | Solicitudes acumuladas | p95 crear (ms) | p95 cola (ms) | Fallos al crear |')
print('|---|---|---|---|---|---|')
for v in sorted(datos):
    acumuladas += creadas[v] - fallos[v]
    print(f"| {v}–{v+10} | {creadas[v]/10:.1f} | {acumuladas} | {p95(datos[v]['crear_solicitud']):.0f} | {p95(datos[v]['consultar_cola']):.0f} | {fallos[v]} |")
