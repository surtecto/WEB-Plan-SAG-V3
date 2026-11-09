"""Datos de la sección «La huella urbana» (animación de la ampliación de las áreas urbanas del Partido).
Sale de las páginas publicadas del SIG (mismos datos, mismo recorte): Ciudad (clasificación Landsat directa 1976–2026,
planta urbana 1884) y pueblos (retro-datación de la huella de Google con Landsat, 1976–2023), unidos por pueblo
aunque el pueblo esté repartido entre dos Pagos."""
import json, glob, math, collections
import geopandas as gpd, pandas as pd
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

R = '/home/claude/web-plan-sag-v3/crecimiento-urbano/'
OUT = R + 'huella/huella.json'
M = 32721


def D(p):
    s = open(p).read(); a = s.index('window.DATA=') + 12
    return json.loads(s[a:s.index(';</script>', a)])


def red(c, n=5):
    return [red(x, n) for x in c] if isinstance(c, list) else round(c, n)


def geo(g, tol=2.0):
    g = gpd.GeoSeries([g], crs=M).simplify(tol, preserve_topology=True).to_crs(4326).iloc[0]
    m = mapping(g); return dict(type=m['type'], coordinates=red(json.loads(json.dumps(m['coordinates']))))


def gdf(fc):
    fs = [f for f in fc['features'] if f.get('geometry')]
    g = gpd.GeoDataFrame.from_features(fs, crs=4326).to_crs(M); g['geometry'] = g.geometry.make_valid(); return g


EPO = {1976: '1976–1980', 1987: '1987', 2000: '1999–2000', 2006: '2005–2006', 2011: '2011', 2025: '2025–2026'}
areas = []
# ---------------- Ciudad ----------------
dc = D(R + 'ciudad/index.html')
ser = dc['mancha']['serie']
I = gdf(dc['mancha']['ingreso'])
ing = []
for a, g in I.groupby('anio'):
    u = unary_union(list(g.geometry))
    ing.append(dict(a=int(a), ha=round(u.area / 1e4, 2), g=geo(u)))
acum = []; uu = None
for a, g in sorted(I.groupby('anio'), key=lambda t: t[0]):
    uu = unary_union([uu] + list(g.geometry)) if uu is not None else unary_union(list(g.geometry)); acum.append((int(a), round(uu.area / 1e4, 1)))
P84 = gdf(dc['p1884'])
cat = {'MURO': 'muro', 'CERCO': 'cerco', 'ALAMBRADO': 'alambrado', 'BALDIO': 'baldio'}
p1884 = []
for k, g in P84.groupby(P84.oc.map(lambda v: cat.get(v, 'otro'))):
    u = unary_union(list(g.geometry))
    p1884.append(dict(oc=k, ha=round(u.area / 1e4, 1), n=int(len(g)), g=geo(u, 1.0)))
MZ = gdf(dc['manzanas'])
mz_c = geo(unary_union(list(MZ.geometry.buffer(0))), 2.5)
cz = dc['stats']['censos']
areas.append(dict(id='ciudad', n='Ciudad cabecera', tipo='ciudad', pagos=['Ciudad'], metodo='directa',
                  primera=1976, fin=2026, ing=ing, acum=acum,
                  serie=[dict(a=s['anio'], ep=s['epoca'], ha=s['ha'], esc=s['escenas'], sensor=s['sensor'], f=[x[:10] for x in s['fechas']]) for s in ser],
                  p1884=p1884, mz=mz_c, censos={k: dict(pob=v['pob'], viv=v['viv']) for k, v in cz.items()},
                  bbox=list(gpd.GeoSeries([I.geometry.union_all()], crs=M).to_crs(4326).total_bounds.round(5))))
print('ciudad', len(json.dumps(ing)) // 1024, 'KB; acum vs serie', acum[-1], ser[-1]['ha'])

# ---------------- Pueblos (unidos entre Pagos) ----------------
partes = collections.defaultdict(list); mzs = collections.defaultdict(list); info = {}; pobs = collections.defaultdict(float); pagos = collections.defaultdict(list)
NOMP = {}
for p in sorted(glob.glob(R + 'pagos/*/index.html')):
    d = D(p); slug = p.split('/')[-2]; NOMP[slug] = d['ter']['nombre']
    hr = d['ter'].get('hr') or {}
    for q in d['ter']['pueblos']:
        pobs[q['n']] += q.get('pob22') or 0
        if q['n'] in (hr.get('ls_meta') or {}): pagos[q['n']].append(d['ter']['nombre']); info.setdefault(q['n'], hr['ls_meta'][q['n']])
    if d['mancha']['ingreso']['features']:
        g = gdf(d['mancha']['ingreso']); g['slug'] = slug; partes[slug] = g
    if d['manzanas']['features']:
        m = gdf(d['manzanas']); mzs[slug] = m
G = pd.concat(partes.values(), ignore_index=True)
MZP = pd.concat(mzs.values(), ignore_index=True)
orden = ['Solís', 'Cucullú', 'Villa Ruiz', 'Azcuénaga', 'Villa Espil', 'San Alberto', 'Tuyutí']
LS = json.load(open('/home/claude/work/partido/ls_pueblos_completos.json'))
LIM = gpd.GeoDataFrame.from_features(dc['limites']['features'], crs=4326).to_crs(M); LIM['geometry'] = LIM.geometry.make_valid()
NOMT = {f['properties'].get('slug'): (f['properties'].get('nombre') or f['properties'].get('slug')) for f in dc['limites']['features']}
for n in orden:
    if n not in LS: continue
    g = gpd.GeoDataFrame.from_features(LS[n]['ing']['features'], crs=4326).to_crs(M); g['geometry'] = g.geometry.make_valid()
    ing = []
    for a, gg in g.groupby('anio'):
        u = unary_union(list(gg.geometry))
        ing.append(dict(a=int(a), ha=round(u.area / 1e4, 2), g=geo(u)))
    allg = unary_union(list(g.geometry))
    en = [(r.slug, allg.intersection(r.geometry).area / allg.area) for r in LIM.itertuples()]
    pg_ = [NOMT.get(k, k) for k, f in sorted(en, key=lambda x: -x[1]) if f >= 0.05]
    serie = [dict(a=int(x['anio']), ha=(round(float(x['ha']), 1) if x.get('ha') is not None else None), tope=bool(x.get('tope_huella')), fechable=bool(x.get('fechable'))) for x in LS[n]['serie']]
    m = MZP[MZP.pueblo == n] if 'pueblo' in MZP.columns else MZP.iloc[0:0]
    mzg = geo(unary_union(list(m.geometry.buffer(0))), 2.5) if len(m) else None
    areas.append(dict(id=n.lower().replace(' ', '-').replace('í', 'i').replace('ú', 'u').replace('é', 'e'), n=n, tipo='pueblo', pagos=pg_, metodo='retrodatacion',
                      primera=LS[n]['primera'], fin=2023, ing=ing, serie=serie, sin_fecha_ha=LS[n]['sin_fecha_ha'], pob22=round(pobs[n]),
                      huella_ha=LS[n]['huella_ha'], mz=mzg, bbox=list(gpd.GeoSeries([allg], crs=M).to_crs(4326).total_bounds.round(5)),
                      ext_m=round(max(allg.bounds[2] - allg.bounds[0], allg.bounds[3] - allg.bounds[1]))))
    print(n, pg_, 'huella', LS[n]['huella_ha'], 'pob', round(pobs[n]))

# contexto: límites de la Ciudad y los Pagos, sin propiedades pesadas
lim = dc['limites']
limites = dict(type='FeatureCollection', features=[dict(type='Feature', properties=dict(slug=f['properties'].get('slug'), n=NOMT.get(f['properties'].get('slug'))), geometry=geo(shape(f['geometry']) if False else gpd.GeoSeries([shape(f['geometry'])], crs=4326).to_crs(M).iloc[0], 12)) for f in lim['features']])
GRUPOS = [['1976–1980', [1976]], ['1987', [1987]], ['1999–2000', [2000]], ['2005–2006', [2006]], ['2011', [2011]], ['2013–2016', [2013, 2014, 2015, 2016]], ['2017–2021', [2017, 2018, 2019, 2020, 2021]], ['2022–2026', [2022, 2023, 2024, 2025]]]
out = dict(areas=areas, limites=limites, grupos=GRUPOS, epocas=[dict(a=s['anio'], ep=s['epoca']) for s in ser],
           fuentes=dict(ciudad=dc['fuentes'].get('landsat'), ob3=dc['fuentes'].get('ob3'), atlas=dc['fuentes'].get('atlas'), censo=dc['fuentes'].get('censo')),
           fondo=dict(n=43291, fecha='2026-10-29'))
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print('huella.json', round(len(open(OUT).read()) / 1024), 'KB')
