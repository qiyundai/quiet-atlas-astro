/** Format a Unix epoch (seconds) timestamp as a date. */
export function formatDate(epoch: number | string | null): string {
  if (epoch == null) return "—";
  const ts = typeof epoch === "string" ? parseInt(epoch, 10) : epoch;
  if (isNaN(ts)) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a Unix epoch (seconds) timestamp as a date + time. */
export function formatDateTime(epoch: number | string | null): string {
  if (epoch == null) return "—";
  const ts = typeof epoch === "string" ? parseInt(epoch, 10) : epoch;
  if (isNaN(ts)) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
