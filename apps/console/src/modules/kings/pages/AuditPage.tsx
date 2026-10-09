import { useEffect, useState } from "react";
import { fetchAudit, type AuditEvent } from "../api";
export function AuditPage() {
  const [rows, setRows] = useState<AuditEvent[]>([]),
    [offset, setOffset] = useState(0),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchAudit(offset)
      .then((result) => {
        if (alive) {
          setRows(result.data ?? []);
          setTotal(result.total ?? 0);
        }
      })
      .catch((failure) => {
        if (alive) setError(failure.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [offset]);
  return (
    <section className="panel">
      <h2>Administration activity</h2>
      <p>
        Committed changes and rejected commands are recorded by the game
        backend. Retrying an uncertain request uses the same command key.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading activity…</p>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {[
                  "Time",
                  "Action",
                  "Target",
                  "Outcome",
                  "Actor subject",
                  "Request",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.requestId}>
                  <td>{new Date(row.occurredAt).toLocaleString()}</td>
                  <td>{row.action}</td>
                  <td>{row.targetId || "—"}</td>
                  <td>{row.outcome}</td>
                  <td>{row.actorSubject}</td>
                  <td>{row.requestId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>{total} events</p>
      <button
        disabled={loading || offset === 0}
        onClick={() => setOffset(Math.max(0, offset - 50))}
      >
        Previous
      </button>{" "}
      <button
        disabled={loading || offset + 50 >= total}
        onClick={() => setOffset(offset + 50)}
      >
        Next
      </button>
    </section>
  );
}
