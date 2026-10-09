import type {
  ConsoleActor,
  SummaryRequest,
  ConsoleService,
  ResourceId,
} from "../shared/contracts";

interface KingsService extends ConsoleService {
  read(
    request: SummaryRequest & {
      operation: string;
      id?: string;
      query?: Record<string, string>;
    },
  ): Promise<{ status: number; body: unknown }>;
  mutate(
    request: SummaryRequest & {
      idempotencyKey: string;
      action: string;
      targetId?: string;
      count?: number;
    },
  ): Promise<{ status: number; body: unknown }>;
  getAudit(
    request: SummaryRequest & { limit: number; offset: number },
  ): Promise<{ status: number; body: unknown }>;
}
interface DartsService extends ConsoleService {
  getInfrastructure(request: SummaryRequest): Promise<unknown>;
  getMonitoring(
    request: SummaryRequest & {
      options: {
        hours: number;
        environment: string;
        build: string;
        filters: Record<string, string>;
      };
    },
  ): Promise<unknown>;
  mutate(
    request: SummaryRequest & { action: string; idempotencyKey: string },
  ): Promise<{ status: number; body: unknown }>;
  getAudit(request: SummaryRequest): Promise<{ status: number; body: unknown }>;
}
export class GameError extends Error {
  constructor(
    public status: 400 | 403 | 404 | 405 | 413 | 415 | 503,
    public code: string,
  ) {
    super(code);
  }
}
const kingsLists: Record<string, string> = {
  "/stats": "stats",
  "/users": "users",
  "/characters": "characters",
  "/campaigns": "campaigns",
  "/active-campaigns": "active",
  "/invite-codes": "invites",
};
export async function bounded<T>(
  operation: Promise<T>,
  timeoutMs = 12000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new GameError(503, "game_service_timeout")),
          timeoutMs,
        );
      }),
    ]);
    if (
      new TextEncoder().encode(JSON.stringify(result)).byteLength >
      1024 * 1024
    )
      throw new GameError(503, "game_response_too_large");
    return result;
  } catch (error) {
    if (error instanceof GameError) throw error;
    throw new GameError(503, "game_service_unavailable");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
function context(
  resourceId: ResourceId,
  actor: ConsoleActor,
  requestId: string,
  environment: string,
): SummaryRequest {
  if (!["production", "staging"].includes(environment))
    throw new GameError(400, "invalid_environment");
  return {
    schemaVersion: 1,
    resourceId,
    actor,
    requestId,
    environment: environment as "production" | "staging",
  };
}
async function commandBody(request: Request, url: URL) {
  if (
    request.headers.get("Origin") !== url.origin ||
    (request.headers.get("Sec-Fetch-Site") &&
      request.headers.get("Sec-Fetch-Site") !== "same-origin")
  )
    throw new GameError(403, "same_origin_required");
  if (
    !request.headers.get("Content-Type")?.match(/^application\/json(?:\s*;|$)/i)
  )
    throw new GameError(415, "json_required");
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
      idempotencyKey,
    )
  )
    throw new GameError(400, "retry_key_required");
  if (
    [...url.searchParams.keys()].some((key) => key !== "environment") ||
    url.searchParams.getAll("environment").length > 1
  )
    throw new GameError(400, "invalid_filter");
  let text = "";
  const reader = request.body?.getReader();
  if (reader) {
    let size = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2048) {
          await reader.cancel();
          throw new GameError(413, "command_too_large");
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
  } catch {
    throw new GameError(400, "invalid_json");
  }
  return { body, idempotencyKey };
}
export async function gameApi(
  request: Request,
  env: Cloudflare.Env,
  actor: ConsoleActor,
  requestId: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const environment = url.searchParams.get("environment") ?? "production";
  if (url.pathname === "/api/infrastructure") {
    if (request.method !== "GET")
      throw new GameError(405, "method_not_allowed");
    if (url.search) throw new GameError(400, "invalid_filter");
    if (env.ENVIRONMENT === "local" || !env.DARTS_OPS)
      throw new GameError(503, "game_not_connected");
    return Response.json(
      await bounded(
        (env.DARTS_OPS as Fetcher & DartsService).getInfrastructure(
          context("darts-vs-squirts", actor, requestId, "production"),
        ),
      ),
    );
  }
  if (
    url.pathname.startsWith("/api/kings/") &&
    !["production", "staging"].includes(environment)
  )
    throw new GameError(400, "invalid_environment");
  if (url.pathname.startsWith("/api/kings/")) {
    const binding =
      environment === "staging" ? env.KINGS_STAGE : env.KINGS_ADMIN;
    if (env.ENVIRONMENT === "local" || !binding)
      throw new GameError(503, "game_not_connected");
    const service = binding as Fetcher & KingsService;
    const path = url.pathname.slice("/api/kings".length);
    if (request.method !== "GET") {
      if (!["POST", "DELETE"].includes(request.method))
        throw new GameError(405, "method_not_allowed");
      const { body, idempotencyKey } = await commandBody(request, url);
      let action = "",
        targetId: string | undefined,
        count: number | undefined;
      const match =
        /^\/(users|characters|invite-codes)\/([^/]+)(\/revive)?$/.exec(path);
      const slot = /^\/active-campaigns\/(character|campaign)\/([^/]+)$/.exec(
        path,
      );
      if (request.method === "POST" && path === "/invite-codes") {
        action = "invites_create";
        count = body.count === undefined ? 1 : (body.count as number);
        if (
          Object.keys(body).some((key) => key !== "count") ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > 50
        )
          throw new GameError(400, "invalid_count");
      } else if (
        match &&
        request.method === "DELETE" &&
        !match[3] &&
        match[1] !== "characters"
      ) {
        action = match[1] === "users" ? "user_delete" : "invite_delete";
        targetId = decodeURIComponent(match[2]);
      } else if (
        match &&
        request.method === "POST" &&
        match[1] === "characters" &&
        match[3]
      ) {
        action = "character_revive";
        targetId = decodeURIComponent(match[2]);
      } else if (slot && request.method === "DELETE") {
        action =
          slot[1] === "character"
            ? "slots_clear_character"
            : "slots_clear_campaign";
        targetId = decodeURIComponent(slot[2]);
      } else throw new GameError(405, "unsupported_action");
      if (action !== "invites_create" && Object.keys(body).length)
        throw new GameError(400, "unexpected_command_fields");
      if (
        targetId &&
        (targetId.length > 128 || /[\x00-\x1f/\\]/.test(targetId))
      )
        throw new GameError(400, "invalid_target");
      if (action === "invite_delete") targetId = targetId!.toUpperCase();
      const result = await bounded(
        service.mutate({
          ...context("kings-search", actor, requestId, environment),
          action,
          targetId,
          count,
          idempotencyKey,
        }),
      );
      return Response.json(result.body, { status: result.status });
    }
    if (path === "/audit") {
      if (
        [...url.searchParams.keys()].some(
          (key) => !["environment", "limit", "offset"].includes(key),
        ) ||
        [...url.searchParams.keys()].length !==
          new Set(url.searchParams.keys()).size
      )
        throw new GameError(400, "invalid_filter");
      const limit = Number(url.searchParams.get("limit") ?? 50),
        offset = Number(url.searchParams.get("offset") ?? 0);
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset > 100000
      )
        throw new GameError(400, "invalid_pagination");
      const result = await bounded(
        service.getAudit({
          ...context("kings-search", actor, requestId, environment),
          limit,
          offset,
        }),
      );
      return Response.json(result.body, { status: result.status });
    }
    let operation = kingsLists[path],
      id: string | undefined;
    const detail = /^\/(users|characters|campaigns)\/([^/]+)$/.exec(path);
    if (detail) {
      operation = {
        users: "user",
        characters: "character",
        campaigns: "campaign",
      }[detail[1]]!;
      id = decodeURIComponent(detail[2]);
    }
    if (!operation) throw new GameError(404, "not_found");
    const query = Object.fromEntries(
      [...url.searchParams].filter(([key]) => key !== "environment"),
    );
    if (
      [...url.searchParams.keys()].length !==
        new Set(url.searchParams.keys()).size ||
      Object.keys(query).some(
        (key) =>
          !["limit", "offset", "search", "status", "userId"].includes(key),
      )
    )
      throw new GameError(400, "invalid_filter");
    const result = await bounded(
      (binding as Fetcher & KingsService).read({
        ...context("kings-search", actor, requestId, environment),
        operation,
        id,
        query,
      }),
    );
    if (
      !result ||
      !Number.isInteger(result.status) ||
      result.status < 200 ||
      result.status > 599
    )
      throw new GameError(503, "invalid_game_response");
    return Response.json(result.body, { status: result.status });
  }
  const summary =
    /^\/api\/games\/(kings-search|darts-vs-squirts)\/summary$/.exec(
      url.pathname,
    );
  if (summary) {
    if (request.method !== "GET")
      throw new GameError(405, "method_not_allowed");
    if (
      !["production", "staging"].includes(environment) ||
      [...url.searchParams.keys()].some((key) => key !== "environment") ||
      url.searchParams.getAll("environment").length > 1
    )
      throw new GameError(400, "invalid_filter");
    const binding =
      summary[1] === "kings-search"
        ? environment === "staging"
          ? env.KINGS_STAGE
          : env.KINGS_ADMIN
        : env.DARTS_OPS;
    if (env.ENVIRONMENT === "local" || !binding)
      throw new GameError(503, "game_not_connected");
    const result = await bounded(
      (binding as Fetcher & ConsoleService).getSummary(
        context(summary[1] as ResourceId, actor, requestId, environment),
      ),
    );
    if (
      !result ||
      result.schemaVersion !== 1 ||
      result.resourceId !== summary[1] ||
      !Array.isArray(result.metrics) ||
      result.metrics.length > 32
    )
      throw new GameError(503, "invalid_game_response");
    const keys =
      summary[1] === "kings-search"
        ? [
            "totalUsers",
            "totalCharacters",
            "totalCampaigns",
            "activeCampaigns",
            "totalWins",
            "completedCampaigns",
            "activeSlots",
            "availableInvites",
          ]
        : [
            "rooms",
            "humans",
            "roomAttempts",
            "credentialAttempts",
            "roomLimit",
            "credentialLimit",
          ];
    if (
      !["ready", "degraded", "unknown"].includes(result.readiness) ||
      !Number.isFinite(Date.parse(result.collectedAt)) ||
      result.metrics.some(
        (metric) =>
          !keys.includes(metric.key) ||
          (metric.value !== null &&
            (!Number.isFinite(metric.value) || metric.value < 0)) ||
          [metric.unit, metric.window, metric.source].some(
            (field) => typeof field !== "string" || field.length > 128,
          ),
      )
    )
      throw new GameError(503, "invalid_game_response");
    return Response.json({
      schemaVersion: 1,
      resourceId: result.resourceId,
      collectedAt: result.collectedAt,
      readiness: result.readiness,
      environment,
      metrics: result.metrics.map(({ key, value, unit, window, source }) => ({
        key,
        value,
        unit,
        window,
        source,
      })),
    });
  }
  if (
    url.pathname === "/api/games/darts-vs-squirts/admission" ||
    url.pathname === "/api/games/darts-vs-squirts/audit"
  ) {
    if (env.ENVIRONMENT === "local" || !env.DARTS_OPS)
      throw new GameError(503, "game_not_connected");
    const service = env.DARTS_OPS as Fetcher & DartsService;
    const verified = context("darts-vs-squirts", actor, requestId, environment);
    if (url.pathname.endsWith("/audit")) {
      if (request.method !== "GET")
        throw new GameError(405, "method_not_allowed");
      if (
        [...url.searchParams.keys()].some((key) => key !== "environment") ||
        url.searchParams.getAll("environment").length > 1
      )
        throw new GameError(400, "invalid_filter");
      const result = await bounded(service.getAudit(verified));
      return Response.json(result.body, { status: result.status });
    }
    if (request.method !== "POST")
      throw new GameError(405, "method_not_allowed");
    const { body, idempotencyKey } = await commandBody(request, url);
    if (
      Object.keys(body).length !== 1 ||
      !["admission_pause", "admission_resume"].includes(body.action as string)
    )
      throw new GameError(400, "unsupported_action");
    const result = await bounded(
      service.mutate({
        ...verified,
        action: body.action as string,
        idempotencyKey,
      }),
    );
    return Response.json(result.body, { status: result.status });
  }
  if (url.pathname === "/api/games/darts-vs-squirts/monitoring") {
    if (request.method !== "GET") throw new GameError(405, "read_only_module");
    if (env.ENVIRONMENT === "local" || !env.DARTS_OPS)
      throw new GameError(503, "game_not_connected");
    const filters: Record<string, string> = {};
    const allowed = [
      "hours",
      "environment",
      "build",
      "platform",
      "map",
      "mode",
      "role",
      "route",
    ];
    if (
      [...url.searchParams.keys()].length !==
        new Set(url.searchParams.keys()).size ||
      [...url.searchParams.keys()].some((key) => !allowed.includes(key))
    )
      throw new GameError(400, "invalid_filter");
    for (const key of allowed.slice(3))
      if (url.searchParams.get(key)) filters[key] = url.searchParams.get(key)!;
    const hours = Number(url.searchParams.get("hours") ?? 24),
      build = url.searchParams.get("build") ?? "";
    const choices: Record<string, string[]> = {
      platform: ["Windows", "Linux", "macOS", "Web", "Other"],
      map: ["house", "konbini", "lobby"],
      mode: ["toybox", "deathmatch", "team_deathmatch", "lobby"],
      role: ["host", "guest"],
      route: ["direct", "relay", "mixed", "unknown"],
    };
    if (
      ![1, 24, 168, 2160].includes(hours) ||
      (build && !/^[a-zA-Z0-9_.+-]{1,64}$/.test(build)) ||
      Object.entries(filters).some(
        ([key, value]) => !choices[key]?.includes(value),
      )
    )
      throw new GameError(400, "invalid_filter");
    const result = await bounded(
      (env.DARTS_OPS as Fetcher & DartsService).getMonitoring({
        ...context("darts-vs-squirts", actor, requestId, environment),
        options: { hours, environment, build, filters },
      }),
    );
    return Response.json(result);
  }
  return null;
}
