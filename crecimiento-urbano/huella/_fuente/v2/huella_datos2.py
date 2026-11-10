"""huella.json v2: huella edificada fechada por edificación (Landsat 1976–2006 + tomas Wayback 2010–2025), sin rutas ni pavimento.
Reemplaza la clasificación Landsat directa de la Ciudad y la retro-datación por celda de los pueblos."""
import json, os, numpy as np, pandas as pd, geopandas as gpd
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from scipy import ndimage
from rasterio import features
from tejido import huella, urbanas, RES, disco

W = '/home/claude/work/huella2/'; OUT = '/home/claude/web-plan-sag-v3/crecimiento-urbano/huella/huella.json'
H0 = json.load(open(W + 'huella_v1.json'))   # versión publicada el 09/11 (planta 1884, manzanas, límites, censos)
S = pd.read_pickle(W + 'edif.pkl'); G = gpd.read_file(W + 'entrada_edificios.gpkg')
AUD = json.load(open(W + 'auditoria.json'))
pg = gpd.read_file('/home/claude/work/partido/pagos.geojson').to_crs(5347)
LS_OK = {1976, 1987, 2000, 2006, 2011}
F = pd.read_pickle(W + 'fechas_wayback.pkl').set_index('id') if os.path.exists(W + 'fechas_wayback.pkl') else None

# ---- fecha y fuente de cada edificación ----
fecha = np.full(len(S), np.nan); clase = np.array(['sf'] * len(S), dtype=object); intervalo = np.full(len(S), np.nan)
for i, r in enumerate(S.itertuples()):
    ls = r.ls_anio if r.ls_anio in LS_OK else None
    f = F.loc[r.id] if F is not None and r.id in F.index else None
    if f is None:
        if ls and ls <= 2006: fecha[i], clase[i] = ls, 'ls'
        else: fecha[i], clase[i] = 2023, 'sf'
        continue
    if f.estado == 'aparece':
        fecha[i], clase[i], intervalo[i] = min(np.floor(f.visto), 2023), 'wb', f.ausente
    elif f.estado == 'ya_en_primera':
        if ls and ls <= f.primera_toma: fecha[i], clase[i] = ls, 'ls'
        else: fecha[i], clase[i] = np.floor(f.primera_toma), 'previo'
    else:  # nunca visto con techo (copa de árboles, sombra) aunque Google lo detectó antes de mayo de 2023
        if ls and ls <= 2006: fecha[i], clase[i] = ls, 'ls'
        else: fecha[i], clase[i] = 2023, 'sf'
S['fecha'] = fecha; S['clase'] = clase; S['ausente'] = intervalo
S.to_pickle(W + 'edif_fechas.pkl')
CL = {'ls': 1, 'previo': 2, 'wb': 3, 'sf': 4}


def geo(g, tol=2.5):
    g = gpd.GeoSeries([g], crs=5347).simplify(tol, preserve_topology=True).to_crs(4326).iloc[0]
    def red(c): return [red(x) for x in c] if isinstance(c, (list, tuple)) and not isinstance(c[0], (int, float)) else [round(c[0], 5), round(c[1], 5)]
    m = mapping(g); return dict(type=m['type'], coordinates=red(json.loads(json.dumps(m['coordinates']))))


def area(zid, limite):
    m = (S.zona == zid).values; s = S[m].reset_index(drop=True); g = G.geometry[m].reset_index(drop=True)
    ep = sorted(set(s.fecha.dropna().astype(int)))
    T, prim, ha = huella(g, s.x.values, s.y.values, s.t.values, s.fecha.values, ep, limite=limite)
    h, w = prim.shape
    # clase de cada celda: la de la edificación urbana más cercana presente en su primera época
    cls = np.zeros((h, w), np.uint8)
    for e in ep:
        sel = (prim == e)
        if not sel.any(): continue
        ex = s.fecha.values <= e + 0.999
        u = np.zeros(len(s), bool); u[np.where(ex)[0]] = urbanas(s.x.values[ex], s.y.values[ex], s.t.values[ex])
        ids = np.where(u)[0]
        lab = features.rasterize([(gg, int(k) + 1) for k, gg in zip(ids, g[u])], out_shape=(h, w), transform=T, fill=0, dtype='int32')
        _, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
        near = lab[iy, ix] - 1
        cv = np.array([CL[c] for c in s.clase.values])
        cls[sel] = cv[near[sel]]
    ing = []
    for e in ep:
        for c, k in CL.items():
            mk = ((prim == e) & (cls == k)).astype('uint8')
            if not mk.any(): continue
            shp = [shape(q) for q, v in features.shapes(mk, mask=mk.astype(bool), transform=T) if v == 1]
            u = gpd.GeoSeries(shp, crs=5347).union_all()
            ing.append(dict(a=int(e), c=c, ha=round(mk.sum() * RES * RES / 1e4, 2), g=geo(u)))
    # serie acumulada y superficies por clase
    serie = []
    for e in ep:
        acc = prim > 0; acc &= prim <= e
        d = {c: round(float(((prim > 0) & (prim <= e) & (cls == k)).sum() * RES * RES / 1e4), 2) for c, k in CL.items()}
        serie.append(dict(a=int(e), ha=round(float(acc.sum() * RES * RES / 1e4), 2), **{'ha_' + c: v for c, v in d.items()}))
    tot = serie[-1]
    tomas = None
    if F is not None:
        R = pd.read_pickle(W + 'filas_wayback.pkl'); R = R[(~R.testigo) & (R.zona == zid)]
        tomas = [dict(f=t, s=(gr.sensor.mode().iat[0] if gr.sensor.notna().any() else None), r=(float(gr.res.median()) if gr.res.notna().any() else None), n=int(gr.bid.nunique())) for t, gr in R.groupby('toma') if gr.bid.nunique() >= 20]
    return dict(ing=ing, serie=serie, prim=prim, T=T, cls=cls, tomas=tomas,
                n_edif=int(m.sum()), n_clase={c: int((s.clase == c).sum()) for c in CL}, huella_ha=tot['ha'], sf_ha=tot['ha_sf'], previo_ha=tot['ha_previo'])


areas = []
for a0 in H0['areas']:
    lim = pg[pg.slug == 'ciudad'].geometry.iloc[0] if a0['tipo'] == 'ciudad' else None
    r = area(a0['id'], lim)
    a = {k: v for k, v in a0.items() if k in ('id', 'n', 'tipo', 'pagos', 'pob22', 'mz', 'p1884', 'censos')}
    a.update(metodo='edificacion', ing=r['ing'], serie=r['serie'], tomas=r['tomas'], n_edif=r['n_edif'], n_clase=r['n_clase'],
             huella_ha=r['huella_ha'], sf_ha=r['sf_ha'], previo_ha=r['previo_ha'], fin=2023,
             primera=min([x['a'] for x in r['serie'] if x['ha'] > 0] or [None]), aud=AUD.get(a0['id']) and {k: AUD[a0['id']][k] for k in ('huella_ha', 'sin_edificacion_40m_ha', 'lineales_ha', 'viviendas_fuera', 'ha_grupos_omitidos')})
    if not r['ing']: print('sin huella urbana:', a0['n']); continue
    allg = unary_union([shape(x['g']) for x in r['ing']]); b = allg.bounds
    a['bbox'] = [round(b[0], 5), round(b[1], 5), round(b[2], 5), round(b[3], 5)]
    if a0['tipo'] == 'ciudad':
        p84 = unary_union([gpd.GeoSeries([shape(x['g'])], crs=4326).to_crs(5347).iloc[0].buffer(0) for x in a0['p1884']])
        T, prim = r['T'], r['prim']
        m84 = features.rasterize([(p84, 1)], out_shape=prim.shape, transform=T, fill=0, dtype='uint8').astype(bool)
        a['cob84'] = [dict(a=x['a'], pct=round(float(((prim > 0) & (prim <= x['a']) & m84).sum() / m84.sum() * 100), 1), fuera=round(float(((prim > 0) & (prim <= x['a']) & ~m84).sum() * RES * RES / 1e4), 1)) for x in r['serie']]
    areas.append(a)
    print(a['n'], 'huella', a['huella_ha'], 'previo', a['previo_ha'], 'sin fecha', a['sf_ha'], a['n_clase'], [(x['a'], x['ha']) for x in a['serie']])

GR = [['1976–1980', [1976], '#3b2a5a', 'ls'], ['1987', [1987], '#2A5C7E', 'ls'], ['1999–2000', [2000], '#2f8a8a', 'ls'], ['2005–2006', [2006], '#5f9a62', 'ls'],
      ['Ya estaba en la primera toma', [], '#9a8fae', 'previo'], ['2010–2016', [2010, 2011, 2012, 2013, 2014, 2015, 2016], '#c9b43a', 'wb'],
      ['2017–2020', [2017, 2018, 2019, 2020], '#e07a2e', 'wb'], ['2021–2023', [2021, 2022, 2023], '#c0392b', 'wb']]
ETQ = {1976: '1976–1980', 1987: '1987', 2000: '1999–2000', 2006: '2005–2006', 2011: '2011'}
eps = sorted({x['a'] for a in areas for x in a['serie']})
out = dict(version=2, areas=areas, limites=H0['limites'], grupos=GR, epocas=[dict(a=e, ep=ETQ.get(e, str(e))) for e in eps],
           fuentes=H0['fuentes'], fondo=H0['fondo'], validacion=(pd.read_csv(W + 'validacion_tomas.csv').to_dict('records') if os.path.exists(W + 'validacion_tomas.csv') else None))
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print('huella.json', round(os.path.getsize(OUT) / 1024), 'KB')
