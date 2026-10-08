#!/bin/bash
# tools/shot.sh <level-id> [out.png] [width] [height]  -- headless screenshot of a level (zoom-to-fit)
cd "$(dirname "$0")/.."
OUT=${2:-/tmp/shot-$1.png}
sed "s#</body>#<script>setTimeout(()=>{OL.startLevel('$1');setTimeout(()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'0'}));},500)},300)</script></body>#" index.html > .shot.html
chromium --headless --disable-gpu --no-sandbox --window-size=${3:-1700},${4:-760} --virtual-time-budget=6000 --screenshot=$OUT "file://$PWD/.shot.html?debug" >/dev/null 2>&1
rm -f .shot.html
