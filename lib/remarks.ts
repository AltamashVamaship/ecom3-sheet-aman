import { RowData } from '@/types';

// Only the internal column is a thread. vamaship_remarks is an ordinary editable
// cell, so it is deliberately absent here.
export const REMARK_COLUMNS = ['ops_remarks'] as const;

export type RemarkColumnId = (typeof REMARK_COLUMNS)[number];

const REMARK_COLUMN_IDS: ReadonlySet<string> = new Set(REMARK_COLUMNS);

export function isRemarkColumn(columnId: string): columnId is RemarkColumnId {
  return REMARK_COLUMN_IDS.has(columnId);
}

export interface RemarkMessage {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

const STAMP_LINE = /^\[(\d{1,2} [A-Za-z]{3} \d{4} \d{2}:\d{2})(?: ([^\]]*))?\] ?(.*)$/;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function columnText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stampToIso(stamp: string): string {
  const match = stamp.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return '';
  const monthIndex = MONTH_LABELS.indexOf(match[2]);
  const month = monthIndex >= 0 ? String(monthIndex + 1).padStart(2, '0') : '';
  if (!month) return '';
  const iso = `${match[3]}-${month}-${match[1].padStart(2, '0')}T${match[4]}:${match[5]}:00+05:30`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function formatStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const month = MONTH_LABELS[Number(value('month')) - 1] ?? '';
  return `${value('day')} ${month} ${value('year')} ${value('hour')}:${value('minute')}`;
}

export function parseRemarks(text: unknown, rowId: string): RemarkMessage[] {
  const messages: RemarkMessage[] = [];

  columnText(text).split('\n').forEach((line) => {
    const match = line.match(STAMP_LINE);
    if (match) {
      messages.push({
        id: `${rowId}-${messages.length}`,
        authorName: (match[2] || '').trim(),
        body: match[3] || '',
        createdAt: stampToIso(match[1]),
      });
      return;
    }

    if (line.trim() === '') return;

    const previous = messages[messages.length - 1];
    if (previous?.createdAt) {
      previous.body = previous.body ? `${previous.body}\n${line}` : line;
      return;
    }

    messages.push({
      id: `${rowId}-${messages.length}`,
      authorName: '',
      body: line,
      createdAt: '',
    });
  });

  return messages;
}

export function appendRemark(existing: unknown, body: string, authorName: string): string {
  const stamp = formatStamp(new Date());
  const author = authorName.trim();
  const line = `[${stamp}${author ? ` ${author}` : ''}] ${body}`;
  const base = columnText(existing).trim();
  return base === '' ? line : `${base}\n${line}`;
}

export function remarkSnapshot(row: RowData): string {
  return columnText(row.ops_remarks);
}
