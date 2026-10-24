#!/usr/bin/env python3
"""tools/browser-test.py '<js>' : load index.html headless, run <js> after load, print document.title set by the snippet.
The snippet may set document.title itself, e.g.  OL.startLevel('x');document.title=OL.G.screen"""
import subprocess, sys, os, tempfile
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(root, "index.html")).read()
js = sys.argv[1]
snippet = "<script>setTimeout(()=>{try{%s}catch(e){document.title='ERR '+e.message}},400);</script></body>" % js
path = os.path.join(root, ".t.html")
open(path, "w").write(html.replace("</body>", snippet))
out = subprocess.run(["chromium", "--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=4000", "--dump-dom", "file://" + path + ("?debug" if os.environ.get("DEBUG") else "")], capture_output=True, text=True).stdout
os.remove(path)
import re
m = re.search(r"<title>([^<]*)", out)
print(m.group(1) if m else "(no title)")
