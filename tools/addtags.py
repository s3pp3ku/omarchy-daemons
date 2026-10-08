#!/usr/bin/env python3
"""tools/addtags.py NN : make sure index.html loads levels/NN-*.js and levels/solutions-NN.js (in order)."""
import re, sys, os, glob
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
nn = sys.argv[1]
p = os.path.join(root, "index.html")
s = open(p).read()
lv = [os.path.basename(f) for f in glob.glob(os.path.join(root, "levels", nn + "-*.js"))]
for name in lv + (["solutions-%s.js" % nn] if os.path.exists(os.path.join(root, "levels", "solutions-%s.js" % nn)) else []):
    if "levels/" + name in s:
        continue
    tag = '  <script src="levels/%s"></script>\n' % name
    if name.startswith("solutions-"):
        # after the last solutions-* tag with a smaller number, else before the lab solutions
        m = list(re.finditer(r'  <script src="levels/solutions-(\d\d)\.js[^\n]*\n', s))
        pos = None
        for mm in m:
            if int(mm.group(1)) < int(nn):
                pos = mm.end()
        if pos is None:
            pos = m[0].start() if m else s.index('  <script src="levels/solutions-lab')
        s = s[:pos] + tag + s[pos:]
    else:
        m = list(re.finditer(r'  <script src="levels/(\d\d)-[^\n]*\n', s))
        pos = None
        for mm in m:
            if int(mm.group(1)) < int(nn):
                pos = mm.end()
        if pos is None:
            pos = m[0].start()
        s = s[:pos] + tag + s[pos:]
open(p, "w").write(s)
