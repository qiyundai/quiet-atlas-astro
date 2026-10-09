export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  total?: number;
  error?: string;
  deleted?: number;
  requestId?: string;
}

let environment = "production";
const retryKeys = new Map<string, string>();
export function setEnvironment(value: string) {
  if (!["production", "staging"].includes(value))
    throw Error("Unsupported environment");
  environment = value;
}
async function request<T>(
  path: string,
  opts?: RequestInit,
): Promise<ApiResponse<T>> {
  let res: Response;
  const mutation = opts?.method && opts.method !== "GET";
  const retryScope = JSON.stringify([
    environment,
    path,
    opts?.method,
    opts?.body ?? "{}",
  ]);
  if (mutation && !retryKeys.has(retryScope))
    retryKeys.set(retryScope, crypto.randomUUID());
  try {
    const url = new URL(
      "/api/kings" + path.replace(/^\/api/, "").replace(/^\/auth/, "/auth"),
      window.location.origin,
    );
    url.searchParams.set("environment", environment);
    res = await fetch(url, {
      ...opts,
      ...(mutation ? { body: opts?.body ?? "{}" } : {}),
      credentials: "same-origin",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: "application/json",
        ...(mutation
          ? {
              "Content-Type": "application/json",
              "Idempotency-Key": retryKeys.get(retryScope)!,
            }
          : {}),
        ...opts?.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot reach the admin service. Check your connection and retry.",
    );
  }
  if (!res.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      res.redirected || res.status === 401 || res.status === 403
        ? "Your admin session expired. Sign in again through Cloudflare Access."
        : `The admin service returned an unexpected response (HTTP ${res.status}). Retry or contact the operator.`,
    );
  }
  let body: ApiResponse<T>;
  try {
    body = await res.json();
  } catch {
    throw new Error("The admin service returned invalid JSON. Please retry.");
  }
  if (!res.ok || body.ok !== true) {
    if (mutation && res.status >= 400 && res.status < 500)
      retryKeys.delete(retryScope);
    const id = body.requestId ?? res.headers.get("X-Request-Id");
    throw new Error(
      `${body.error || `Request failed (HTTP ${res.status})`}${id ? ` · Request ${encodeURIComponent(id)}` : ""}`,
    );
  }
  if (mutation) retryKeys.delete(retryScope);
  return body;
}

export interface AuditEvent {
  requestId: string;
  occurredAt: string;
  actorSubject: string;
  action: string;
  targetId: string;
  outcome: string;
}
export function fetchAudit(offset = 0) {
  return request<AuditEvent[]>(`/api/audit?limit=50&offset=${offset}`);
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  userId?: string;
}
function query(options: ListOptions = {}) {
  return new URLSearchParams(
    Object.entries(options)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}

// ── Stats ────────────────────────────────────────────────────────────────

export interface Stats {
  totalUsers: number;
  totalCharacters: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalWins: number;
  completedCampaigns: number;
  activeSlots: number;
  availableInvites: number;
}

export function fetchStats() {
  return request<Stats>("/api/stats");
}

// ── Users ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  oauth_provider: string;
  oauth_id: string;
  display_name: string;
  created_at: string;
  last_login: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  class: string;
  mode: string;
  is_alive: number;
  created_at: string;
  campaign_count: number;
  wins: number;
  losses: number;
  user_name?: string;
  in_campaign?: number;
}

export function fetchUsers(options?: ListOptions) {
  return request<User[]>(`/api/users?${query(options)}`);
}

export function fetchUser(id: string) {
  return request<{ user: User; characters: Character[] }>(
    `/api/users/${encodeURIComponent(id)}`,
  );
}

export function deleteUser(id: string) {
  return request(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Characters ───────────────────────────────────────────────────────────

export interface CharacterDetail {
  character: Character;
  cardPool: Array<{
    id: string;
    character_id: string;
    card_name: string;
    card_data: string;
    acquired_at: number;
  }>;
  decks: Array<{
    id: string;
    character_id: string;
    name: string;
    created_at: number;
    pool_card_id: string | null;
  }>;
  campaigns: Array<{
    campaign_id: string;
    character_id: string;
    user_id: string;
    joined_at: string;
    survived: number | null;
    status: string;
    result: string | null;
    stage: number;
  }>;
}

export function fetchCharacters(options?: ListOptions) {
  return request<Character[]>(`/api/characters?${query(options)}`);
}

export function fetchCharacter(id: string) {
  return request<CharacterDetail>(`/api/characters/${encodeURIComponent(id)}`);
}

export function reviveCharacter(id: string) {
  return request(`/api/characters/${encodeURIComponent(id)}/revive`, {
    method: "POST",
  });
}

// ── Campaigns ────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  created_by: string;
  stage: number;
  status: string;
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CampaignDetail {
  campaign: Campaign;
  enrollments: Array<{
    campaign_id: string;
    character_id: string;
    user_id: string;
    joined_at: string;
    survived: number | null;
    character_name: string;
    class: string;
    mode: string;
    user_name: string;
  }>;
}

export function fetchCampaigns(options?: ListOptions) {
  return request<Campaign[]>(`/api/campaigns?${query(options)}`);
}

export function fetchCampaign(id: string) {
  return request<CampaignDetail>(`/api/campaigns/${encodeURIComponent(id)}`);
}

// ── Active Campaigns ─────────────────────────────────────────────────────

export interface ActiveCampaign {
  user_id: string;
  campaign_id: string;
  player_id: string;
  user_name?: string;
  character_id: string;
  character_name: string;
  class_id: string;
  joined_at: string;
  status: string;
}

export function fetchActiveCampaigns(options?: ListOptions) {
  return request<ActiveCampaign[]>(`/api/active-campaigns?${query(options)}`);
}

export function deleteActiveCampaignByCharacter(characterId: string) {
  return request(
    `/api/active-campaigns/character/${encodeURIComponent(characterId)}`,
    { method: "DELETE" },
  );
}

export function deleteActiveCampaignByCampaign(campaignId: string) {
  return request(
    `/api/active-campaigns/campaign/${encodeURIComponent(campaignId)}`,
    { method: "DELETE" },
  );
}

// ── Invite Codes ────────────────────────────────────────────────────────

export interface InviteCode {
  code: string;
  created_by: string | null;
  created_at: number;
  used_by: string | null;
  used_at: number | null;
  is_admin_generated: number;
}

export function fetchInviteCodes(options?: ListOptions) {
  return request<InviteCode[]>(`/api/invite-codes?${query(options)}`);
}

export function createInviteCodes(count = 1) {
  return request<{ codes: string[] }>("/api/invite-codes", {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}

export function deleteInviteCode(code: string) {
  return request(`/api/invite-codes/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────

export function fetchMe() {
  return request<{ email: string; name?: string; environment: string }>(
    "/auth/me",
  );
}
