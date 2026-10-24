#!/usr/bin/env python3
"""tools/shot.py out.png WIDTH HEIGHT '<js run ~0.7s after load>' [--debug]
Headless Chromium screenshot of the game, e.g.
  tools/shot.py /tmp/arch.png 1600 760 "OL.startLevel('the-arch')" --debug"""
import subprocess, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out, w, h, js = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
dbg = "--debug" in sys.argv
UNLOCK = "localStorage.setItem('ol.progress',JSON.stringify(Object.fromEntries(OL.LEVELS.filter(l=>l.slot<=20).map(l=>[l.id,{best:l.daemons,done:true}]))));"
html = open(os.path.join(root, "index.html")).read().replace("</body>", "<script>setTimeout(()=>{try{%s%s}catch(e){console.error(e)}},700);</script></body>" % ("" if dbg else UNLOCK, js))
p = os.path.join(root, ".shot.html")
open(p, "w").write(html)
try:
    subprocess.run(["chromium", "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=%s,%s" % (w, h), "--virtual-time-budget=7000", "--screenshot=" + out, "file://" + p + ("?debug" if dbg else "")], capture_output=True, timeout=90)
finally:
    os.remove(p)
