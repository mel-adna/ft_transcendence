const COLUMNS = ['title', 'description', 'status', 'priority'];
const STATUSES = ['TODO', 'DOING', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function escapeCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function tasksToCsv(tasks = []) {
  const header = COLUMNS.join(',');
  const rows = tasks.map((task) => COLUMNS.map((key) => escapeCell(task[key])).join(','));
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
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = tokenizeCsv(source).filter((record) => !isBlankRecord(record));
  const rows = [];
  const errors = [];

  if (records.length === 0) return { rows, errors };

  const [headerRecord, ...dataRecords] = records;
  const header = headerRecord.cells.map((cell) => cell.trim().toLowerCase());
  const indexOf = (name) => header.indexOf(name);

  if (indexOf('title') === -1) {
    errors.push('The file needs a "title" column.');
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

    const status = read('status').toUpperCase();
    const priority = read('priority').toUpperCase();

    rows.push({
      title,
      description: read('description'),
      status: STATUSES.includes(status) ? status : 'TODO',
      priority: PRIORITIES.includes(priority) ? priority : 'MEDIUM',
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
