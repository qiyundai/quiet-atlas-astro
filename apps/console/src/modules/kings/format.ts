/** Older D1 defaults use seconds; game-created records also use milliseconds. */
function timestamp(epoch: number | string | null): number | null {
  if (epoch == null || epoch === '') return null;
  const numeric = Number(epoch);
  const ts = Number.isFinite(numeric) ? (Math.abs(numeric) >= 100_000_000_000 ? numeric : numeric * 1000) : typeof epoch === 'string' ? Date.parse(epoch) : NaN;
  return Number.isFinite(ts) && !Number.isNaN(new Date(ts).getTime()) ? ts : null;
}

export function formatDate(epoch: number | string | null): string {
  const ts = timestamp(epoch);
  if (ts === null) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format either stored timestamp representation as a date + time. */
export function formatDateTime(epoch: number | string | null): string {
  const ts = timestamp(epoch);
  if (ts === null) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
