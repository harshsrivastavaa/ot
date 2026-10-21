const IST_OFFSET_MS = 330 * 60 * 1000;

function parseSlot(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(value.getTime()) || istDateString(value) !== date) return null;
  return value;
}

function istDateString(value) {
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function istWeekBounds(value) {
  const local = new Date(value.getTime() + IST_OFFSET_MS);
  const day = local.getUTCDay();
  const mondayShift = (day + 6) % 7;
  const startLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - mondayShift,
  );
  return {
    start: new Date(startLocal - IST_OFFSET_MS),
    end: new Date(startLocal + 7 * 86400000 - IST_OFFSET_MS),
  };
}

function istTimeString(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(value);
}

module.exports = { parseSlot, istDateString, istTimeString, istWeekBounds };
