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

function splitLine(line) {
  const cells = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

export function parseTasksCsv(text = '') {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const rows = [];
  const errors = [];

  if (lines.length === 0) return { rows, errors };

  const header = splitLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const indexOf = (name) => header.indexOf(name);

  if (indexOf('title') === -1) {
    errors.push('The file needs a "title" column.');
    return { rows, errors };
  }

  for (let line = 1; line < lines.length; line += 1) {
    const cells = splitLine(lines[line]);
    const read = (name) => {
      const position = indexOf(name);
      return position === -1 ? '' : (cells[position] ?? '').trim();
    };

    const title = read('title');
    if (!title) {
      errors.push(`Row ${line + 1} was skipped because it has no title.`);
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
