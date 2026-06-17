/**
 * Provisional sample decisions for dev seeding — mirrors the client demo
 * bundle but persists through the real decision engine pipeline.
 */

import type { DecisionType, DecisionUrgency, ResponseType } from './types'

export type DecisionSampleSeed = {
  question: string
  suggested_options?: string[]
  suggested_response_type?: ResponseType
  suggested_decision_type?: DecisionType
  urgency?: DecisionUrgency
  /** Pre-fill Tagro fields after create (no extra LLM call). */
  tagro?: {
    recommended_option?: string
    tagro_reasoning: string
    tagro_recommendation_reason?: string
  }
  /** Mark one sample as already decided for the "Entschieden" filter. */
  presetDecided?: {
    selected_option_id: string
    rationale?: string
  }
}

export const DECISION_SAMPLE_SEEDS: DecisionSampleSeed[] = [
  {
    question: 'Logo-Farbe freigeben — Die finale Markenfarbe für UI-Assets und Marketing-Material.',
    suggested_options: ['Freigeben', 'Ablehnen'],
    suggested_response_type: 'binary',
    suggested_decision_type: 'direction',
    urgency: 'high',
    tagro: {
      recommended_option: 'opt-1',
      tagro_reasoning:
        'Die vorgeschlagene Variante verbessert die Lesbarkeit auf hellen Hintergründen und passt zur Zielgruppe. Eine Freigabe schließt die Designphase ab.',
      tagro_recommendation_reason: 'Tagro empfiehlt Freigeben — schnellste Route zum Projektziel.',
    },
  },
  {
    question: 'Zahlungsanbieter wählen — Checkout und Abo-Modell hängen an dieser Entscheidung.',
    suggested_options: ['Stripe', 'Ablehnen'],
    suggested_response_type: 'binary',
    suggested_decision_type: 'payment',
    urgency: 'critical',
    tagro: {
      recommended_option: 'opt-1',
      tagro_reasoning:
        'Stripe bietet die schnellste Integration für Karten und SEPA im deutschen Markt. Ohne Zahlungsanbieter blockiert der Checkout.',
      tagro_recommendation_reason: 'Tagro empfiehlt Stripe — schnellste Integration für Karten und SEPA.',
    },
  },
  {
    question: 'Hosting-Provider wählen — Staging-URL und Produktions-Deploy hängen davon ab.',
    suggested_options: ['Vercel', 'Ablehnen'],
    suggested_response_type: 'binary',
    suggested_decision_type: 'scope',
    urgency: 'high',
    tagro: {
      recommended_option: 'opt-1',
      tagro_reasoning:
        'Vercel passt zum Next.js-Stack und beschleunigt Preview-Deployments für das Team.',
      tagro_recommendation_reason: 'Tagro empfiehlt Vercel — passt zum Next.js-Stack.',
    },
  },
  {
    question: 'Domain-Strategie festlegen — SEO und Markenklarheit für den Launch.',
    suggested_options: ['Freigeben', 'Ablehnen'],
    suggested_response_type: 'binary',
    suggested_decision_type: 'tradeoff',
    urgency: 'normal',
    tagro: {
      recommended_option: 'opt-1',
      tagro_reasoning: 'Die vorgeschlagene Domain-Strategie stärkt SEO und Markenklarheit.',
      tagro_recommendation_reason: 'Tagro empfiehlt die vorgeschlagene Domain-Strategie.',
    },
  },
  {
    question: 'SEO-Keywords bestätigen — Content-Team wartet auf die finale Liste.',
    suggested_options: ['Freigeben', 'Ablehnen'],
    suggested_response_type: 'binary',
    suggested_decision_type: 'tradeoff',
    urgency: 'normal',
    tagro: {
      recommended_option: 'opt-1',
      tagro_reasoning: 'Die Keyword-Liste deckt die ersten Landingpages ab und ist konsistent mit der Positionierung.',
      tagro_recommendation_reason: 'Tagro empfiehlt die Keyword-Liste für die ersten Landingpages.',
    },
  },
  {
    question: 'Analytics-Tool freigeben — Tracking war Voraussetzung für den Soft-Launch.',
    suggested_options: ['Freigeben', 'Ablehnen'],
    suggested_response_type: 'binary',
    suggested_decision_type: 'approval',
    urgency: 'low',
    tagro: {
      recommended_option: 'opt-1',
      tagro_reasoning: 'Plausible ist datenschutzfreundlich und schnell eingebunden.',
      tagro_recommendation_reason: 'Tagro empfiehlt Plausible — datenschutzfreundlich und schnell eingebunden.',
    },
    presetDecided: {
      selected_option_id: 'opt-1',
      rationale: 'Für den Soft-Launch freigegeben.',
    },
  },
]
