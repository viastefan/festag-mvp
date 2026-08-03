'use client'

const STEPS = [
  { label: 'Workspace', hint: 'Your operating context' },
  { label: 'Projects', hint: 'Work that lives here' },
  { label: 'Tagro', hint: 'Quiet operating intelligence' },
  { label: 'Delivery', hint: 'Progress your team can trust' },
] as const

export default function AppShellWorkflow() {
  return (
    <div className="fas-workflow" aria-hidden="true">
      {STEPS.map((step) => (
        <div key={step.label} className="fas-workflow-step">
          <div className="fas-workflow-rail">
            <span className="fas-workflow-dot" />
            <span className="fas-workflow-line" />
          </div>
          <div className="fas-workflow-label">
            {step.label}
            <span className="fas-workflow-hint">{step.hint}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
