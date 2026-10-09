import { useEffect, useRef, useState } from "react";
type Budgets = {
  rooms: number;
  credentials: number;
  max_rooms: number;
  max_credentials: number;
  paused: boolean;
  updated_at: number;
};
type Analytics = {
  queried_at: number;
  truncated: boolean;
  sample_rows: number;
  reliability: { attempts: number; failures: number; p95_ms: number | null };
  outcomes: {
    event: string;
    build: string;
    operation: string;
    outcome: string;
    count: number;
  }[];
  metrics: Record<
    string,
    {
      weighted_samples: number;
      p50: number | null;
      p95: number | null;
      p99: number | null;
    }
  >;
  timeline: {
    time: string;
    count: number;
    operation: string;
    outcome: string;
  }[];
};
interface Snapshot {
  schemaVersion: 1;
  resourceId: "darts-vs-squirts";
  collectedAt: string;
  environment: string;
  options: {
    hours: number;
    environment: string;
    build: string;
    filters: Record<string, string>;
  };
  occupancy: {
    rooms: number;
    humans: number;
    observedAt: string;
    lastReportAt: string;
    leaseSeconds: number;
  } | null;
  budgets: Budgets | null;
  analytics: Analytics | null;
  pollAt: string | null;
  pollFresh: boolean;
  collectionErrors?: string[];
  cost: {
    observed_estimate_usd: number;
    projected_usd: number;
    note: string;
  } | null;
  turn: { account_egress_gb: number; game_egress_gb: number | null } | null;
  alerts: { key: string; severity: string; active: boolean }[];
  notifications: { configured: boolean; deliveryFailed: boolean };
  errors: string[];
}
const choices: Record<string, string[]> = {
  platform: ["Windows", "Linux", "macOS", "Web", "Other"],
  map: ["house", "konbini", "lobby"],
  mode: ["toybox", "deathmatch", "team_deathmatch", "lobby"],
  role: ["host", "guest"],
  route: ["direct", "relay", "mixed", "unknown"],
};
const collectionSources: Record<string, string> = {
  production_budget_unavailable: "production admission counters",
  staging_budget_unavailable: "staging admission counters",
  health_unavailable: "signaling readiness",
  analytics_unavailable: "admission analytics",
  resources_unavailable: "account resource usage",
};
const value = (number: number | null | undefined) =>
  number == null
    ? "Unavailable"
    : number.toLocaleString(undefined, { maximumFractionDigits: 2 });
function Metric({
  label,
  number,
  note,
}: {
  label: string;
  number: number | null | undefined;
  note: string;
}) {
  return (
    <section className="panel metric">
      <h3>{label}</h3>
      <strong>{value(number)}</strong>
      <p>{note}</p>
    </section>
  );
}
export default function DartsMonitoring() {
  const [options, setOptions] = useState<Record<string, string>>({
    hours: "24",
    environment: "production",
    build: "",
  });
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const [audit, setAudit] = useState<
      {
        requestId: string;
        occurredAt: string;
        action: string;
        actorSubject: string;
        outcome: string;
      }[]
    >([]),
    [auditError, setAuditError] = useState("");
  const retries = useRef(new Map<string, string>());
  const historyController = useRef<AbortController | null>(null);
  async function history(environment: string) {
    historyController.current?.abort();
    const controller = new AbortController();
    historyController.current = controller;
    setAudit([]);
    setAuditError("");
    try {
      const response = await fetch(
        "/api/games/darts-vs-squirts/audit?" +
          new URLSearchParams({ environment }),
        { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw Error();
      const body: { data: typeof audit } = await response.json();
      if (!controller.signal.aborted) setAudit(body.data ?? []);
    } catch {
      if (!controller.signal.aborted) setAuditError(
        "Activity is unavailable. Retry monitoring to check again.",
      );
    }
  }
  async function act() {
    if (!pending || busy) return;
    const scope = options.environment + ":" + pending;
    if (!retries.current.has(scope))
      retries.current.set(scope, crypto.randomUUID());
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(
        "/api/games/darts-vs-squirts/admission?" +
          new URLSearchParams({ environment: options.environment }),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": retries.current.get(scope)!,
          },
          body: JSON.stringify({ action: pending }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw Error(
          "Your owner session may have expired. Sign in again, then retry.",
        );
      const result: { ok: boolean; requestId?: string } = await response.json();
      if (!response.ok || result.ok !== true) {
        if (response.status >= 400 && response.status < 500)
          retries.current.delete(scope);
        throw Error(
          `Change could not be confirmed. ${result.requestId ? "Request " + result.requestId : ""} Retry uses the same command key.`,
        );
      }
      retries.current.delete(scope);
      setPending(null);
      await refresh();
    } catch (failure) {
      setActionError(
        failure instanceof Error
          ? failure.message
          : "Change could not be confirmed. Retry uses the same command key.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh(query = options, signal?: AbortSignal) {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const response = await fetch(
        "/api/games/darts-vs-squirts/monitoring?" +
          new URLSearchParams(
            Object.entries(query).filter(([, value]) => value),
          ),
        {
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw Error(
          response.status === 401 ||
            response.status === 403 ||
            response.redirected
            ? "Your owner session expired. Sign in again."
            : "Monitoring could not be loaded. Retry shortly.",
        );
      const snapshot: Snapshot = await response.json();
      if (
        snapshot.schemaVersion !== 1 ||
        snapshot.resourceId !== "darts-vs-squirts"
      )
        throw Error("The monitoring response is unsupported.");
      if (!signal?.aborted) {
        setData(snapshot);
        void history(query.environment);
      }
    } catch (failure) {
      if (!signal?.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Monitoring unavailable.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void refresh(options, controller.signal);
    return () => {
      controller.abort();
      historyController.current?.abort();
    };
  }, []);
  const change = (key: string, newValue: string) => {
    historyController.current?.abort();
    setOptions((previous) => ({ ...previous, [key]: newValue }));
    setData(null);
    setPending(null);
    setAudit([]);
    setAuditError("");
  };
  const analytics = data?.analytics;
  const timeline = new Map<string, number>();
  for (const point of analytics?.timeline ?? [])
    timeline.set(
      point.time,
      (timeline.get(point.time) ?? 0) + Number(point.count),
    );
  const buckets = [...timeline.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const peak = Math.max(1, ...buckets.map(([, count]) => count));
  return (
    <div className="darts-monitoring">
      <form
        className="panel monitor-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh();
        }}
      >
        <fieldset
          disabled={loading || busy || !!pending}
          className="monitor-filters"
        >
          <label>
            Window
            <select
              value={options.hours}
              onChange={(event) => change("hours", event.target.value)}
            >
              {[
                [1, "1 hour"],
                [24, "24 hours"],
                [168, "7 days"],
                [2160, "90 days"],
              ].map(([hours, label]) => (
                <option key={hours} value={hours}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Environment
            <select
              value={options.environment}
              onChange={(event) => change("environment", event.target.value)}
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </label>
          <label>
            Build
            <input
              value={options.build}
              maxLength={64}
              placeholder="All builds"
              onChange={(event) => change("build", event.target.value)}
            />
          </label>
          {Object.entries(choices).map(([key, values]) => (
            <label key={key}>
              {key}
              <select
                value={options[key] ?? ""}
                onChange={(event) => change(key, event.target.value)}
              >
                <option value="">All</option>
                {values.map((choice) => (
                  <option key={choice}>{choice}</option>
                ))}
              </select>
            </label>
          ))}
          <button disabled={loading}>
            {loading ? "Loading…" : "Refresh monitoring"}
          </button>
        </fieldset>
      </form>
      <p role="status">
        {data
          ? `${data.environment} · checked ${new Date(data.collectedAt).toLocaleString()} · analytics window ${data.options.hours} hours`
          : loading
            ? "Loading current monitoring…"
            : "Refresh to load the selected window."}
      </p>
      {error && (
        <p className="notice" role="alert">
          {error} <a href="/cdn-cgi/access/logout">Sign in again</a>
        </p>
      )}
      {data && (
        <>
          <div className="resource-grid">
            <Metric
              label="Observed rooms"
              number={data.occupancy?.rooms}
              note="Connected signaling rooms; 150-second leases."
            />
            <Metric
              label="Observed members"
              number={data.occupancy?.humans}
              note="Recently connected members, excluding bots; an occupancy estimate."
            />
          </div>
          <section className="panel">
            <h2>Admission budgets</h2>
            {data.budgets ? (
              <>
                <p>
                  {value(data.budgets.rooms)} / {value(data.budgets.max_rooms)}{" "}
                  room attempts this UTC hour ·{" "}
                  {value(data.budgets.credentials)} /{" "}
                  {value(data.budgets.max_credentials)} credential attempts this
                  UTC day.
                </p>
                <span className="badge">
                  {data.budgets.paused ? "New rooms paused" : "New rooms open"}
                </span>{" "}
                <button
                  disabled={loading || busy || !!pending}
                  onClick={() => {
                    setPending(
                      data.budgets!.paused
                        ? "admission_resume"
                        : "admission_pause",
                    );
                    setActionError("");
                  }}
                >
                  {data.budgets.paused ? "Resume new rooms" : "Pause new rooms"}
                </button>
              </>
            ) : (
              <p>Admission counters are unavailable.</p>
            )}
            <p>
              Attempts include failures and rejoins. These limits do not measure
              concurrent capacity or unique daily players.
            </p>
            {pending && (
              <section role="alertdialog" aria-label="Confirm admission change">
                <h3>
                  {pending === "admission_pause" ? "Pause" : "Resume"} new rooms
                  in {options.environment}?
                </h3>
                <p>
                  Existing rooms keep their connections and credential refresh.
                  Admission counters and limits stay unchanged. This action is
                  recorded by the game backend.
                </p>
                {actionError && <p role="alert">{actionError}</p>}
                <button disabled={busy} onClick={() => void act()}>
                  {busy ? "Applying…" : "Confirm change"}
                </button>{" "}
                <button disabled={busy} onClick={() => setPending(null)}>
                  Cancel
                </button>
              </section>
            )}
          </section>
          <section className="panel">
            <h2>Connection reliability</h2>
            {analytics ? (
              <>
                <p>
                  {value(analytics.reliability.attempts)} weighted valid
                  admission attempts · {value(analytics.reliability.failures)}{" "}
                  backend failures · successful provisioning p95{" "}
                  {value(analytics.reliability.p95_ms)} ms.
                </p>
                <svg
                  className="timeline"
                  role="img"
                  aria-label="Weighted admission attempts by UTC bucket"
                  viewBox="0 0 1000 180"
                >
                  {buckets.map(([time, count], index) => (
                    <rect
                      key={time}
                      x={20 + (index * 960) / buckets.length}
                      y={160 - (count / peak) * 140}
                      width={Math.max(1, 960 / buckets.length - 3)}
                      height={(count / peak) * 140}
                      fill="#2b6cb0"
                    >
                      <title>
                        {time} UTC · {value(count)} attempts
                      </title>
                    </rect>
                  ))}
                </svg>
                <p>
                  {buckets.length
                    ? `${buckets[0][0]} → ${buckets.at(-1)![0]} UTC`
                    : "No admissions in this window."}
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Event",
                          "Build",
                          "Operation",
                          "Outcome",
                          "Weighted count",
                        ].map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.outcomes.map((row, index) => (
                        <tr key={index}>
                          <td>{row.event}</td>
                          <td>{row.build}</td>
                          <td>{row.operation}</td>
                          <td>{row.outcome}</td>
                          <td>{value(row.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p>
                Analytics{" "}
                {data.errors.includes("analytics_not_configured")
                  ? "is not configured yet"
                  : "is unavailable"}
                . Admission counters and occupancy use separate sources.
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Gameplay quality</h2>
            <p>
              Voluntary anonymous client reports preserve opt-out. WebRTC RTT
              differs from input confirmation. Client filters apply to quality
              samples; server admission totals retain all matching server
              sessions.
            </p>
            {analytics ? (
              <>
                <p>
                  {value(analytics.sample_rows)} matching rows ·{" "}
                  {analytics.truncated
                    ? "Percentile rows were truncated"
                    : "Latest 10,000 matching rows at most"}{" "}
                  · queried {new Date(analytics.queried_at).toLocaleString()}.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Metric / role / platform / map / mode / route",
                          "Weighted samples",
                          "p50",
                          "p95",
                          "p99",
                        ].map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.metrics).map(
                        ([key, metric]) => (
                          <tr key={key}>
                            <td>{key}</td>
                            <td>{value(metric.weighted_samples)}</td>
                            <td>{value(metric.p50)}</td>
                            <td>{value(metric.p95)}</td>
                            <td>{value(metric.p99)}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                {!Object.keys(analytics.metrics).length && (
                  <p>
                    No client samples match this window and these filters. This
                    is not a census of players.
                  </p>
                )}
              </>
            ) : (
              <p>
                Quality samples are unavailable until analytics is connected.
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Resources, budget and alerts</h2>
            {data.cost ? (
              <>
                <p>
                  Observed estimate US${value(data.cost.observed_estimate_usd)}{" "}
                  · projected month-end US${value(data.cost.projected_usd)}.
                </p>
                <p>{data.cost.note}</p>
              </>
            ) : (
              <p>
                Account usage and cost estimates are not connected yet. The
                US$25 monthly target remains a soft budget.
              </p>
            )}
            <p>
              TURN account egress: {value(data.turn?.account_egress_gb)} GB ·
              game egress: {value(data.turn?.game_egress_gb)} GB.
            </p>
            <p>
              {data.pollAt
                ? `Last collection ${new Date(data.pollAt).toLocaleString()}${data.pollFresh ? "" : " · stale"}`
                : "Scheduled collection has not completed."}
            </p>
            {!!data.collectionErrors?.length && (
              <p role="alert">
                Collection could not read: {data.collectionErrors.map((error) => collectionSources[error] ?? "a monitoring source").join(", ")}.
              </p>
            )}
            <p>
              {data.notifications.configured
                ? data.notifications.deliveryFailed
                  ? "Notification delivery failed."
                  : "Notification binding configured; inbox delivery still requires verification."
                : "Email notifications are not configured."}
            </p>
            {data.alerts
              .filter((alert) => alert.active)
              .map((alert) => (
                <p key={alert.key}>
                  {alert.severity}: {alert.key}
                </p>
              ))}
            <a
              className="button"
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Cloudflare metrics and logs ↗
            </a>
          </section>
          <section className="panel">
            <h2>Admission activity</h2>
            <p>Latest 100 backend audit events for {options.environment}.</p>
            {auditError ? (
              <p role="alert">{auditError}</p>
            ) : !audit.length ? (
              <p>No recorded console changes.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Time",
                        "Action",
                        "Outcome",
                        "Actor subject",
                        "Request",
                      ].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((event) => (
                      <tr key={event.requestId}>
                        <td>{new Date(event.occurredAt).toLocaleString()}</td>
                        <td>{event.action}</td>
                        <td>{event.outcome}</td>
                        <td>{event.actorSubject}</td>
                        <td>{event.requestId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
