import { describe, it, expect } from 'vitest';
import { tasksToCsv, parseTasksCsv } from './csv';

describe('tasksToCsv', () => {
  it('writes a header row and one row per task', () => {
    const csv = tasksToCsv([
      { title: 'First', description: 'A', status: 'TODO', priority: 'HIGH' },
      { title: 'Second', description: 'B', status: 'DONE', priority: 'LOW' },
    ]);
    const lines = csv.trim().split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('title,description,status,priority');
  });

  it('quotes values containing commas or quotes', () => {
    const csv = tasksToCsv([
      { title: 'Fix, urgently', description: 'He said "no"', status: 'TODO', priority: 'LOW' },
    ]);

    expect(csv).toContain('"Fix, urgently"');
    expect(csv).toContain('"He said ""no"""');
  });
});

describe('parseTasksCsv', () => {
  it('reads rows back out', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\nFirst,A,TODO,HIGH\n',
    );

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { title: 'First', description: 'A', status: 'TODO', priority: 'HIGH' },
    ]);
  });

  it('survives a round trip through tasksToCsv', () => {
    const original = [
      { title: 'Fix, urgently', description: 'He said "no"', status: 'DOING', priority: 'HIGH' },
    ];
    const { rows } = parseTasksCsv(tasksToCsv(original));

    expect(rows).toEqual(original);
  });

  it('reports rows with a missing title instead of importing them', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\n,A,TODO,HIGH\nGood,B,TODO,LOW\n',
    );

    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('2');
  });

  it('defaults an unknown priority to MEDIUM', () => {
    const { rows } = parseTasksCsv('title,description,status,priority\nA,,TODO,URGENT\n');
    expect(rows[0].priority).toBe('MEDIUM');
  });
});
