import pymupdf, json, re, os, sys, warnings
warnings.filterwarnings("ignore")
R = "/home/claude/web-plan-sag-v3/"
plan = open(R + "js/plan.js").read()
tomos = re.findall(r'"id": "([^"]+)",\s*"n": (\d+),\s*"titulo": "([^"]+)".*?"archivo": "([^"]+)"', plan, re.S)
os.makedirs(R + "docs/plan/lectura", exist_ok=True)
def clean(t):
    t = re.sub(r"[‐­-]\s+(?=[a-záéíóúñü])", "", t)   # guiones de corte
    t = t.replace("‐", "-")
    t = re.sub(r"\s+", " ", t).strip()
    return t
resumen = []
for tid, n, tit, arch in tomos:
    d = pymupdf.open(R + arch)
    secs = []; cur = None; started = False
    for pn, p in enumerate(d):
        for b in p.get_text("dict")["blocks"]:
            if b["type"] != 0: continue
            spans = [s for l in b["lines"] for s in l["spans"] if s["text"].strip()]
            if not spans: continue
            big = [s for s in spans if s["size"] >= 8]
            if spans[0]["font"].startswith(("Fraunces","Inter")) and big and len(big) < len(spans) and max(s["size"] for s in spans) >= 8.5:
                spans = big
                b = {"lines": [{"spans": [x for x in l["spans"] if x["size"] >= 8]} for l in b["lines"]]}
            sz = max(s["size"] for s in spans)
            txt = clean(" ".join("".join(s["text"] for s in l["spans"]) for l in b["lines"]))
            if not txt or re.search(r"\.{5,}", txt): continue
            fam = spans[0]["font"]
            is_head = (fam.startswith("Fraunces") and sz >= 11) or (fam.startswith("Inter") and ("Bold" in fam) and sz >= 8.5)
            if fam.startswith("Fraunces") and sz >= 20: started = True
            if not started: continue
            if is_head:
                if len(txt) > 140: is_head = False

            if is_head:
                if cur and not cur["p"] and cur.get("pg") == pn and not cur["h"].startswith("Índice") and len(cur["h"]) < 60 and fam.startswith("Fraunces"):
                    cur["h"] += " · " + txt   # títulos en dos bloques
                else:
                    cur = {"h": txt, "p": [], "pg": pn}; secs.append(cur)
                continue
            if not fam.startswith("SS4") or sz < 8.2: continue
            if cur is None: cur = {"h": tit, "p": []}; secs.append(cur)
            if cur["p"] and not re.search(r"[.!?:;»”)]$", cur["p"][-1]) and re.match(r"[a-záéíóúñü(,;]", txt):
                cur["p"][-1] += " " + txt
            else:
                cur["p"].append(txt)
    vistos = set()
    for x in secs:
        x["p"] = [q for q in x["p"] if len(q) > 160 or not (q in vistos or vistos.add(q))]
    secs = [{"h": s["h"], "p": s["p"]} for s in secs if s["p"] and not s["h"].startswith("Índice")]
    pal = sum(len(x.split()) for s in secs for x in s["p"])
    json.dump({"id": tid, "n": int(n), "titulo": tit, "secciones": secs}, open(R + f"docs/plan/lectura/{tid}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    resumen.append((tid, len(secs), pal, round(pal / 150), os.path.getsize(R + f"docs/plan/lectura/{tid}.json") // 1024))
for r in resumen: print(r)
