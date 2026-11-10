"""Fecha de aparición de cada edificación: punto de cambio ausente → presente con la sensibilidad MEDIDA de cada toma.
Sensibilidad de una toma (por zona y tamaño): proporción con techo entre edificaciones que se sabe que ya existían
(vistas con claridad, p ≥ 0,8, en una toma anterior, o fechadas por Landsat antes de 2006). Falsos positivos: testigos.
Se descartan las tomas que en una zona salen borrosas (textura interior < 10) o con sensibilidad < 0,6."""
import numpy as np, pandas as pd
R = pd.read_pickle('filas_wayback.pkl'); S = pd.read_pickle('edif.pkl').set_index('id')
R['chico'] = R.bid.map(S.area).values < 40
# 1 · nitidez por toma y zona (una misma toma puede venir remuestreada en una zona y nítida en otra)
q = R[~R.testigo].groupby(['rel', 'toma', 'zona']).agg(n=('sdL', 'size'), sdL=('sdL', 'median'))
borrosas = set(q[(q.n >= 20) & (q.sdL < 10)].index)
R = R[~pd.MultiIndex.from_arrays([R.rel, R.toma, R.zona]).isin(list(borrosas))]
A = R.groupby(['id', 'bid', 'testigo', 'zona', 'chico', 'toma'], as_index=False).agg(ty=('ty', 'mean'), p=('p', 'max'))
A['o'] = (A.p >= 0.5).astype(int)
# 2 · falsos positivos (testigos) y sensibilidad (edificaciones que ya existían)
T = A[A.testigo]
fp_z = T.groupby(['zona', 'toma', 'chico']).o.agg(['sum', 'count']); fp_t = T.groupby(['toma', 'chico']).o.agg(['sum', 'count'])
B = A[~A.testigo].sort_values(['id', 'ty']).copy()
B['prev'] = B.groupby('id').p.transform(lambda s: s.shift(1).cummax()).fillna(0)
B['pre06'] = B.id.map(S.ls_anio).isin([1976, 1987, 2000, 2006]).values
ref = B[(B.prev >= 0.8) | B.pre06]
tp_z = ref.groupby(['zona', 'toma', 'chico']).o.agg(['sum', 'count']); tp_t = ref.groupby(['toma', 'chico']).o.agg(['sum', 'count'])
def tasa(tz, tt, k, n0, a, b):
    if k in tz.index and tz.loc[k, 'count'] >= n0: s, n = tz.loc[k]
    elif (k[1], k[2]) in tt.index and tt.loc[(k[1], k[2]), 'count'] >= n0: s, n = tt.loc[(k[1], k[2])]
    else: return None
    return float((s + a) / (n + a + b))
FPR = lambda k: float(np.clip(tasa(fp_z, fp_t, k, 30, 1, 19) or 0.05, 0.005, 0.3))
TPR = lambda k: tasa(tp_z, tp_t, k, 30, 2, 1)
filas = []
for (z, t, c), g in B.groupby(['zona', 'toma', 'chico']):
    filas.append(dict(zona=z, toma=t, tamaño='menor de 40 m²' if c else '40 m² o más', n=len(g), sensibilidad=TPR((z, t, c)), falsos_pos=FPR((z, t, c))))
Q = pd.DataFrame(filas); Q.to_csv('calidad_tomas.csv', index=False)
# 3 · punto de cambio con distribución previa de años de construcción por zona (estimada por EM)
#    sin esa previa, una edificación que ya estaba pero no se vio en la primera toma quedaría fechada en la siguiente.
#    Las tomas de una misma zona separadas por menos de 4 meses se tratan como una sola (techo si se ve en alguna).
# verosimilitud continua: distribución del puntaje p entre lo que seguro NO está (testigos) y lo que seguro SÍ está
# (vista con claridad antes, o fechada por Landsat antes de 2006), por toma y tamaño; así un lote vacío (p ≈ 0) pesa
# distinto que una casa entre árboles mal vista (p = 0,3).
BORDES = np.array([0, .02, .05, .1, .2, .3, .4, .5, .6, .7, .8, .9, .95, 1.0001])
def hist(v):
    h = np.histogram(np.clip(v, 0, 1), BORDES)[0].astype(float) + 0.5; return h / h.sum()
Hab, Hpr = {}, {}
for (t, c), g in T.groupby(['toma', 'chico']):
    if len(g) >= 40: Hab[(t, c)] = hist(g.p.values)
for (t, c), g in ref.groupby(['toma', 'chico']):
    if len(g) >= 40: Hpr[(t, c)] = hist(g.p.values)
Hab0 = {c: hist(T[T.chico == c].p.values) for c in (False, True)}; Hpr0 = {c: hist(ref[ref.chico == c].p.values) for c in (False, True)}
def lik(t, c, pv):
    b = np.clip(np.searchsorted(BORDES, pv, side='right') - 1, 0, len(BORDES) - 2)
    return np.log(Hab.get((t, c), Hab0[c])[b]), np.log(Hpr.get((t, c), Hpr0[c])[b])
import os, pickle
seqs = pickle.load(open('seqs.pkl', 'rb')) if os.path.exists('seqs.pkl') and os.environ.get('REUSAR') else {}
for bid, g in ([] if seqs else B.groupby('id')):
    if g.p.max() < 0.3: continue
    keys = list(zip(g.toma, g.chico, g.zona)); tp = np.array([TPR((k[2], k[0], k[1])) or 0.75 for k in keys])
    ok = tp >= 0.6
    if not ok.any(): ok[:] = True
    ty = g.ty.values[ok]; pv = g.p.values[ok]; ks = [k for k, m in zip(keys, ok) if m]
    T2, P2, K2 = [], [], []
    for t_, p_, k_ in zip(ty, pv, ks):
        if T2 and t_ - T2[-1] < 0.34:
            if p_ > P2[-1]: P2[-1], K2[-1] = p_, k_
        else: T2.append(t_); P2.append(p_); K2.append(k_)
    ty = np.array(T2)
    L = [lik(k[0], k[1], p_) for k, p_ in zip(K2, P2)]; la = np.array([x[0] for x in L]); lp = np.array([x[1] for x in L])
    kmax = next((i for i in range(len(ty)) if ty[i] >= 2023.38), len(ty) - 1)
    ll = np.array([la[:k].sum() + lp[k:].sum() for k in range(kmax + 1)])
    seqs[bid] = (S.zona[bid], ty[:kmax + 1], ll)
import pickle; pickle.dump(seqs, open('seqs.pkl', 'wb'))
ANIOS = np.arange(2009, 2024)
def masa(ty, k, w):
    if k == 0: return w['pre']
    a, b = ty[k - 1], min(ty[k], 2023.4); tot = 0.0
    for y in ANIOS:
        ov = max(0.0, min(b, y + 1) - max(a, y))
        tot += w[int(y)] * ov
    return max(tot, 1e-9)
W = {z: {'pre': 0.5, **{int(y): 0.5 / len(ANIOS) for y in ANIOS}} for z in S.zona.unique()}
for it in range(60):
    acc = {z: {'pre': 0.0, **{int(y): 0.0 for y in ANIOS}} for z in W}; nz = {z: 0 for z in W}
    for bid, (z, ty, ll) in seqs.items():
        w = W[z]; pr = np.array([masa(ty, k, w) for k in range(len(ll))]); lp = ll + np.log(pr); post = np.exp(lp - np.logaddexp.reduce(lp))
        nz[z] += 1
        for k, pk in enumerate(post):
            if k == 0: acc[z]['pre'] += pk; continue
            a, b = ty[k - 1], min(ty[k], 2023.4); ovs = {int(y): max(0.0, min(b, y + 1) - max(a, y)) * w[int(y)] for y in ANIOS}; sm = sum(ovs.values()) or 1
            for y, v in ovs.items(): acc[z][y] += pk * v / sm
    dif = 0
    for z in W:
        if not nz[z]: continue
        nuevo = {k: (v + 0.5) / (nz[z] + 0.5 * len(acc[z])) for k, v in acc[z].items()}
        # suavizado entre años vecinos y piso: la construcción no se detiene un año y estalla al siguiente
        ys = [int(y) for y in ANIOS]; v = np.array([nuevo[y] for y in ys]); v = np.convolve(np.r_[v[0], v, v[-1]], [0.25, 0.5, 0.25], 'valid')
        v = np.maximum(v, 0.25 * v.mean()); v *= (1 - nuevo['pre']) / v.sum()
        for y, x in zip(ys, v): nuevo[y] = float(x)
        dif = max(dif, max(abs(nuevo[k] - W[z][k]) for k in nuevo)); W[z] = nuevo
    if dif < 1e-4: break
print('EM de la previa: iteraciones', it + 1)
res = []
for bid in B.id.unique():
    if bid not in seqs: res.append((bid, np.nan, np.nan, np.nan, 'nunca', 0, np.nan)); continue
    z, ty, ll = seqs[bid]; w = W[z]; pr = np.array([masa(ty, k, w) for k in range(len(ll))]); lp = ll + np.log(pr); post = np.exp(lp - np.logaddexp.reduce(lp))
    k = int(np.argmax(post))
    res.append((bid, ty[k], ty[k - 1] if k else np.nan, ty[0], 'aparece' if k else 'ya_en_primera', len(ty), float(post[k])))
F = pd.DataFrame(res, columns=['id', 'visto', 'ausente', 'primera_toma', 'estado', 'n_tomas', 'conf'])
F.to_pickle('fechas_wayback.pkl')
pd.DataFrame([dict(zona=z, **{str(k): round(v, 4) for k, v in w.items()}) for z, w in W.items()]).to_csv('previa_anios.csv', index=False)
print(F.estado.value_counts())
F['z'] = F.id.map(S.zona); F['cl'] = [e if e != 'aparece' else str(int(np.floor(v))) for e, v in zip(F.estado, F.visto)]
pd.set_option('display.width', 220); print(pd.crosstab(F.cl, F.z))
print('confianza: mediana', round(F.conf.median(), 3), '· < 0,6:', round(float((F.conf < 0.6).mean()) * 100, 1), '%')
