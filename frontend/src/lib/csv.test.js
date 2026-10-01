import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_IMPORT_TASKS,
  MAX_TITLE_LENGTH,
  parseTasksCsv,
  parseTasksJson,
  sanitizeFormulaInjection,
  tasksToCsv,
  tasksToJson,
} from './csv.js';

describe('CSV Formula Injection Protection (CWE-1236)', () => {
  it('neutralizes cells starting with =', () => {
    assert.equal(sanitizeFormulaInjection('=SUM(1,2)'), "'=SUM(1,2)");
    const csv = tasksToCsv([{ title: '=SUM(1,2)', description: 'test', status: 'TODO', priority: 'LOW' }]);
    assert.match(csv, /"'=SUM\(1,2\)"/);
  });

  it('neutralizes cells starting with +', () => {
    assert.equal(sanitizeFormulaInjection('+CMD'), "'+CMD");
    const csv = tasksToCsv([{ title: '+CMD', description: 'test', status: 'TODO', priority: 'LOW' }]);
    assert.ok(csv.includes("'+CMD"));
  });

  it('neutralizes cells starting with -', () => {
    assert.equal(sanitizeFormulaInjection('-10+20'), "'-10+20");
    const csv = tasksToCsv([{ title: '-10+20', description: 'test', status: 'TODO', priority: 'LOW' }]);
    assert.ok(csv.includes("'-10+20"));
  });

  it('neutralizes cells starting with @', () => {
    assert.equal(sanitizeFormulaInjection('@HYPERLINK("http://evil.com")'), '\'@HYPERLINK("http://evil.com")');
    const csv = tasksToCsv([{ title: '@HYPERLINK("http://evil.com")', description: 'test', status: 'TODO', priority: 'LOW' }]);
    assert.match(csv, /"'@HYPERLINK\(""http:\/\/evil\.com""\)"/);
  });

  it('neutralizes cells with leading whitespace before formula character', () => {
    assert.equal(sanitizeFormulaInjection('   =SUM(1,2)'), "'   =SUM(1,2)");
    assert.equal(sanitizeFormulaInjection('\t=SUM(1,2)'), "'\t=SUM(1,2)");
  });

  it('leaves safe content unmodified', () => {
    assert.equal(sanitizeFormulaInjection('Normal task title'), 'Normal task title');
    assert.equal(sanitizeFormulaInjection(''), '');
    assert.equal(sanitizeFormulaInjection(null), '');
  });
});

describe('Task Count Limits', () => {
  it('rejects JSON imports exceeding MAX_IMPORT_TASKS', () => {
    const oversized = Array.from({ length: MAX_IMPORT_TASKS + 1 }, (_, i) => ({
      title: `Task ${i}`,
    }));
    const { rows, errors } = parseTasksJson(JSON.stringify(oversized));
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('exceeds the maximum limit')));
  });

  it('rejects CSV imports exceeding MAX_IMPORT_TASKS', () => {
    const header = 'title,description,status,priority\n';
    const lines = Array.from({ length: MAX_IMPORT_TASKS + 1 }, (_, i) => `Task ${i},,,`).join('\n');
    const { rows, errors } = parseTasksCsv(header + lines);
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('exceeds the maximum limit')));
  });
});

describe('String Limits & Sanitization', () => {
  it('rejects titles exceeding MAX_TITLE_LENGTH (150 chars)', () => {
    const longTitle = 'A'.repeat(MAX_TITLE_LENGTH + 1);
    const { rows, errors } = parseTasksJson(JSON.stringify([{ title: longTitle }]));
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('title exceeds 150 characters')));
  });

  it('rejects descriptions exceeding MAX_DESCRIPTION_LENGTH (40,000 chars)', () => {
    const longDesc = 'D'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    const { rows, errors } = parseTasksJson(JSON.stringify([{ title: 'Valid', description: longDesc }]));
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('description exceeds 40000 characters')));
  });

  it('trims whitespace and rejects blank titles', () => {
    const { rows, errors } = parseTasksJson(JSON.stringify([{ title: '   ' }]));
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('title is empty')));
  });
});

describe('Enum Validation', () => {
  it('rejects invalid status in JSON', () => {
    const { rows, errors } = parseTasksJson(
      JSON.stringify([{ title: 'Task', status: 'HACKED_STATUS' }]),
    );
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('invalid status "HACKED_STATUS"')));
  });

  it('rejects invalid priority in JSON', () => {
    const { rows, errors } = parseTasksJson(
      JSON.stringify([{ title: 'Task', priority: 'SUPER_CRITICAL' }]),
    );
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('invalid priority "SUPER_CRITICAL"')));
  });

  it('rejects invalid status in CSV', () => {
    const csv = 'title,status\nTask,INVALID_STATUS';
    const { rows, errors } = parseTasksCsv(csv);
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('invalid status "INVALID_STATUS"')));
  });

  it('rejects invalid priority in CSV', () => {
    const csv = 'title,priority\nTask,INVALID_PRIORITY';
    const { rows, errors } = parseTasksCsv(csv);
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('invalid priority "INVALID_PRIORITY"')));
  });

  it('defaults omitted status/priority safely', () => {
    const { rows, errors } = parseTasksJson(JSON.stringify([{ title: 'Task' }]));
    assert.equal(errors.length, 0);
    assert.equal(rows[0].status, 'TODO');
    assert.equal(rows[0].priority, 'MEDIUM');
  });
});

describe('Strict JSON Schema & Sensitive Field Rejection', () => {
  it('rejects JSON containing internal or sensitive fields', () => {
    const sensitiveItems = [
      { title: 'Task', workspaceId: 'fake-workspace-uuid' },
      { title: 'Task', id: 'fake-id' },
      { title: 'Task', token: 'fake-auth-token' },
      { title: 'Task', role: 'ADMIN' },
      { title: 'Task', creator: 'admin@teampulse.com' },
      { title: 'Task', assigneeId: 'fake-user-uuid' },
    ];

    for (const item of sensitiveItems) {
      const { rows, errors } = parseTasksJson(JSON.stringify([item]));
      assert.equal(rows.length, 0, `Failed to reject item with key: ${JSON.stringify(item)}`);
      assert.ok(errors.some((err) => err.includes('disallowed internal or sensitive field')));
    }
  });

  it('rejects CSV containing sensitive headers', () => {
    const csv = 'title,workspaceId\nTask,fake-workspace-uuid';
    const { rows, errors } = parseTasksCsv(csv);
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('disallowed sensitive column headers')));
  });

  it('rejects unrecognized keys in JSON item', () => {
    const { rows, errors } = parseTasksJson(
      JSON.stringify([{ title: 'Task', extraProperty: 'malicious' }]),
    );
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('unrecognized field(s) "extraProperty"')));
  });

  it('rejects non-array top-level JSON', () => {
    const { rows, errors } = parseTasksJson(JSON.stringify({ title: 'Task' }));
    assert.equal(rows.length, 0);
    assert.ok(errors.some((err) => err.includes('must be an array')));
  });

  it('rejects null or non-object items in JSON array', () => {
    const { rows, errors } = parseTasksJson(JSON.stringify([null, 42, 'string', []]));
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 4);
  });
});

describe('XSS & Malicious Content Safety', () => {
  it('stores HTML/XSS text as plain strings without execution', () => {
    const xssPayload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const { rows, errors } = parseTasksJson(
      JSON.stringify([{ title: xssPayload, description: xssPayload }]),
    );
    assert.equal(errors.length, 0);
    assert.equal(rows[0].title, xssPayload);
    assert.equal(rows[0].description, xssPayload);
  });
});

describe('UTF-8 BOM Handling', () => {
  it('handles UTF-8 BOM in JSON', () => {
    const jsonWithBom = '\ufeff' + JSON.stringify([{ title: 'BOM Task' }]);
    const { rows, errors } = parseTasksJson(jsonWithBom);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'BOM Task');
  });

  it('handles UTF-8 BOM in CSV', () => {
    const csvWithBom = '\ufefftitle,status\nBOM Task,DONE';
    const { rows, errors } = parseTasksCsv(csvWithBom);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'BOM Task');
    assert.equal(rows[0].status, 'DONE');
  });
});

describe('Export Privacy', () => {
  it('exports only safe fields and excludes internal IDs or secrets', () => {
    const tasks = [
      {
        id: 'uuid-1234',
        workspaceId: 'workspace-5678',
        userId: 'user-999',
        token: 'secret-token',
        title: 'Safe Task',
        description: 'Safe Description',
        status: 'DOING',
        priority: 'HIGH',
      },
    ];

    const jsonExport = JSON.parse(tasksToJson(tasks));
    assert.deepEqual(jsonExport, [
      {
        title: 'Safe Task',
        description: 'Safe Description',
        status: 'DOING',
        priority: 'HIGH',
      },
    ]);

    const csvExport = tasksToCsv(tasks);
    assert.equal(csvExport, 'title,description,status,priority\nSafe Task,Safe Description,DOING,HIGH');
  });
});
