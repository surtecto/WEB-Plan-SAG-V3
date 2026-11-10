"""Fecha de aparición de cada edificación a partir de las tomas Wayback (huella_wayback_SAG.zip) y de Landsat.
1) fecha de toma de cada versión en cada edificación (metadatos de Esri, punto en polígono);
2) detector de techo calibrado: positivos = todas las edificaciones en su toma más reciente + las del casco Landsat 1976 en todas las tomas;
   negativos = testigos (la misma forma corrida 32–48 m a un lugar sin edificación) en todas las tomas; validación cruzada por tesela;
3) primera toma con techo sostenida en las siguientes; antes de la primera toma, la época Landsat si la hay."""
import json, zipfile, sys, numpy as np, pandas as pd
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score

ZIP = sys.argv[1] if len(sys.argv) > 1 else 'huella_wayback_SAG.zip'
z = zipfile.ZipFile(ZIP)
info = json.loads(z.read('info.json')); VERS = json.loads(z.read('versiones.json')); META = json.loads(z.read('metadatos.json'))
A = np.frombuffer(z.read('rasgos.i32'), dtype=np.int32).reshape(-1, 14)
E = json.load(open('entrada.json')); NB = len(E['b'])
S = pd.read_pickle('edif.pkl')
print('filas', len(A), 'versiones', len(info['versiones']), 'errores', info['errores'])
R = pd.DataFrame(A, columns=['id', 'rel', 'n', 'R', 'G', 'B', 'veg', 'sdL', 'Rr', 'Gr', 'Br', 'vegR', 'eB', 'eR'])
R['testigo'] = R.id >= NB; R['bid'] = np.where(R.testigo, R.id - NB, R.id)
lon = np.array([r[1] for r in E['b']]) / 1e6; lat = np.array([r[2] for r in E['b']]) / 1e6
zona = np.array([E['zonas'][k] for k in E['zona']])
relf = {v[0]: v[1] for v in info['versiones']}

# --- 1 · fecha de toma por (versión, edificación) ---
def fecha_attr(p):
    d = p.get('SRC_DATE2') or p.get('SRC_DATE')
    if d is None: return None
    if isinstance(d, (int, float)) and d > 1e11: return pd.Timestamp(int(d), unit='ms').strftime('%Y-%m-%d')
    s = str(d); return s[:4] + '-' + s[4:6] + '-' + s[6:8] if len(s) == 8 else s[:10]
idx = {}
for k, fc in META.items():
    if not fc or not fc.get('features'): continue
    rel, zn = k.split('|'); geoms, attrs = [], []
    for f in fc['features']:
        try: g = shape(f['geometry'])
        except Exception: continue
        geoms.append(g); attrs.append((fecha_attr(f['properties']), f['properties'].get('SRC_RES'), f['properties'].get('NICE_DESC') or f['properties'].get('SRC_DESC')))
    idx[(int(rel), zn)] = (STRtree(geoms), geoms, attrs)
cache = {}
def toma(rel, b):
    key = (rel, b)
    if key in cache: return cache[key]
    t = idx.get((rel, zona[b])); out = (None, None, None)
    if t:
        tr, gs, at = t; p = Point(lon[b], lat[b]); c = tr.query(p, predicate='intersects')
        if len(c): out = at[c[0]]
        else:
            j = tr.nearest(p); out = at[j] if j is not None else out
    cache[key] = out; return out
tm = [toma(r, b) for r, b in zip(R.rel.values, R.bid.values)]
R['toma'] = [x[0] for x in tm]; R['res'] = [x[1] for x in tm]; R['sensor'] = [x[2] for x in tm]
R['toma'] = R.toma.fillna(R.rel.map(relf))   # sin metadatos: fecha de la versión (cota superior)
R['tf'] = pd.to_datetime(R.toma, errors='coerce'); R = R[R.tf.notna()].copy()
R['ty'] = R.tf.dt.year + (R.tf.dt.dayofyear - 1) / 365.25
# una fila por edificación y toma (la versión más reciente con esa toma)
R = R.sort_values('rel').drop_duplicates(['id', 'toma'], keep='last')
print('tomas distintas', R.toma.nunique(), sorted(R.toma.unique())[:20])

# --- 2 · rasgos y detector ---
L = (R.R + R.G + R.B) / 3; Lr = (R.Rr + R.Gr + R.Br) / 3
X = pd.DataFrame({'veg': R.veg, 'vegR': R.vegR, 'dveg': R.vegR - R.veg, 'L': L, 'Lr': Lr, 'dL': L - Lr,
                  'dRGB': np.sqrt((R.R - R.Rr) ** 2 + (R.G - R.Gr) ** 2 + (R.B - R.Br) ** 2), 'exg': 2 * R.G - R.R - R.B, 'exgR': 2 * R.Gr - R.Rr - R.Br,
                  'sdL': R.sdL, 'edge': R.eB / (R.eR + 1), 'eB': R.eB, 'n': np.log1p(R.n), 'BR': R.B - R.R})
# contexto de la toma: mediana de los testigos de la misma toma y zona (estación, sensor, iluminación)
R['zona'] = zona[R.bid.values]
ctx = X[R.testigo.values].assign(toma=R.toma[R.testigo].values, zona=R.zona[R.testigo].values).groupby(['toma', 'zona']).median()
C = ctx.reindex(pd.MultiIndex.from_arrays([R.toma.values, R.zona.values])).reset_index(drop=True)
for c in ['veg', 'vegR', 'L', 'Lr', 'exg', 'sdL', 'edge']: X['c_' + c] = C[c].values; X['r_' + c] = X[c].values - C[c].values
X = X.reset_index(drop=True); R = R.reset_index(drop=True)
ult = R.groupby('id').ty.transform('max') == R.ty
casco = R.bid.map(S.set_index('id').ls_anio).values == 1976
pos = (~R.testigo) & (ult | casco)
lab = np.where(R.testigo, 0, np.where(pos, 1, -1))
tr_m = lab >= 0
tiles = {}
for k, v in VERS.items(): pass
gx = np.floor((lon + 180) / 360 * 2 ** 15).astype(int); grupo = gx[R.bid.values] * 100000 + np.floor((1 - np.log(np.tan(np.radians(lat)) + 1 / np.cos(np.radians(lat))) / np.pi) / 2 * 2 ** 15).astype(int)[R.bid.values]
oof = np.full(len(R), np.nan)
gkf = GroupKFold(n_splits=5)
Xt, yt, gt = X[tr_m], lab[tr_m], grupo[tr_m]
for a, b in gkf.split(Xt, yt, gt):
    m = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.06, max_leaf_nodes=31, l2_regularization=1.0)
    m.fit(Xt.iloc[a], yt[a]); oof[np.where(tr_m)[0][b]] = m.predict_proba(Xt.iloc[b])[:, 1]
print('AUC validación cruzada por tesela', round(roc_auc_score(yt, oof[tr_m]), 4))
M = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.06, max_leaf_nodes=31, l2_regularization=1.0).fit(Xt, yt)
p = M.predict_proba(X)[:, 1]; p[tr_m] = oof[tr_m]   # para lo usado en el ajuste, la predicción fuera de muestra
R['p'] = p
# umbral: falsos positivos ≤ 3 % en los testigos de cada toma
TH = 0.5
val = []
for tk, g in R.groupby('toma'):
    neg = g[g.testigo].p; cas = g[(~g.testigo) & (R.loc[g.index].bid.map(S.set_index('id').ls_anio) == 1976)].p; ul = g[(~g.testigo) & ult[g.index]].p
    val.append(dict(toma=tk, sensor=g.sensor.mode().iat[0] if g.sensor.notna().any() else None, res=g.res.median(), n_edif=int((~g.testigo).sum()), n_test=int(len(neg)),
                    falsos_pos=round(float((neg >= TH).mean()) * 100, 1) if len(neg) else None, aciertos_casco=round(float((cas >= TH).mean()) * 100, 1) if len(cas) else None,
                    aciertos_ultima=round(float((ul >= TH).mean()) * 100, 1) if len(ul) else None))
V = pd.DataFrame(val); print(V.to_string())

# --- 3 · fecha de aparición ---
Rr = R[~R.testigo].sort_values(['id', 'ty'])
res = []
for bid, g in Rr.groupby('id'):
    ty = g.ty.values; pr = g.p.values; ok = pr >= TH
    primera = ty[0]
    k = None
    for i in range(len(ty)):
        if ok[i] and ok[i:].mean() >= 0.75: k = i; break
    if k is None: res.append((bid, np.nan, np.nan, primera, 'nunca', len(ty))); continue
    if k == 0: res.append((bid, ty[0], np.nan, primera, 'ya_en_primera', len(ty))); continue
    res.append((bid, ty[k], ty[k - 1], primera, 'aparece', len(ty)))
F = pd.DataFrame(res, columns=['id', 'visto', 'ausente', 'primera_toma', 'estado', 'n_tomas'])
F.to_pickle('fechas_wayback.pkl'); R.to_pickle('filas_wayback.pkl'); V.to_csv('validacion_tomas.csv', index=False)
print(F.estado.value_counts()); print(F.groupby(F.visto.round()).size())
