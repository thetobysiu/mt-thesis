// Single-floor definitions in the published solver's text format (magic-tower-AI/test, data/floors/*.txt).
// Port of mota/game/ai_floor_loader.py: the same names, item values and coordinates (x = column, y = row).

export type MonsterDef = { tile: number; name: string; hp: number; atk: number; def: number; money: number; special: number };
export type Bonuses = { redGem: number; blueGem: number; greenGem: number; redPotion: number; bluePotion: number;
                        yellowPotion: number; greenPotion: number; sword: number; shield: number };
export type HeroState = { hp: number; atk: number; def: number; mdef: number; money: number;
                          yellow: number; blue: number; red: number; x: number; y: number };
export type FloorDef = {
  id: string; width: number; height: number;
  grid: number[][];                       // grid[y][x], tile numbers of the game
  bonuses: Bonuses;
  monsters: Record<number, MonsterDef>;   // by tile number
  shop: number[];                         // start, delta, hp, atk, def, mdef (unused on the thesis floors)
  hero: HeroState;
  text: string;                           // the original file
};

// Display names as the engine shows them: tile → game id (data.TILE_ENEMIES) → English name (data.MONSTER_NAMES_EN),
// falling back to the loader's own table (ai_floor_loader._ENGLISH_NAMES).
const TILE_ENEMIES: Record<number, string> = {
  201: "greenSlime", 202: "redSlime", 203: "blackSlime", 204: "slimelord", 205: "bat", 206: "bigBat", 207: "redBat",
  208: "vampire", 209: "skeleton", 210: "skeletonSoilder", 211: "skeletonCaptain", 212: "ghostSkeleton", 213: "zombie",
  214: "zombieKnight", 215: "rock", 216: "slimeMan", 217: "bluePriest", 218: "redPriest", 219: "brownWizard",
  220: "redWizard", 221: "yellowGuard", 222: "blueGuard", 223: "redGuard", 224: "swordsman", 225: "soldier",
  226: "yellowKnight", 227: "redKnight", 228: "darkKnight", 229: "blackKing", 230: "yellowKing", 231: "greenKing",
  232: "blueKnight", 233: "goldSlime", 234: "poisonSkeleton", 235: "poisonBat",
};
const NAMES_EN: Record<string, string> = {
  greenSlime: "Green Slime", redSlime: "Red Slime", blackSlime: "Black Slime", slimelord: "Slime Lord", bat: "Bat",
  bigBat: "Big Bat", redBat: "Red Bat", skeleton: "Skeleton", skeletonSoilder: "Skeleton Soldier",
  skeletonCaptain: "Skeleton Captain", ghostSkeleton: "Nether Captain", zombie: "Beast-Man", zombieKnight: "Beast Warrior",
  rock: "Rock Man", slimeMan: "Shadow Warrior", bluePriest: "Junior Mage", redPriest: "Senior Mage",
  brownWizard: "Hemp-Robe Mage", redWizard: "Red-Robe Mage", yellowGuard: "Junior Guard", blueGuard: "Mid Guard",
  redGuard: "Senior Guard", swordsman: "Two-Hand Swordsman", soldier: "Nether Warrior", yellowKnight: "Gold Sentinel",
  redKnight: "Gold Captain", darkKnight: "Spirit Warrior", blackKing: "Black Demon King", vampire: "Nether Demon King",
  poisonSkeleton: "Purple Skeleton", blueKnight: "Blue Knight", poisonBat: "Purple Bat", yellowKing: "Yellow Demon King",
  greenKing: "Green Demon King", goldSlime: "Gold Slime",
};
const LOADER_NAMES: Record<number, string> = {
  201: "Green Slime", 202: "Red Slime", 203: "Black Slime", 204: "Slime Lord", 205: "Bat", 206: "Big Bat",
  207: "Red Bat", 208: "Vampire", 209: "Skeleton", 210: "Skeleton Soldier", 211: "Skeleton Captain",
  212: "Ghost Skeleton", 213: "Zombie", 214: "Zombie Knight", 215: "Rock", 216: "Slime Man", 217: "Blue Priest",
  218: "Red Priest", 219: "Brown Wizard", 220: "Red Wizard", 221: "Yellow Guard", 222: "Blue Guard", 223: "Red Guard",
  224: "Swordsman", 225: "Soldier", 226: "Yellow Knight", 227: "Red Knight", 228: "Dark Knight", 229: "Black King",
  230: "Yellow King", 231: "Green King", 232: "Blue Knight", 233: "Gold Slime", 234: "Poison Skeleton", 235: "Poison Bat",
  299: "Boss",
};
export const monsterName = (tile: number): string =>
  NAMES_EN[TILE_ENEMIES[tile]] ?? LOADER_NAMES[tile] ?? `Enemy #${tile}`;

export function parseFloor(id: string, text: string): FloorDef {
  const nums = text.replace(/,/g, " ").split(/\s+/).filter(Boolean).map(Number);
  let i = 0;
  const next = () => {
    if (i >= nums.length) throw new Error(`${id}: floor file ends early`);
    return nums[i++];
  };
  const floors = next();
  const width = next(), height = next();
  if (floors !== 1) throw new Error(`${id}: ${floors} floors; only single floors are supported`);
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, next));
  const [redGem, blueGem, greenGem, redPotion, bluePotion, yellowPotion, greenPotion, sword, shield] = Array.from({ length: 9 }, next);
  const monsters: Record<number, MonsterDef> = {};
  const n = next();
  for (let k = 0; k < n; k++) {
    const [tile, hp, atk, def, money, special] = Array.from({ length: 6 }, next);
    monsters[tile] = { tile, name: monsterName(tile), hp, atk, def, money, special };
  }
  const shop = Array.from({ length: 6 }, next);
  const [hp, atk, def, mdef, money, yellow, blue, red, , row, col] = Array.from({ length: 11 }, next);
  return {
    id, width, height, grid, monsters, shop, text,
    bonuses: { redGem, blueGem, greenGem, redPotion, bluePotion, yellowPotion, greenPotion, sword, shield },
    hero: { hp, atk, def, mdef, money, yellow, blue, red, x: col, y: row },
  };
}
