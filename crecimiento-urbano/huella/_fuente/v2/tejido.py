"""Huella edificada por época: el tejido que forman las edificaciones urbanas existentes en cada fecha.
Regla: una vivienda es urbana si forma parte de un agrupamiento de 8 o más viviendas encadenadas a menos de 100 m
(el estudio de alta resolución usa 70 m; 100 m suma quintas y barrios parque); galpones y construcciones menores cuentan si están a menos de 60 m de una vivienda urbana.
Huella = celdas de 5 m a menos de R m de una edificación urbana, con cierre de 10 m (cruza la calle) y relleno de huecos chicos."""
import numpy as np, geopandas as gpd
from scipy import ndimage
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from rasterio import features
from rasterio.transform import from_origin

RES = 5.0


def urbanas(x, y, t, d_cadena=100, n_min=8, d_anexo=60):
    viv = np.where(t == 0)[0]
    u = np.zeros(len(x), bool)
    if len(viv) < n_min: return u
    P = np.c_[x[viv], y[viv]]; tr = cKDTree(P)
    pr = tr.query_pairs(d_cadena, output_type='ndarray')
    n = len(viv)
    A = coo_matrix((np.ones(len(pr)), (pr[:, 0], pr[:, 1])), shape=(n, n)) if len(pr) else coo_matrix((n, n))
    k, lab = connected_components(A, directed=False)
    sz = np.bincount(lab, minlength=k)
    uv = sz[lab] >= n_min
    u[viv[uv]] = True
    otros = np.where(t != 0)[0]
    if len(otros) and uv.any():
        d, _ = cKDTree(P[uv]).query(np.c_[x[otros], y[otros]], k=1)
        u[otros[d <= d_anexo]] = True
    return u


def disco(r):
    k = int(np.ceil(r)); yy, xx = np.mgrid[-k:k + 1, -k:k + 1]; return (xx * xx + yy * yy) <= r * r


def huella(geom, x, y, t, fecha, epocas, R=20.0, cierre=10.0, hueco_m2=2000, limite=None, pad=200):
    """geom: GeoSeries de polígonos (EPSG:5347); fecha: año decimal de aparición (nan = no entra).
    Devuelve (transform, primera época por celda [0 = nunca], dict época -> ha)."""
    b = geom.total_bounds; x0, y0, x1, y1 = b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad
    w = int(np.ceil((x1 - x0) / RES)); h = int(np.ceil((y1 - y0) / RES)); T = from_origin(x0, y1, RES, RES)
    lim = features.rasterize([(limite, 1)], out_shape=(h, w), transform=T, fill=0, dtype='uint8').astype(bool) if limite is not None else np.ones((h, w), bool)
    prim = np.zeros((h, w), np.int16); prev = np.zeros((h, w), bool); ha = {}
    D = disco(cierre / RES)
    for e in epocas:
        ex = np.isfinite(fecha) & (fecha <= e + 0.999)
        if ex.sum() == 0: ha[e] = 0.0; continue
        u = np.zeros(len(x), bool); u[np.where(ex)[0]] = urbanas(x[ex], y[ex], t[ex])
        if not u.any(): ha[e] = 0.0; continue
        bm = features.rasterize([(g, 1) for g in geom[u]], out_shape=(h, w), transform=T, fill=0, dtype='uint8').astype(bool)
        m = ndimage.distance_transform_edt(~bm) * RES <= R
        m = ndimage.binary_erosion(ndimage.binary_dilation(m, D), D)
        lab, n = ndimage.label(~m)
        if n:
            sz = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
            borde = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
            chicos = [i + 1 for i, s in enumerate(sz) if s * RES * RES < hueco_m2 and (i + 1) not in borde]
            if chicos: m |= np.isin(lab, chicos)
        m &= lim; m |= prev
        prim[m & (prim == 0)] = e; prev = m
        ha[e] = round(m.sum() * RES * RES / 1e4, 2)
    return T, prim, ha


def poligonos(T, prim, crs=5347, simpl=2.5):
    out = []
    for e in sorted(set(np.unique(prim)) - {0}):
        m = (prim == e).astype('uint8')
        gs = [gpd.GeoSeries.from_wkt([]) for _ in range(0)]
        shp = [__import__('shapely.geometry', fromlist=['shape']).shape(g) for g, v in features.shapes(m, mask=m.astype(bool), transform=T) if v == 1]
        if not shp: continue
        u = gpd.GeoSeries(shp, crs=crs).union_all().simplify(simpl, preserve_topology=True)
        out.append((int(e), u))
    return out
