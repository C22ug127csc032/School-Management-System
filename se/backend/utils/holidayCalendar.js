const INDIA_TIMEZONE = 'Asia/Kolkata';

const toDateKey = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: INDIA_TIMEZONE });
};

const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();

const unfoldIcsLines = content => String(content || '')
  .replace(/\r\n[ \t]/g, '')
  .replace(/\n[ \t]/g, '')
  .split(/\r?\n/);

const parseIcsDate = rawValue => {
  const value = String(rawValue || '').trim();
  if (!value) return null;

  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month, day));
  }

  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const hours = Number(value.slice(9, 11));
    const minutes = Number(value.slice(11, 13));
    const seconds = Number(value.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseGoogleHolidayIcs = content => {
  const lines = unfoldIcsLines(content);
  const events = [];
  let current = null;

  lines.forEach(line => {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      return;
    }

    if (line === 'END:VEVENT') {
      if (current?.summary && current?.startDate) {
        events.push(current);
      }
      current = null;
      return;
    }

    if (!current) return;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const keyPart = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    const key = keyPart.split(';')[0];

    if (key === 'SUMMARY') {
      current.summary = normalizeText(value);
    } else if (key === 'DTSTART') {
      current.startDate = parseIcsDate(value);
    }
  });

  return events;
};

export const fetchGovernmentHolidayRecords = async ({ startDate, endDate, calendarUrl }) => {
  if (!calendarUrl || !startDate || !endDate) return [];

  try {
    const response = await fetch(calendarUrl, {
      headers: {
        Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Holiday calendar returned ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseGoogleHolidayIcs(icsText);
    const startKey = toDateKey(startDate);
    const endKey = toDateKey(endDate);

    return events
      .filter(event => {
        const eventKey = toDateKey(event.startDate);
        return eventKey && eventKey >= startKey && eventKey <= endKey;
      })
      .map(event => ({
        date: event.startDate,
        holidayReason: event.summary || 'Government Holiday',
        holidaySource: 'government_calendar',
      }));
  } catch (error) {
    console.error('Government holiday calendar fetch failed:', error.message);
    return [];
  }
};

export const mergeHolidayRecords = (...recordGroups) => {
  const merged = new Map();

  recordGroups.flat().forEach(record => {
    const dateKey = toDateKey(record?.date);
    if (!dateKey) return;

    const nextReason = normalizeText(record?.holidayReason) || 'Holiday';
    const existing = merged.get(dateKey);

    if (!existing) {
      merged.set(dateKey, { ...record, date: new Date(record.date), holidayReason: nextReason });
      return;
    }

    const existingSource = existing.holidaySource || '';
    const nextSource = record?.holidaySource || '';
    const preferNext = existingSource === 'government_calendar' && nextSource !== 'government_calendar';

    if (preferNext) {
      merged.set(dateKey, { ...record, date: new Date(record.date), holidayReason: nextReason });
      return;
    }

    if (!existing.holidayReason || existing.holidayReason === 'Holiday') {
      existing.holidayReason = nextReason;
    }
  });

  return [...merged.values()];
};
