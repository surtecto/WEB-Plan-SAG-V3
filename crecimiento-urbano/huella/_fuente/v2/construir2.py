"""Arma crecimiento-urbano/huella/index.html (v2): plantilla + huella.json + huella.js."""
import json
B = '/home/claude/work/huella2/'; R = '/home/claude/web-plan-sag-v3/crecimiento-urbano/huella/'
d = json.load(open(R + 'huella.json')); assert d.get('version') == 2
datos = json.dumps(d, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = open(B + 'plantilla.html').read().replace('@@DATOS@@', datos).replace('@@JS@@', open(B + 'huella.js').read())
open(R + 'index.html', 'w').write(html); print('index.html', round(len(html.encode()) / 1024), 'KB')
