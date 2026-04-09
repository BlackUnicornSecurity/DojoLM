/**
 * The Kumite Components
 * Story: S75, TPI-NODA-6.3
 *
 * Barrel exports for SAGE, Battle Arena, Mitsuke, and Amaterasu DNA subsystem UIs.
 *
 * Train 2 PR-4b.8 (2026-04-09): StrategicHub.tsx deleted. The Kumite is now
 * represented by the standalone children below (Mitsuke, SAGE, Arena, etc.)
 * which are mounted as first-class nav items.
 */

export { SAGEDashboard } from './SAGEDashboard'
export { ArenaBrowser } from './ArenaBrowser'
export { ThreatFeedStream } from './ThreatFeedStream'
export { AmaterasuSubsystem } from './AmaterasuSubsystem'
export { SAGEConfig, ArenaConfig, MitsukeConfig } from './KumiteConfig'
export { MitsukeSourceConfig } from './MitsukeSourceConfig'

export { SageQuarantineView } from './SageQuarantineView'
export { SageSeedLibrary } from './SageSeedLibrary'
export { SageMutationView } from './SageMutationView'
export { ArenaRoster } from './ArenaRoster'
export { MitsukeLibrary } from './MitsukeLibrary'

export type { SAGEConfigData, ArenaConfigData, MitsukeConfigData } from './KumiteConfig'
export type { UserSource } from './MitsukeSourceConfig'
