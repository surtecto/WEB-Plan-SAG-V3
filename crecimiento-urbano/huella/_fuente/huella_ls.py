"""Retro-datación Landsat de cada pueblo sobre su área completa (sin recortar por Pago), con el mismo código que el SIG."""
import sys, json
sys.argv = ['process_partido.py', '/mnt/user-data/uploads/JSON/poblamiento_partido_SAG.zip']
src = open('/home/claude/work/process_partido.py').read()
exec(src[:src.index('LSC = {}')])
out = {}
for n in ['Solís', 'Cucullú', 'Villa Ruiz', 'Azcuénaga', 'Villa Espil', 'San Alberto', 'Tuyutí', 'Franklin']:
    if n not in R7: continue
    pi = [x['n'] for x in META['pueblos']].index(n)
    r = landsat_pueblo(pi, n)
    if not r or r.get('ing') is None: print(n, 'sin datos'); continue
    ig = r['ing'].to_crs(4326)
    out[n] = dict(ing=json.loads(ig[['anio', 'geometry']].to_json()), serie=r['serie'], primera=r.get('primera'), huella_ha=r.get('huella_ha'), sin_fecha_ha=r.get('sin_fecha_ha'), fechables=r.get('fechables'))
    print(n, 'huella', r.get('huella_ha'), 'primera', r.get('primera'), 'sinf', r.get('sin_fecha_ha'), [(x['anio'], x['ha']) for x in r['serie'] if x['anio'] in (1976, 1987, 2000, 2013, 2023)])
json.dump(out, open('/home/claude/work/partido/ls_pueblos_completos.json', 'w'), ensure_ascii=False)
