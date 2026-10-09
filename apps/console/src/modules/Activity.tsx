import { useEffect, useState } from "react";
type Event = {
  resourceId: string;
  requestId: string;
  occurredAt: string;
  actorSubject: string;
  action: string;
  targetId: string;
  outcome: string;
};
export default function Activity() {
  const [environment, setEnvironment] = useState("production"),
    [rows, setRows] = useState<Event[]>([]),
    [errors, setErrors] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setRows([]);
    setErrors([]);
    const sources = [
      ["King’s Search", "/api/kings/audit?limit=100&environment="],
      ["Darts vs Squirts", "/api/games/darts-vs-squirts/audit?environment="],
    ];
    const results = await Promise.allSettled(
      sources.map(async ([, path]) => {
        const response = await fetch(path + environment, {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          throw Error();
        const body: { ok: boolean; data: Event[] } = await response.json();
        if (body.ok !== true || !Array.isArray(body.data)) throw Error();
        return body.data as Event[];
      }),
    );
    setRows(
      results
        .flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    );
    setErrors(
      results.flatMap((result, index) =>
        result.status === "rejected"
          ? [sources[index][0] + " activity is unavailable."]
          : [],
      ),
    );
    setBusy(false);
  }
  useEffect(() => {
    void refresh();
  }, [environment]);
  return (
    <section className="panel">
      <div className="section-heading">
        <label className="environment-picker">
          Environment
          <select
            disabled={busy}
            value={environment}
            onChange={(event) => setEnvironment(event.target.value)}
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
          </select>
        </label>
        <button disabled={busy} onClick={() => void refresh()}>
          {busy ? "Loading…" : "Refresh activity"}
        </button>
      </div>
      <p>
        Latest 100 records from each game backend. Includes committed actions
        and recorded domain rejections. Access denials and transient failures
        appear in Worker logs using the request ID.
      </p>
      {errors.map((error) => (
        <p key={error} className="notice" role="alert">
          {error}
        </p>
      ))}
      {!busy && !rows.length && !errors.length && (
        <p>No recorded console changes in this environment.</p>
      )}
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              {[
                "Time",
                "Game",
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
              <tr key={row.resourceId + row.requestId}>
                <td>{new Date(row.occurredAt).toLocaleString()}</td>
                <td>{row.resourceId}</td>
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
    </section>
  );
}
