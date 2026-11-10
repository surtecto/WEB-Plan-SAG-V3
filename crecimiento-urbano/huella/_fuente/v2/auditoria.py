"""Auditoría de la huella publicada (animación) contra las edificaciones de Google Open Buildings v3 (≤ may. 2023).
Grilla de 10 m en POSGAR 2007 faja 5. Salidas: auditoria.json (cifras) y aud_*.npy para las figuras."""
import json, numpy as np, geopandas as gpd, pandas as pd
from shapely.geometry import shape
from rasterio import features
from rasterio.transform import from_origin
from scipy import ndimage
CRS = 5347; RES = 10.0
H = json.load(open('/home/claude/web-plan-sag-v3/crecimiento-urbano/huella/huella.json'))
pg = gpd.read_file('/home/claude/work/partido/pagos.geojson').to_crs(CRS)
B = gpd.read_file('/home/claude/work/partido/edificios_partido.gpkg', layer='edificios_open_buildings').to_crs(CRS)
out = {}
def grilla(geom, pad=300):
    x0, y0, x1, y1 = geom.bounds; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    w = int(np.ceil((x1 - x0) / RES)); h = int(np.ceil((y1 - y0) / RES)); return from_origin(x0, y1, RES, RES), w, h
for ar in H['areas']:
    ing = gpd.GeoDataFrame([dict(a=x['a'], geometry=shape(x['g'])) for x in ar['ing']], crs=4326).to_crs(CRS)
    env = ing.geometry.union_all().buffer(400)
    T, w, h = grilla(env)
    first = np.zeros((h, w), np.int16)
    for r in ing.sort_values('a', ascending=False).itertuples():   # el más antiguo queda arriba
        m = features.rasterize([(r.geometry, 1)], out_shape=(h, w), transform=T, fill=0, dtype='uint8').astype(bool)
        first[m] = r.a if r.a else -1
    b = B[B.intersects(env)]
    bm = features.rasterize([(g, 1) for g in b.geometry], out_shape=(h, w), transform=T, fill=0, dtype='uint8').astype(bool)
    dist = ndimage.distance_transform_edt(~bm) * RES
    lim = features.rasterize([(g, 1) for g in pg.geometry], out_shape=(h, w), transform=T, fill=0, dtype='uint8').astype(bool)
    hu = first != 0
    sin_ed = hu & (dist > 40)
    # componentes sin edificación: forma (alargadas = infraestructura lineal)
    lab, n = ndimage.label(sin_ed, structure=np.ones((3, 3)))
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        mk = lab[sl] == i; px = int(mk.sum())
        if px < 20: continue
        yy, xx = np.nonzero(mk); cov = np.cov(np.vstack([xx, yy])) if px > 2 else np.eye(2); ev = np.sort(np.linalg.eigvalsh(cov))[::-1]
        elong = float(np.sqrt(ev[0] / max(ev[1], 1e-6)))
        ep = first[sl][mk]; ep = ep[ep > 0]
        comps.append(dict(ha=px * RES * RES / 1e4, elong=round(elong, 1), epoca=int(np.median(ep)) if len(ep) else 0, cx=float(T.c + (sl[1].start + xx.mean()) * RES), cy=float(T.f - (sl[0].start + yy.mean()) * RES)))
    comps.sort(key=lambda c: -c['ha'])
    # omisiones: edificaciones (40–600 m², viviendas) a más de 30 m de la huella
    dh = ndimage.distance_transform_edt(~hu) * RES
    cen = b.geometry.representative_point()
    col = ((cen.x - T.c) / RES).astype(int).clip(0, w - 1); fil = ((T.f - cen.y) / RES).astype(int).clip(0, h - 1)
    lejos = dh[fil.values, col.values] > 30
    viv = (b.area >= 40) & (b.area <= 600)
    om = b[lejos & viv.values]
    # tejido de las omitidas: viviendas a menos de 70 m entre sí (agrupamientos de 8 o más)
    tej = om.geometry.buffer(35).union_all().buffer(-10) if len(om) else None
    grupos = []
    if tej is not None and not tej.is_empty:
        for g in getattr(tej, 'geoms', [tej]):
            k = int(om.geometry.representative_point().within(g.buffer(11)).sum())
            if k >= 8: grupos.append(dict(n=k, ha=round(g.area / 1e4, 1), cx=g.centroid.x, cy=g.centroid.y))
    grupos.sort(key=lambda g: -g['n'])
    tot = hu.sum() * RES * RES / 1e4
    o = dict(huella_ha=round(tot, 1), sin_edificacion_40m_ha=round(sin_ed.sum() * RES * RES / 1e4, 1),
             lineales_ha=round(sum(c['ha'] for c in comps if c['elong'] >= 4), 1), comps=comps[:25],
             edificaciones=int(len(b)), viviendas=int(viv.sum()), viviendas_fuera=int(len(om)), grupos_omitidos=grupos[:30],
             ha_grupos_omitidos=round(sum(g['ha'] for g in grupos), 1))
    out[ar['id']] = o
    np.savez_compressed('aud_' + ar['id'] + '.npz', first=first, dist=dist, T=np.array(T)[:6], lim=lim)
    print(ar['n'], {k: v for k, v in o.items() if k not in ('comps', 'grupos_omitidos')})
    for c in comps[:8]: print('   sin edif.', c)
    for g in grupos[:8]: print('   omitido', g)
json.dump(out, open('auditoria.json', 'w'), ensure_ascii=False, indent=1)
