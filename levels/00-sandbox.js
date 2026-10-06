/* Physics playground — not part of the campaign (debug: true).
   Open with ?level=sandbox or from the debug panel. */
OL.registerLevel({
  id: "sandbox",
  slot: 0,
  debug: true,
  title: "PHYSICS SANDBOX",
  brief: "Every material and skill in one room. For testing, not for playing.",
  size: [900, 300],
  lemmings: 40, save: 1, time: 600, rate: 50,
  skills: { blocker: 99, builder: 99, basher: 99, miner: 99, digger: 99, bomber: 99 },
  entrances: [{ x: 60, y: 120 }],
  exits: [{ x: 860, y: 249 }],
  terrain: [
    { m: "metal", rect: [0, 280, 900, 20] },
    { m: "dirt", rect: [0, 200, 900, 80] },
    { m: "dirt", rect: [0, 150, 220, 50] },
    { m: "rock", rect: [300, 150, 40, 50] },        // bash me
    { m: "metal", rect: [420, 120, 16, 80] },       // indestructible wall
    { m: "air", rect: [500, 200, 50, 40] },          // pit
    { m: "water", rect: [500, 230, 50, 10] },        // coolant in pit
    { m: "oneway-right", rect: [620, 150, 30, 50] }, // one-way
    { m: "lava", rect: [700, 196, 30, 4] },
    { m: "air", rect: [700, 190, 30, 6] },
    { m: "tech", rect: [780, 250, 120, 30] },
    { m: "dirt", poly: [[740, 200], [800, 200], [800, 250], [790, 250]] },
  ],
});
