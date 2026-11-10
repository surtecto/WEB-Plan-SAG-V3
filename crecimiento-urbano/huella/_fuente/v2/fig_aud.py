import json, numpy as np, geopandas as gpd, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from scipy import ndimage
z = np.load('aud_ciudad.npz'); first = z['first']; dist = z['dist']; T = z['T']; h, w = first.shape
x0, y1 = T[2], T[5]; ext = [x0, x0 + w * 10, y1 - h * 10, y1]
B = gpd.read_file('/home/claude/work/partido/edificios_partido.gpkg', layer='edificios_open_buildings').to_crs(5347)
B = B.cx[ext[0]:ext[1], ext[2]:ext[3]]; B = B[B.t != 1]
hu = first != 0
dh = ndimage.distance_transform_edt(~hu) * 10
c = B.geometry.representative_point(); col = ((c.x - x0) / 10).astype(int).clip(0, w - 1); fil = ((y1 - c.y) / 10).astype(int).clip(0, h - 1)
fuera = np.asarray(dh[fil.values, col.values] > 30)
fig, ax = plt.subplots(figsize=(13, 13))
GR = [1976, 1987, 2000, 2006, 2011, 2013, 2017, 2022]; R = ['#3b2a5a', '#2A5C7E', '#2f8a8a', '#6E9A50', '#c9b43a', '#e07a2e', '#d0742d', '#c0392b']
g = np.full(first.shape, np.nan)
for i, a in enumerate(GR):
    nxt = GR[i + 1] if i + 1 < len(GR) else 3000
    g[(first >= a) & (first < nxt)] = i
ax.imshow(g, extent=ext, cmap=ListedColormap(R), vmin=0, vmax=7, alpha=.55, interpolation='nearest')
B[~fuera].plot(ax=ax, color='#555', linewidth=0)
B[fuera].plot(ax=ax, color='#1f4fff', linewidth=0)
fp = hu & (dist > 40)
XX = x0 + (np.arange(w) + .5) * 10; YY = y1 - (np.arange(h) + .5) * 10
ax.contour(XX, YY, fp.astype(float), levels=[.5], colors='#ff6a00', linewidths=1.6)
ax.set_xlim(ext[0] + 500, ext[1] - 500); ax.set_ylim(ext[2] + 500, ext[3] - 500); ax.set_aspect('equal'); ax.axis('off')
ax.set_title('Huella Landsat publicada (color = período) · naranja: huella sin edificación a < 40 m · azul: edificaciones a > 30 m de la huella', fontsize=11)
plt.tight_layout(); plt.savefig('aud_ciudad.png', dpi=80)
