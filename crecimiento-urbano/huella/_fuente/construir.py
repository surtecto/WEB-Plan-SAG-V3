"""Arma crecimiento-urbano/huella/index.html: plantilla + huella.json + huella.js.
Agrega a la Ciudad la ocupación de la planta de 1884 por época (cob84), medida sobre las mismas geometrías que dibuja la animación."""
import json, geopandas as gpd
from shapely.geometry import shape
from shapely.ops import unary_union
B = '/home/claude/work/huella/'; R = '/home/claude/web-plan-sag-v3/crecimiento-urbano/huella/'
d = json.load(open(R + 'huella.json'))
c = [a for a in d['areas'] if a['tipo'] == 'ciudad'][0]
S = lambda g: gpd.GeoSeries([shape(g)], crs=4326).to_crs(32721).iloc[0].buffer(0)
p84 = unary_union([S(x['g']) for x in c['p1884']]); acc = None; cob = []
for x in sorted(c['ing'], key=lambda x: x['a']):
    g = S(x['g']); acc = g if acc is None else unary_union([acc, g])
    cob.append(dict(a=x['a'], pct=round(acc.intersection(p84).area / p84.area * 100, 1), fuera=round(acc.difference(p84).area / 1e4, 1)))
c['cob84'] = cob
json.dump(d, open(R + 'huella.json', 'w'), ensure_ascii=False, separators=(',', ':'))
datos = json.dumps(d, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = open(B + 'plantilla.html').read().replace('@@DATOS@@', datos).replace('@@JS@@', open(B + 'huella.js').read())
open(R + 'index.html', 'w').write(html)
print('index.html', round(len(html.encode()) / 1024), 'KB', cob[0], cob[-1])
