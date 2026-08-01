/**
 * Production Intelligence — architecture reservation (no live metering / UI).
 * Doc: docs/festag-production-intelligence.md
 */

export {
  TAGRO_SUPERINTELLIGENCE_PILLARS,
  TAGRO_SUPERINTELLIGENCE_LABELS,
  type TagroSuperintelligencePillar,
} from './pillars'

export {
  PRODUCTION_INTELLIGENCE_MODULE_ID,
  PRODUCTION_INTELLIGENCE_PHASE,
  type ProductionIntelligencePhase,
  type ProductionSourceKind,
  type ProductionSourceStatus,
  type ProductionSource,
  type ProductionRecommendationKind,
  type ProductionRecommendation,
  type ProductionIntelligenceContext,
} from './types'

export {
  PRODUCTION_EVENT_FAMILIES,
  PRODUCTION_INTEGRATION_EVENTS,
  productionContractsForProvider,
  type ProductionEventFamily,
  type ProductionEvent,
  type ProductionIntegrationContract,
} from './events'

export {
  PRODUCTION_SCORE_FACTORS,
  PRODUCTION_SCORE_FACTOR_LABELS,
  PRODUCTION_SCORE_DEFAULT_WEIGHTS,
  emptyProductionScore,
  type ProductionScoreFactorId,
  type ProductionScoreFactor,
  type ProductionScoreDelta,
  type ProductionScore,
} from './score'

export {
  PRODUCTION_SCHEMA_TABLES,
  PRODUCTION_SCHEMA_RELATIONS,
  PRODUCTION_SCHEMA_APPLIED,
  type ProductionSchemaTable,
  type ProductionSchemaRelation,
} from './schema'

export {
  PRODUCTION_SIGNAL_INTEGRATIONS,
  isProductionIntelligenceEligible,
  withProductionIntelligenceModule,
  type ProductionActivationInput,
} from './activation'
