// Deterministic row generator and sort/filter, shared by the main thread and the worker.
const FIRST = ['Aiko', 'Ben', 'Chloe', 'Daniel', 'Eva', 'Farid', 'Greta', 'Hiro', 'Ines', 'Jonas', 'Kaia', 'Luis', 'Mina', 'Noah', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sven', 'Tomoko', 'Uma', 'Viktor', 'Wen', 'Yara', 'Zane'];
const LAST = ['Tanaka', 'Ortiz', 'Weber', 'Natarajan', 'Okafor', 'Lindqvist', 'Haddad', 'Moreau', 'Sato', 'Novak', 'Byrne', 'Costa'];
const TEAMS = ['Platform', 'Robotics', 'Vision', 'Logistics', 'Support', 'Research'];
const STATUS = ['active', 'paused', 'archived'];

export const COLUMNS = [
  { key: 'id', label: 'ID', numeric: true },
  { key: 'name', label: 'Name' },
  { key: 'team', label: 'Team' },
  { key: 'status', label: 'Status' },
  { key: 'score', label: 'Score', numeric: true },
  { key: 'updated', label: 'Updated' },
];

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRows(count, seed = 42) {
  const rnd = mulberry32(seed);
  const start = Date.UTC(2025, 0, 1);
  const rows = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: i + 1,
      name: `${FIRST[(rnd() * FIRST.length) | 0]} ${LAST[(rnd() * LAST.length) | 0]}`,
      team: TEAMS[(rnd() * TEAMS.length) | 0],
      status: STATUS[(rnd() * STATUS.length) | 0],
      score: Math.round(rnd() * 1000) / 10,
      updated: new Date(start + rnd() * 600 * 86400000).toISOString().slice(0, 10),
    };
  }
  return rows;
}

/** Returns the indices of matching rows, sorted. A typed array so it can be transferred from a worker. */
export function sortFilter(rows, { filter = '', sort = 'id', dir = 1 }) {
  const needle = filter.trim().toLowerCase();
  const indices = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!needle || r.name.toLowerCase().includes(needle) || r.team.toLowerCase().includes(needle) || r.status.includes(needle)) indices.push(i);
  }
  const numeric = typeof rows[0]?.[sort] === 'number';
  indices.sort(numeric
    ? (a, b) => (rows[a][sort] - rows[b][sort]) * dir
    : (a, b) => (rows[a][sort] < rows[b][sort] ? -1 : rows[a][sort] > rows[b][sort] ? 1 : 0) * dir);
  return Uint32Array.from(indices);
}
