/* LVL 05 — FIREWALL
   Design record: docs/levels/05-firewall.md
   Two firewalls split the map. The low one (W1) is thick: bash its port, or
   build a long flight of stairs over it onto a catwalk. The tall one (W2) is
   thin: bash a port, or bomb the maintenance plug. Every breach lands the
   crowd in front of a fresh hazard. */
OL.registerLevel({
  id: "firewall",
  slot: 5,
  title: "FIREWALL",
  brief: "Thirty daemons, two firewalls. The perimeter wall hides a port at its foot and a catwalk over its top. Behind it the inner wall has a port, a maintenance plug and a drop on its far side. Every way through ends at another hazard.",
  size: [1280, 352],
  seed: 13,
  theme: "kanagawa",
  daemons: 30,
  save: 18,
  time: 360,
  rate: 50,
  skills: { blocker: 3, builder: 5, basher: 3, bomber: 2 },
  entrances: [{ x: 90, y: 262 }],
  exits: [{ x: 1150, y: 271 }],
  camera: { x: 0 },

  props: [
    { kind: "plaque", x: 90, y: 214, text: "iptables -P INPUT DROP" },
    { kind: "window", x: 160, y: 130, w: 118, h: 50, title: "~ ufw status", active: 0, lines: ["Status: active", "22/tcp   ALLOW", "8080     DENY", "!default: deny"] },
    { kind: "plaque", x: 538, y: 168, text: "PERIMETER", color: "#ff3b4e" },
    { kind: "fetch", x: 590, y: 130, w: 112, h: 44 },
    { kind: "plaque", x: 766, y: 108, text: "INNER FIREWALL", color: "#ff3b4e" },
    { kind: "window", x: 820, y: 130, w: 128, h: 50, title: "~ journalctl -u nftables", active: 1, lines: ["# port 22: accept", "!port 8080: drop", "# maintenance: open"] },
    { kind: "bar", x: 980, y: 126, w: 220 },
    { kind: "plaque", x: 538, y: 250, text: "PORT 22", color: "#7fb4ca" },
    { kind: "plaque", x: 766, y: 232, text: "MAINT", color: "#7fb4ca" },
    { kind: "plaque", x: 320, y: 250, text: "LAVA", color: "#ff6a2b" },
  ],
  decor: [
    { m: "tech", rect: [1100, 214, 130, 58] },
    { cable: [[60, 150], [500, 160]], sag: 22, leds: 22 },
    { cable: [[580, 150], [750, 150]], sag: 12, leds: 16 },
    { cable: [[800, 150], [1230, 160]], sag: 24, leds: 26 },
  ],

  terrain: [
    { m: "metal", rect: [0, 336, 1280, 16] },
    { m: "rock", rect: [0, 272, 1250, 64] },                     // the floor
    { m: "metal", rect: [1250, 0, 30, 336] },

    /* west: a lava trench, then the perimeter wall (thick, with a port and a catwalk) */
    { m: "air", rect: [300, 272, 40, 30] },
    { m: "lava", rect: [300, 284, 40, 18] },
    { m: "metal", rect: [520, 200, 36, 72] },
    { m: "rock", rect: [520, 248, 36, 24] },                      // port 22 (bash)
    { m: "tech", rect: [556, 200, 204, 4] },                      // catwalk over the DMZ

    /* the DMZ: a coolant pit just past the port */
    { m: "air", rect: [600, 272, 40, 30] },
    { m: "water", rect: [600, 284, 40, 18] },

    /* inner firewall: tall, thin; a high port off the catwalk and a maintenance plug at the floor */
    { m: "metal", rect: [760, 120, 6, 152] },
    { m: "rock", rect: [760, 176, 6, 24] },                      // high port (bash from the catwalk)
    { m: "rock", rect: [760, 244, 6, 28] },                      // maintenance plug (bash or bomb)

    /* east: a coolant moat, a low rock wall, the vault */
    { m: "air", rect: [880, 272, 40, 30] },
    { m: "water", rect: [880, 284, 40, 18] },
    { m: "rock", rect: [1000, 230, 20, 42] },
    { m: "tech", rect: [1130, 272, 60, 3] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1280, 0], [1280, 100], [1160, 100], [1160, 84], [1000, 84], [1000, 110], [840, 110], [840, 90], [660, 90], [660, 104], [480, 104], [480, 86], [300, 86], [300, 108], [140, 108], [140, 92], [0, 92]] },
  ],
});
