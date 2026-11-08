#!/usr/bin/env python3
"""
Marca todos os arquivos do site com um número de versão (?v=AAAAMMDDHHMM).

Por que: o navegador guarda os arquivos (cache) para abrir o sistema mais rápido.
Com o número de versão, a cada atualização ele baixa a versão nova inteira,
sem misturar arquivos antigos e novos.

Como usar (antes de publicar uma atualização):
    python3 ferramentas/versionar.py
"""
import re, pathlib, datetime, sys

raiz = pathlib.Path(__file__).resolve().parent.parent
versao = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime("%Y%m%d%H%M")

padrao_js = re.compile(r'''(["'])(\.{1,2}/[^"'?]+?\.js)(\?v=[\w.-]+)?\1''')
alterados = 0
for arq in list((raiz / "js").rglob("*.js")):
    txt = arq.read_text(encoding="utf-8")
    novo = padrao_js.sub(lambda m: f"{m[1]}{m[2]}?v={versao}{m[1]}", txt)
    if novo != txt:
        arq.write_text(novo, encoding="utf-8"); alterados += 1

idx = raiz / "index.html"
html = idx.read_text(encoding="utf-8")
html = re.sub(r'''(href|src)="((?:css/app\.css)|(?:config\.js)|(?:js/app\.js))(\?v=[\w.-]+)?"''', lambda m: f'{m[1]}="{m[2]}?v={versao}"', html)
html = re.sub(r'<meta name="versao" content="[^"]*">', f'<meta name="versao" content="{versao}">', html)
if '<meta name="versao"' not in html:
    html = html.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n  <meta name="versao" content="{versao}">', 1)
idx.write_text(html, encoding="utf-8")
print(f"Versão {versao} aplicada em index.html e {alterados} arquivo(s) JavaScript.")
