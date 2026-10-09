/** Versioned, sanitized responses. No player records, credentials or raw logs. */
export type ResourceId = 'kings-search' | 'darts-vs-squirts' | 'quiet-atlas' | 'nomadic-hearth';
export type Availability = 'reachable' | 'unavailable' | 'unknown';
export type Migration = 'linked' | 'planned';
export interface Resource {
  id: ResourceId;
  name: string;
  kind: 'game' | 'site';
  path: string;
  description: string;
  migration: Migration;
  legacyAdmin?: string;
  publicUrl?: string;
  capabilities: readonly string[];
}
export interface ServiceStatus {
  resourceId: ResourceId;
  availability: Availability;
  checkedAt: string;
  latencyMs: number | null;
  evidence: 'health-endpoint' | 'public-website' | 'not-connected';
  detail: string;
  monitoring: 'pending';
}
export interface Overview {
  schemaVersion: 1;
  checkedAt: string;
  environment: string;
  resources: ServiceStatus[];
}
/** Future private game service entrypoint; do not pass browser-supplied actors. */
export interface ConsoleActor { subject: string; role: 'owner' }
export interface SummaryRequest {
  schemaVersion: 1;
  resourceId: ResourceId;
  requestId: string;
  actor: ConsoleActor;
}
/** Implement in each owning backend before connecting richer modules. */
export interface ConsoleService {
  getSummary(request: SummaryRequest): Promise<{
    schemaVersion: 1;
    resourceId: ResourceId;
    collectedAt: string;
    readiness: 'ready' | 'degraded' | 'unknown';
    metrics: { key: string; value: number | null; unit: string; window: string; source: string }[];
  }>;
}
export interface AdminAuditEvent {
  schemaVersion: 1;
  requestId: string;
  occurredAt: string;
  resourceId: ResourceId;
  actorSubject: string;
  action: string;
  targetId: string;
  outcome: 'succeeded' | 'rejected' | 'failed';
}
