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

  it('survives a round trip when the description contains a newline', () => {
    const original = [
      { title: 'Multi', description: 'Line1\nLine2', status: 'DOING', priority: 'HIGH' },
    ];
    const { rows, errors } = parseTasksCsv(tasksToCsv(original));

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows).toEqual(original);
  });

  it('survives a round trip when the description mixes a newline, a comma, and a quote', () => {
    const original = [
      {
        title: 'Complex',
        description: 'Line1\nLine2, with a comma and a "quote"',
        status: 'TODO',
        priority: 'LOW',
      },
    ];
    const { rows, errors } = parseTasksCsv(tasksToCsv(original));

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows).toEqual(original);
  });

  it('reports an error and returns no rows when the header has no title column', () => {
    const { rows, errors } = parseTasksCsv('description,status,priority\nA,TODO,LOW\n');

    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('title');
  });

  it('parses CRLF line endings the same as LF, leaving no stray carriage return', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\r\nFirst,"Line1\r\nLine2",TODO,HIGH\r\n',
    );

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { title: 'First', description: 'Line1\nLine2', status: 'TODO', priority: 'HIGH' },
    ]);
  });

  it('recognises the title header even behind a leading UTF-8 BOM', () => {
    const { rows, errors } = parseTasksCsv(
      '﻿title,description,status,priority\nFirst,A,TODO,HIGH\n',
    );

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { title: 'First', description: 'A', status: 'TODO', priority: 'HIGH' },
    ]);
  });

  it('defaults missing fields when a row has fewer cells than the header', () => {
    const { rows, errors } = parseTasksCsv('title,description,status,priority\nOnlyTitle\n');

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { title: 'OnlyTitle', description: '', status: 'TODO', priority: 'MEDIUM' },
    ]);
  });

  it('does not crash when a row has more cells than the header', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\nFirst,A,TODO,HIGH,extra,stuff\n',
    );

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { title: 'First', description: 'A', status: 'TODO', priority: 'HIGH' },
    ]);
  });

  it('does not let a blank line shift the reported line number of a later malformed row', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\nGood,A,TODO,LOW\n\n,B,TODO,HIGH\n',
    );

    expect(rows).toEqual([{ title: 'Good', description: 'A', status: 'TODO', priority: 'LOW' }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Row 4 was skipped because it has no title.');
  });
});
