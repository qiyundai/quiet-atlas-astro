import type { Resource } from './contracts';

/** Approved destinations only. No caller-controlled upstream URLs or bindings. */
export const resources: readonly Resource[] = [
  {
    id: 'kings-search', name: "King’s Search", kind: 'game', path: '/games/kings-search/',
    description: 'Players, characters, campaigns and invitations.', migration: 'linked',
    legacyAdmin: 'https://ks-admin.quietatlas.io', capabilities: ['service-reachability', 'legacy-admin-link']
  },
  {
    id: 'darts-vs-squirts', name: 'Darts vs Squirts', kind: 'game', path: '/games/darts-vs-squirts/',
    description: 'Rooms, connections, performance and admission.', migration: 'linked',
    legacyAdmin: 'https://dvs-ops.quietatlas.io', capabilities: ['service-reachability', 'legacy-admin-link']
  },
  {
    id: 'quiet-atlas', name: 'Quiet Atlas', kind: 'site', path: '/sites/quiet-atlas/',
    description: 'The home of Quiet Atlas, its games and stories.', migration: 'linked',
    publicUrl: 'https://quietatlas.io', capabilities: ['public-reachability']
  },
  {
    id: 'nomadic-hearth', name: 'Nomadic Hearth', kind: 'game', path: '/games/nomadic-hearth/',
    description: 'A place for the next game’s operations as it comes online.', migration: 'planned',
    capabilities: []
  }
];
