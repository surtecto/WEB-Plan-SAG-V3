"""Antes / después en la Ciudad: huella Landsat publicada el 09/11 vs. huella por edificación fechada."""
import json, numpy as np, geopandas as gpd, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from shapely.geometry import shape
V1 = json.load(open('huella_v1.json')); V2 = json.load(open('/home/claude/web-plan-sag-v3/crecimiento-urbano/huella/huella.json'))
c1 = [a for a in V1['areas'] if a['id'] == 'ciudad'][0]; c2 = [a for a in V2['areas'] if a['id'] == 'ciudad'][0]
B = gpd.read_file('entrada_edificios.gpkg'); B = B[B.zona == 'ciudad']
GR = V2['grupos']
def col2(a, c):
    if c == 'sf': return '#a59f90'
    for g in GR:
        if (c == 'previo' and g[3] == 'previo') or (c != 'previo' and g[3] != 'previo' and a in g[1]): return g[2]
    return '#999'
GR1 = [[1976], [1987], [2000], [2006], [2011], [2013, 2014, 2015, 2016], [2017, 2018, 2019, 2020, 2021], [2022, 2023, 2024, 2025]]
R1 = ['#3b2a5a', '#2A5C7E', '#2f8a8a', '#6E9A50', '#c9b43a', '#e07a2e', '#d0742d', '#c0392b']
def col1(a): return next((R1[i] for i, g in enumerate(GR1) if a in g), '#999')
fig, ax = plt.subplots(1, 2, figsize=(20, 10))
for k, (A, f) in enumerate(((c1, lambda x: col1(x['a'])), (c2, lambda x: col2(x['a'], x['c'])))):
    g = gpd.GeoDataFrame([dict(a=x['a'], col=f(x), geometry=shape(x['g'])) for x in A['ing']], crs=4326).to_crs(5347).sort_values('a')
    B.plot(ax=ax[k], color='#bbb', linewidth=0)
    g.plot(ax=ax[k], color=g.col, alpha=.8, linewidth=0)
    ax[k].set_axis_off(); ax[k].set_title(('Antes: píxeles Landsat (09/11)' if k == 0 else 'Ahora: edificaciones fechadas') + ' · %.0f ha' % (A['serie'][-1]['ha']), fontsize=15)
x0, y0, x1, y1 = gpd.GeoSeries([shape(x['g']) for x in c1['ing']], crs=4326).to_crs(5347).total_bounds
for a in ax: a.set_xlim(x0 - 200, x1 + 200); a.set_ylim(y0 - 200, y1 + 200)
plt.tight_layout(); plt.savefig('comparacion_ciudad.png', dpi=75)
