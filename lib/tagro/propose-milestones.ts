export type MilestoneProposal = {
  template_key: string
  title: string
  percentage: number
}

export function proposeMilestones(input: {
  totalAmount: number
  currency?: string
  projectType?: string | null
  scopeSummary?: string | null
}): MilestoneProposal[] {
  const { totalAmount, projectType } = input

  if (totalAmount < 1000) {
    return [
      { template_key: 'kickoff', title: 'Kickoff & Vorbereitung', percentage: 50 },
      { template_key: 'final', title: 'Abnahme & Übergabe', percentage: 50 },
    ]
  }

  if (totalAmount > 20000 || projectType === 'software') {
    return [
      { template_key: 'kickoff', title: 'Kickoff & Vorbereitung', percentage: 20 },
      { template_key: 'phase1', title: 'Erste Umsetzungsphase', percentage: 30 },
      { template_key: 'midway', title: 'Halbzeit & Zwischenstand', percentage: 30 },
      { template_key: 'final', title: 'Abnahme & Übergabe', percentage: 20 },
    ]
  }

  return [
    { template_key: 'kickoff', title: 'Kickoff & Vorbereitung', percentage: 30 },
    { template_key: 'midway', title: 'Halbzeit & Zwischenstand', percentage: 40 },
    { template_key: 'final', title: 'Abnahme & Übergabe', percentage: 30 },
  ]
}
