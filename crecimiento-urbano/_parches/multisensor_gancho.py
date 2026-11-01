"""Ganchos para crecimiento-urbano/multisensor.js en el SIG de la Ciudad y los nueve Pagos.
Expone el mapa y el repintado del panel contextual, y carga el módulo. Reaplicable."""
import glob, sys, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
pages = sorted(glob.glob(ROOT + '/pagos/*/index.html')) + [ROOT + '/ciudad/index.html']
for p in pages:
    s = open(p, encoding='utf8').read()
    if 'multisensor.js' in s:
        continue
    a = "map.attributionControl.setPrefix(false);"
    if s.count(a) != 1: sys.exit(p + ': ancla del mapa')
    s = s.replace(a, a + " window.SIG_MAP = map;")
    a = "  function pintarVista() { try { pintarVista0(); } catch (err) { /* aún cargando */ } }\n"
    if s.count(a) != 1: sys.exit(p + ': falta el panel contextual (aplicar antes panel_contextual.py)')
    s = s.replace(a, a + "  window.SIG_REPINTAR = pintarVista;\n")
    a = "'<p class=\"nota\">Abajo, sólo las lecturas"
    if s.count(a) != 1: sys.exit(p + ': ancla del panel')
    s = s.replace(a, "(window.SIG_EXTRA ? window.SIG_EXTRA() : '') +\n      " + a)
    rel = '../../' if '/pagos/' in p else '../'
    i = s.rfind('</body>')
    s = s[:i] + '<script src="' + rel + 'multisensor.js?v=20261101a"></script>\n' + s[i:]
    open(p, 'w', encoding='utf8').write(s)
    print('ok', p.split('/')[-2])
