import { useEffect, useState } from "react";
interface Usage {
  schemaVersion: 1;
  available: boolean;
  collectedAt: string;
  scope: string;
  monthStart: string | null;
  monthlyBudgetUsd: number;
  error: string | null;
  workers:
    | {
        resourceId: string;
        service: string;
        requests: number;
        cpuTimeUs: number;
        errors: number;
        cpuP95Us: number;
        cpuP99Us: number;
      }[]
    | null;
  durableObjects: {
    requests: number;
    errors: number;
    durationGbSeconds: number;
    rowsRead: number;
    rowsWritten: number;
  } | null;
  turn: { account_egress_gb: number; game_egress_gb: number | null } | null;
  cost: {
    observed_estimate_usd: number;
    projected_usd: number;
    note: string;
  } | null;
}
const n = (value: number | null | undefined) =>
  value == null
    ? "Unavailable"
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
export default function Infrastructure() {
  const [data, setData] = useState<Usage | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setData(null);
    setError("");
    try {
      const response = await fetch("/api/infrastructure", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw Error(
          "Infrastructure data could not be loaded. Check your owner session and retry.",
        );
      const result: Usage = await response.json();
      if (result.schemaVersion !== 1)
        throw Error("Unsupported infrastructure response.");
      setData(result);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Infrastructure unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <>
      <div className="section-heading">
        <p>
          {data
            ? `Account usage · checked ${new Date(data.collectedAt).toLocaleString()}`
            : busy
              ? "Collecting account usage…"
              : "Infrastructure has not been checked."}
        </p>
        <button disabled={busy} onClick={() => void refresh()}>
          {busy ? "Loading…" : "Refresh usage"}
        </button>
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {data && (
        <>
          <section className="panel">
            <h2>Usage and monthly budget</h2>
            <p>
              US${n(data.monthlyBudgetUsd)} monthly soft budget.{" "}
              {data.monthStart
                ? `Calendar month beginning ${data.monthStart}.`
                : ""}
            </p>
            {data.available ? (
              <>
                <p>
                  Observed estimate US${n(data.cost?.observed_estimate_usd)} ·
                  projected month-end US${n(data.cost?.projected_usd)}.
                </p>
                <p>{data.cost?.note}</p>
              </>
            ) : (
              <p>
                {data.error === "analytics_not_configured"
                  ? "The account-restricted analytics read credential is not configured."
                  : "Cloudflare account usage is unavailable."}{" "}
                Unknown usage is not zero spending.
              </p>
            )}
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Cloudflare billing and metrics ↗
            </a>
          </section>
          <section className="panel">
            <h2>Game and console Workers</h2>
            <p>
              Cloudflare sampled account analytics. CPU units below are
              converted from microseconds to milliseconds. API request volume
              does not measure concurrent humans.
            </p>
            {data.workers ? (
              <div className="table-scroll">
                <table className="audit-table">
                  <thead>
                    <tr>
                      {[
                        "Game",
                        "Service",
                        "Requests",
                        "Errors",
                        "Total CPU ms",
                        "CPU p95 ms",
                        "CPU p99 ms",
                      ].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.workers.map((row) => (
                      <tr key={row.service}>
                        <td>{row.resourceId}</td>
                        <td>{row.service}</td>
                        <td>{n(row.requests)}</td>
                        <td>{n(row.errors)}</td>
                        <td>{n(row.cpuTimeUs / 1000)}</td>
                        <td>{n(row.cpuP95Us / 1000)}</td>
                        <td>{n(row.cpuP99Us / 1000)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Worker metrics unavailable.</p>
            )}
          </section>
          <section className="panel">
            <h2>Durable Objects and TURN</h2>
            <p>
              Account totals across all services:{" "}
              {n(data.durableObjects?.requests)} DO invocations,{" "}
              {n(data.durableObjects?.errors)} errors,{" "}
              {n(data.durableObjects?.durationGbSeconds)} GB-seconds of
              duration, {n(data.durableObjects?.rowsRead)} rows read and{" "}
              {n(data.durableObjects?.rowsWritten)} rows written.
            </p>
            <p>
              TURN account egress {n(data.turn?.account_egress_gb)} GB · Darts
              key-attributed egress {n(data.turn?.game_egress_gb)} GB.
            </p>
            <p>
              Website traffic, performance ratings and the published build are
              available in the website workspace. Pages deployment history, D1
              storage and invoice totals have separate sources. Game activity
              and admission limits are available in each game workspace.
            </p>
          </section>
        </>
      )}
    </>
  );
}
