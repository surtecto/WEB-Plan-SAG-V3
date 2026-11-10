"""Entrada del trabajo en el navegador: edificaciones de Google Open Buildings v3 (confianza ≥ 0,70) de la Ciudad y de los siete pueblos,
con un desplazamiento 'testigo' (la misma forma corrida 30–45 m a un lugar sin edificación) para calibrar el detector."""
import json, numpy as np, geopandas as gpd
from shapely.geometry import shape
from shapely.affinity import translate
from shapely.strtree import STRtree
H = json.load(open('/home/claude/web-plan-sag-v3/crecimiento-urbano/huella/huella.json'))
B = gpd.read_file('/home/claude/work/partido/edificios_partido.gpkg', layer='edificios_open_buildings').to_crs(5347).reset_index(drop=True)
zonas = {}
for ar in H['areas']:
    u = gpd.GeoSeries([shape(x['g']) for x in ar['ing']], crs=4326).to_crs(5347).union_all()
    zonas[ar['id']] = u.buffer(450 if ar['tipo'] == 'pueblo' else 0)
pg = gpd.read_file('/home/claude/work/partido/pagos.geojson').to_crs(5347)
zonas['ciudad'] = pg[pg.slug == 'ciudad'].geometry.iloc[0].buffer(30)
B['zona'] = None
for k, z in zonas.items():
    m = B.geometry.representative_point().within(z) & B.zona.isna(); B.loc[m, 'zona'] = k
S = B[B.zona.notna()].copy().reset_index(drop=True); print(S.zona.value_counts())
tree = STRtree(list(B.geometry.buffer(3)))
rng = np.random.default_rng(7); dirs = [(np.cos(a), np.sin(a)) for a in np.radians(np.arange(0, 360, 45))]
neg = []
for g in S.geometry:
    ok = None
    for d in rng.permutation(8):
        for r in (32, 40, 48):
            t = translate(g, dirs[d][0] * r, dirs[d][1] * r)
            if not len(tree.query(t, predicate='intersects')): ok = (round(dirs[d][0] * r, 1), round(dirs[d][1] * r, 1)); break
        if ok: break
    neg.append(ok)
print('testigos', sum(1 for x in neg if x), 'de', len(neg))
G = S.to_crs(4326)
out = []
for i, (g, a, c, t, z, n) in enumerate(zip(G.geometry, S.area, S.conf, S.t, S.zona, neg)):
    poly = g if g.geom_type == 'Polygon' else max(g.geoms, key=lambda p: p.area)
    pts = [(round(x * 1e6), round(y * 1e6)) for x, y in list(poly.exterior.coords)[:-1]]
    r = [i, pts[0][0], pts[0][1], round(a), int(t)]
    px, py = pts[0]
    for x, y in pts[1:]: r += [x - px, y - py]; px, py = x, y
    out.append(r)
Z = sorted(S.zona.unique())
json.dump(dict(b=out, neg=[list(n) if n else None for n in neg], zona=[Z.index(z) for z in S.zona], zonas=Z,
               nota='b: [id, lon0*1e6, lat0*1e6, área m², tipo (0 vivienda, 1 galpón, 2 menor), Δlon, Δlat, ...]; neg: desplazamiento testigo en metros (este, norte)'),
          open('entrada.json', 'w'), separators=(',', ':'))
S[['zona', 'area', 'conf', 't', 'geometry']].to_file('entrada_edificios.gpkg', driver='GPKG')
import os; print(round(os.path.getsize('entrada.json') / 1e6, 2), 'MB', len(out))
