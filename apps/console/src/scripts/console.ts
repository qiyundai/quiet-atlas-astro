import type { Overview } from "../../shared/contracts";

const errorBox = document.querySelector<HTMLElement>("#connection-error");
const button = document.querySelector<HTMLButtonElement>("#refresh");
let loading = false;

function reportError(message: string) {
  if (errorBox) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }
}
async function refresh() {
  if (loading) return;
  loading = true;
  if (button) {
    button.disabled = true;
    button.textContent = "Checking…";
  }
  if (errorBox) errorBox.hidden = true;
  // Do not leave an old successful status visible when its refresh fails.
  document.querySelectorAll<HTMLElement>("[data-status]").forEach((el) => {
    el.textContent = "Checking";
    el.className = "badge";
  });
  const summaryReads = Array.from(
    document.querySelectorAll<HTMLElement>("[data-summary]"),
  ).map(async (element) => {
    element.textContent = "Checking current game snapshot…";
    const id =
      element.closest<HTMLElement>("[data-resource]")?.dataset.resource;
    if (!["kings-search", "darts-vs-squirts"].includes(id ?? "")) return;
    try {
      const response = await fetch(`/api/games/${id}/summary`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error();
      const body: {
        schemaVersion: 1;
        metrics: { key: string; value: number | null }[];
        readiness: string;
        collectedAt: string;
      } = await response.json();
      if (body.schemaVersion !== 1 || !Array.isArray(body.metrics))
        throw Error();
      const metrics = new Map<string, number | null>(
        body.metrics.map((metric: { key: string; value: number | null }) => [
          metric.key,
          metric.value,
        ]),
      );
      const n = (key: string) =>
        metrics.get(key) == null
          ? "Unavailable"
          : metrics.get(key)!.toLocaleString();
      element.textContent =
        id === "kings-search"
          ? `${n("totalUsers")} registered accounts · ${n("activeCampaigns")} campaigns including lobbies and planning · ${n("activeSlots")} active slots`
          : `${n("rooms")} observed rooms · ${n("humans")} leased members · ${n("roomAttempts")} room attempts this UTC hour`;
      element.textContent += ` · ${body.readiness === "ready" ? "source ready" : "source degraded"} · checked ${new Date(body.collectedAt).toLocaleTimeString()}`;
    } catch {
      element.textContent =
        "Current game snapshot is unavailable. Open the workspace for details.";
    }
  });
  try {
    const response = await fetch("/api/overview", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 401 || response.status === 403
          ? "Your session has expired. Sign in again to check service availability."
          : "Availability could not be checked. Try again shortly.",
      );
    const data: Overview = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.resources))
      throw new Error("The console received an unsupported status response.");
    for (const service of data.resources) {
      const card = document.querySelector<HTMLElement>(
        `[data-resource="${service.resourceId}"]`,
      );
      const status = card?.querySelector<HTMLElement>("[data-status]");
      const detail = card?.querySelector<HTMLElement>("[data-detail]");
      if (status) {
        status.textContent =
          service.availability === "reachable"
            ? "Reachable"
            : service.availability === "unavailable"
              ? "Check failed"
              : "Not connected";
        status.className = `badge ${service.availability}`;
      }
      if (detail) detail.textContent = service.detail;
    }
    const checked = document.querySelector<HTMLElement>("#checked-at");
    if (checked)
      checked.textContent = `Checked ${new Date(data.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · reachability only`;
  } catch (error) {
    document.querySelectorAll<HTMLElement>("[data-status]").forEach((el) => {
      el.textContent = "Not checked";
      el.className = "badge";
    });
    const checked = document.querySelector<HTMLElement>("#checked-at");
    if (checked) checked.textContent = "Latest availability check failed.";
    reportError(
      error instanceof Error
        ? error.message
        : "Availability could not be checked.",
    );
  } finally {
    await Promise.allSettled(summaryReads);
    loading = false;
    if (button) {
      button.disabled = false;
      button.textContent = "Check availability ↻";
    }
  }
}
button?.addEventListener("click", refresh);
try {
  const response = await fetch("/api/session", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw new Error(
      "Your owner session could not be verified. Reload to sign in.",
    );
  const session = await response.json();
  if (!session || typeof session !== "object" || !("environment" in session))
    throw new Error("The console received an unsupported session response.");
  const environment = document.querySelector<HTMLElement>("#environment");
  if (environment)
    environment.textContent =
      session.environment === "local"
        ? "Local preview · services disconnected"
        : "Owner · Production";
} catch (error) {
  reportError(
    error instanceof Error
      ? error.message
      : "Your session could not be verified.",
  );
}
if (document.querySelector("[data-summary]")) void refresh();
