export const MAX_IMPORT_TASKS = 500;
export const MAX_TITLE_LENGTH = 150;
export const MAX_DESCRIPTION_LENGTH = 40000;

export const STATUSES = Object.freeze(['TODO', 'DOING', 'DONE']);
export const PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);

const COLUMNS = ['title', 'description', 'status', 'priority'];
const ALLOWED_TASK_KEYS = new Set(COLUMNS);
const SENSITIVE_TASK_KEYS = new Set([
  'id',
  'workspaceid',
  'userid',
  'creator',
  'createdby',
  'token',
  'role',
  'timestamp',
  'timestamps',
  'createdat',
  'updatedat',
  'assignee',
  'assigneeid',
]);

/**
 * Sanitizes cell values against CSV Formula Injection (CWE-1236).
 * If the first non-whitespace character is =, +, -, or @,
 * prepends a single quote to instruct spreadsheet applications to treat the cell as plain text.
 */
export function sanitizeFormulaInjection(value) {
  if (value == null) return '';
  const text = String(value);
  const trimmed = text.trimStart();
  if (trimmed.length > 0 && /^[=+\-@]/.test(trimmed)) {
    return `'${text}`;
  }
  return text;
}

function escapeCell(value) {
  const text = sanitizeFormulaInjection(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function tasksToCsv(tasks = []) {
  const header = COLUMNS.join(',');
  const rows = tasks.map((task) =>
    COLUMNS.map((key) => escapeCell(task[key])).join(','),
  );
  return [header, ...rows].join('\n');
}

function tokenizeCsv(text) {
  const records = [];
  let cells = [];
  let cell = '';
  let inQuotes = false;
  let line = 1;
  let recordLine;
  let hasPendingRecord = false;

  function endCell() {
    cells.push(cell);
    cell = '';
  }

  function endRecord() {
    endCell();
    records.push({ line: recordLine, cells });
    cells = [];
    hasPendingRecord = false;
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\r') continue;

    if (!hasPendingRecord) {
      recordLine = line;
      hasPendingRecord = true;
    }

    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else if (char === '\n') {
        cell += char;
        line += 1;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      endCell();
    } else if (char === '\n') {
      endRecord();
      line += 1;
    } else {
      cell += char;
    }
  }

  if (hasPendingRecord) endRecord();

  return records;
}

function isBlankRecord(record) {
  return record.cells.length === 1 && record.cells[0].trim() === '';
}

export function parseTasksCsv(text = '') {
  const rows = [];
  const errors = [];

  if (!text || text.trim() === '') {
    errors.push('The file is empty.');
    return { rows, errors };
  }

  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = tokenizeCsv(source).filter((record) => !isBlankRecord(record));

  if (records.length === 0) {
    errors.push('The file is empty.');
    return { rows, errors };
  }

  const [headerRecord, ...dataRecords] = records;
  const header = headerRecord.cells.map((cell) => cell.trim().toLowerCase());
  const indexOf = (name) => header.indexOf(name);

  if (indexOf('title') === -1) {
    errors.push('The file needs a "title" column.');
    return { rows, errors };
  }

  const hasSensitiveHeader = header.some((col) => SENSITIVE_TASK_KEYS.has(col));
  if (hasSensitiveHeader) {
    errors.push('The CSV file contains disallowed sensitive column headers.');
    return { rows, errors };
  }

  if (dataRecords.length > MAX_IMPORT_TASKS) {
    errors.push(
      `The file contains ${dataRecords.length} tasks, which exceeds the maximum limit of ${MAX_IMPORT_TASKS} tasks per import.`,
    );
    return { rows, errors };
  }

  for (const record of dataRecords) {
    const read = (name) => {
      const position = indexOf(name);
      return position === -1 ? '' : (record.cells[position] ?? '').trim();
    };

    const title = read('title');
    if (!title) {
      errors.push(`Row ${record.line} was skipped because it has no title.`);
      continue;
    }

    if (title.length > MAX_TITLE_LENGTH) {
      errors.push(
        `Row ${record.line} was skipped: title exceeds ${MAX_TITLE_LENGTH} characters (got ${title.length}).`,
      );
      continue;
    }

    const description = read('description');
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `Row ${record.line} was skipped: description exceeds ${MAX_DESCRIPTION_LENGTH} characters.`,
      );
      continue;
    }

    const rawStatus = read('status').toUpperCase();
    if (rawStatus && !STATUSES.includes(rawStatus)) {
      errors.push(
        `Row ${record.line} was skipped: invalid status "${rawStatus}". Allowed values: ${STATUSES.join(', ')}.`,
      );
      continue;
    }
    const status = rawStatus || 'TODO';

    const rawPriority = read('priority').toUpperCase();
    if (rawPriority && !PRIORITIES.includes(rawPriority)) {
      errors.push(
        `Row ${record.line} was skipped: invalid priority "${rawPriority}". Allowed values: ${PRIORITIES.join(', ')}.`,
      );
      continue;
    }
    const priority = rawPriority || 'MEDIUM';

    rows.push({
      title,
      description,
      status,
      priority,
    });
  }

  return { rows, errors };
}

export function tasksToJson(tasks = []) {
  const sanitized = tasks.map((task) => ({
    title: typeof task.title === 'string' ? task.title : '',
    description: typeof task.description === 'string' ? task.description : '',
    status: STATUSES.includes(task.status) ? task.status : 'TODO',
    priority: PRIORITIES.includes(task.priority) ? task.priority : 'MEDIUM',
  }));
  return JSON.stringify(sanitized, null, 2);
}

export function parseTasksJson(text = '') {
  const rows = [];
  const errors = [];

  if (!text || text.trim() === '') {
    errors.push('The file is empty.');
    return { rows, errors };
  }

  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  let data;
  try {
    data = JSON.parse(source);
  } catch (parseError) {
    errors.push(`Invalid JSON format: ${parseError.message}`);
    return { rows, errors };
  }

  if (!Array.isArray(data)) {
    errors.push('Top-level JSON value must be an array of task objects.');
    return { rows, errors };
  }

  if (data.length === 0) {
    return { rows, errors };
  }

  if (data.length > MAX_IMPORT_TASKS) {
    errors.push(
      `The file contains ${data.length} tasks, which exceeds the maximum limit of ${MAX_IMPORT_TASKS} tasks per import.`,
    );
    return { rows, errors };
  }

  for (let index = 0; index < data.length; index += 1) {
    const item = data[index];
    const itemNum = index + 1;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Item ${itemNum} was skipped because it is not a valid task object.`);
      continue;
    }

    const itemKeys = Object.keys(item);
    const hasSensitiveKey = itemKeys.some((k) => SENSITIVE_TASK_KEYS.has(k.toLowerCase()));
    if (hasSensitiveKey) {
      errors.push(
        `Item ${itemNum} was skipped: contains disallowed internal or sensitive field(s).`,
      );
      continue;
    }

    const unrecognizedKeys = itemKeys.filter((k) => !ALLOWED_TASK_KEYS.has(k));
    if (unrecognizedKeys.length > 0) {
      errors.push(
        `Item ${itemNum} was skipped: contains unrecognized field(s) "${unrecognizedKeys.join(', ')}". Allowed fields: ${COLUMNS.join(', ')}.`,
      );
      continue;
    }

    if (typeof item.title !== 'string') {
      errors.push(`Item ${itemNum} was skipped because title must be a string.`);
      continue;
    }

    const title = item.title.trim();
    if (!title) {
      errors.push(`Item ${itemNum} was skipped because title is empty.`);
      continue;
    }

    if (title.length > MAX_TITLE_LENGTH) {
      errors.push(
        `Item ${itemNum} was skipped: title exceeds ${MAX_TITLE_LENGTH} characters (got ${title.length}).`,
      );
      continue;
    }

    let description = '';
    if (item.description != null) {
      if (typeof item.description !== 'string') {
        errors.push(`Item ${itemNum} was skipped: description must be a string.`);
        continue;
      }
      description = item.description;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push(
          `Item ${itemNum} was skipped: description exceeds ${MAX_DESCRIPTION_LENGTH} characters.`,
        );
        continue;
      }
    }

    let status = 'TODO';
    if (item.status != null) {
      if (typeof item.status !== 'string') {
        errors.push(`Item ${itemNum} was skipped: status must be a string.`);
        continue;
      }
      const rawStatus = item.status.trim().toUpperCase();
      if (rawStatus && !STATUSES.includes(rawStatus)) {
        errors.push(
          `Item ${itemNum} was skipped: invalid status "${rawStatus}". Allowed values: ${STATUSES.join(', ')}.`,
        );
        continue;
      }
      status = rawStatus || 'TODO';
    }

    let priority = 'MEDIUM';
    if (item.priority != null) {
      if (typeof item.priority !== 'string') {
        errors.push(`Item ${itemNum} was skipped: priority must be a string.`);
        continue;
      }
      const rawPriority = item.priority.trim().toUpperCase();
      if (rawPriority && !PRIORITIES.includes(rawPriority)) {
        errors.push(
          `Item ${itemNum} was skipped: invalid priority "${rawPriority}". Allowed values: ${PRIORITIES.join(', ')}.`,
        );
        continue;
      }
      priority = rawPriority || 'MEDIUM';
    }

    rows.push({
      title,
      description,
      status,
      priority,
    });
  }

  return { rows, errors };
}

export function downloadFile(filename, content, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
