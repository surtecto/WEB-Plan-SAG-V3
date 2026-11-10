"""Fecha Landsat de cada edificación de entrada.json: Ciudad = primera época de la clasificación 1976–2026 (Df, grilla 30 m) en su celda;
pueblos = retro-datación (ls_pueblos_completos.json). Salida: edif.parquet (id, zona, tipo, área, x, y en EPSG:5347, ls_anio)."""
import json, numpy as np, geopandas as gpd, pandas as pd
from shapely.geometry import shape
S = gpd.read_file('entrada_edificios.gpkg').reset_index(drop=True)   # mismo orden que entrada.json
S['id'] = np.arange(len(S))
c = S.geometry.representative_point(); S['x'] = c.x; S['y'] = c.y
meta = json.load(open('/home/claude/work/rle/meta.json')); K = [int(k) for k in meta['keys']]; g = meta['grid']
first = np.load('/home/claude/work/first.npy')
c3857 = gpd.GeoSeries(c, crs=5347).to_crs(3857)
col = np.floor((c3857.x - g['x0']) / g['sx']).astype(int); fil = np.floor((g['y1'] - c3857.y) / g['sx']).astype(int)
ok = (col >= 0) & (col < g['w']) & (fil >= 0) & (fil < g['h'])
ls = np.full(len(S), -1)
f = first[fil[ok].clip(0, g['h'] - 1), col[ok].clip(0, g['w'] - 1)]
ls[ok.values] = np.where(f == 255, 0, np.array(K + [0] * 300)[np.minimum(f, len(K) - 1)] * (f != 255))
# vecindario 3x3: Landsat a 30 m puede caer en la celda de al lado
ls_c = ls.copy(); ls_c[(S.zona != 'ciudad').values] = -1
LS = json.load(open('/home/claude/work/partido/ls_pueblos_completos.json'))
nom = {'solis': 'Solís', 'cucullu': 'Cucullú', 'villa-ruiz': 'Villa Ruiz', 'azcuenaga': 'Azcuénaga', 'villa-espil': 'Villa Espil', 'san-alberto': 'San Alberto', 'tuyuti': 'Tuyutí'}
for z, n in nom.items():
    ing = gpd.GeoDataFrame.from_features(LS[n]['ing']['features'], crs=4326).to_crs(5347)
    m = (S.zona == z).values
    j = gpd.sjoin(gpd.GeoDataFrame(geometry=c[m], crs=5347), ing[['anio', 'geometry']], how='left', predicate='within')
    j = j[~j.index.duplicated()]
    ls_c[np.where(m)[0]] = j['anio'].fillna(-1).astype(int).values
S['ls_anio'] = ls_c
S.drop(columns='geometry').to_pickle('edif.pkl')
print(S.groupby('zona').ls_anio.apply(lambda s: s.value_counts().sort_index().to_dict()))
