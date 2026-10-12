import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, generateRows, sortFilter } from '../src/lib/rows.js';

test('generateRows: deterministic for a seed, shaped like the columns', () => {
  const a = generateRows(50, 7);
  const b = generateRows(50, 7);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, generateRows(50, 8));
  assert.equal(a.length, 50);
  for (const c of COLUMNS) assert.ok(c.key in a[0], `row has ${c.key}`);
  assert.equal(a[0].id, 1);
  assert.match(a[0].updated, /^\d{4}-\d{2}-\d{2}$/);
});

test('sortFilter: numeric and string sorts in both directions, as a transferable index array', () => {
  const rows = generateRows(200);
  const byScore = sortFilter(rows, { sort: 'score', dir: 1 });
  assert.ok(byScore instanceof Uint32Array);
  assert.equal(byScore.length, 200);
  for (let i = 1; i < byScore.length; i++) assert.ok(rows[byScore[i - 1]].score <= rows[byScore[i]].score);
  const byNameDesc = sortFilter(rows, { sort: 'name', dir: -1 });
  for (let i = 1; i < byNameDesc.length; i++) assert.ok(rows[byNameDesc[i - 1]].name >= rows[byNameDesc[i]].name);
});

test('sortFilter: filter matches name, team or status, case-insensitively', () => {
  const rows = generateRows(300);
  const robotics = sortFilter(rows, { filter: 'ROBOTICS', sort: 'id', dir: 1 });
  assert.ok(robotics.length > 0);
  for (const i of robotics) assert.equal(rows[i].team, 'Robotics');
  const archived = sortFilter(rows, { filter: 'archived', sort: 'id', dir: 1 });
  for (const i of archived) assert.equal(rows[i].status, 'archived');
  assert.equal(sortFilter(rows, { filter: 'no such thing', sort: 'id', dir: 1 }).length, 0);
});
