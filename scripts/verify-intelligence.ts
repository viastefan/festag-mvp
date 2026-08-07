import {
  scoreDecisionOutcome, scoreProjectWisdom, adaptConfidence, canAutoApprove,
  dnaSimilarity, findComparableProjects, learnPattern, matchPattern,
  buildProjectIntelligence, categoryWeight,
} from '@/lib/intelligence'
import type { DecisionPattern, ProjectRecord } from '@/lib/intelligence'

let pass = 0, fail = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else { fail++; console.log(`  FAIL ${name} ${detail}`) }
}

console.log('\n— Decision Outcome —')
const perfect = scoreDecisionOutcome('d1', {
  acceptance: 'accepted', revisions: 0, bugs: 0, delayDays: 0, satisfaction: 5,
})
check('perfect decision scores 100', perfect.score === 100, `got ${perfect.score}`)

const awful = scoreDecisionOutcome('d2', {
  acceptance: 'rejected', reverted: true, revisions: 4, bugs: 5, delayDays: 20, satisfaction: 1,
})
check('worst-case decision scores 0', awful.score === 0, `got ${awful.score}`)

const mid = scoreDecisionOutcome('d3', { acceptance: 'modified', bugs: 1, satisfaction: 4 })
check('mixed decision lands mid-range', mid.score > 40 && mid.score < 90, `got ${mid.score}`)

const sparse = scoreDecisionOutcome('d4', { acceptance: 'accepted' })
check('missing evidence is skipped, not guessed', sparse.parts.satisfaction === undefined && sparse.score > 50, `got ${sparse.score}`)
check('revert dominates the summary', awful.summary.includes('ersetzt'), awful.summary)

const early = scoreDecisionOutcome('d5', { acceptance: 'accepted', delayDays: -3 })
check('delivering early is not penalised', early.parts.delivery === 1)

console.log('\n— Category weights —')
check('security outweighs design', categoryWeight('security') > categoryWeight('design'))
check('unknown category falls back to 1', categoryWeight('nonsense') === 1)

console.log('\n— Project Wisdom —')
const wisdom = scoreProjectWisdom([
  { decisionId: 'a', category: 'security', score: 40 },
  { decisionId: 'b', category: 'design', score: 100 },
])
const naiveMean = 70
check('important decisions pull harder than trivial ones', wisdom.score < naiveMean, `got ${wisdom.score}`)
check('weak categories surface', wisdom.weakest[0]?.category === 'security')
check('empty project is handled', scoreProjectWisdom([]).score === 0)

console.log('\n— Confidence —')
const rising = adaptConfidence({ prior: 80, outcomes: [95, 96, 98] })
const falling = adaptConfidence({ prior: 80, outcomes: [40, 35, 30] })
check('good outcomes raise confidence', rising > 80, `got ${rising}`)
check('bad outcomes lower confidence', falling < 80, `got ${falling}`)
check('never reaches certainty', adaptConfidence({ prior: 99, outcomes: [100, 100, 100, 100] }) <= 99)
check('no evidence keeps the prior', adaptConfidence({ prior: 77, outcomes: [] }) === 77)
const oneBad = adaptConfidence({ prior: 90, outcomes: [20] })
check('single bad result does not collapse a strong prior', oneBad > 60, `got ${oneBad}`)

console.log('\n— Auto-approval —')
check('high confidence auto-approves', canAutoApprove({ confidence: 96, threshold: 90, category: 'design' }))
check('below threshold stays manual', !canAutoApprove({ confidence: 71, threshold: 90, category: 'design' }))
check('security always stays manual', !canAutoApprove({ confidence: 99, threshold: 70, category: 'security' }))

console.log('\n— Project DNA —')
const dnaA = { industry: 'saas', projectType: 'webapp', stack: ['next.js', 'supabase'], framework: 'next.js' }
check('identical DNA is 1', dnaSimilarity(dnaA, dnaA) === 1)
check('unrelated DNA is low', dnaSimilarity(dnaA, { industry: 'retail', projectType: 'shop', stack: ['wordpress'] }) < 0.3)
check('missing fields do not count as mismatch', dnaSimilarity(dnaA, { industry: 'saas' }) === 1)

const history: ProjectRecord[] = [
  { projectId: 'p1', dna: dnaA, wisdomScore: 95 },
  { projectId: 'p2', dna: { industry: 'saas', projectType: 'webapp', stack: ['next.js'] }, wisdomScore: 55 },
  { projectId: 'p3', dna: { industry: 'retail', projectType: 'shop', stack: ['wordpress'] }, wisdomScore: 90 },
]
const comparable = findComparableProjects(dnaA, history)
check('only successful, similar projects are imitated', comparable.length === 1 && comparable[0].projectId === 'p1',
  JSON.stringify(comparable.map(c => c.projectId)))

console.log('\n— Patterns —')
let lib: DecisionPattern[] = []
lib = learnPattern(lib, ['Next.js', 'Supabase', 'Light Theme'], 97)
lib = learnPattern(lib, ['supabase', 'next.js', 'light theme'], 93)
check('same combination folds into one pattern', lib.length === 1, `got ${lib.length}`)
check('running average is kept', lib[0].outcomeScore === 95 && lib[0].sampleSize === 2, JSON.stringify(lib[0]))
lib = learnPattern(lib, ['WordPress', 'Heavy Animation'], 58)
const good = matchPattern(lib, ['next.js', 'supabase', 'light theme', 'extra'])
check('known good combination is recalled', good?.outcomeScore === 95)
const bad = matchPattern(lib, ['wordpress', 'heavy animation'])
check('known bad combination is recalled', bad?.outcomeScore === 58)
check('unknown combination returns null', matchPattern(lib, ['cobol']) === null)

console.log('\n— Calm UI view —')
const view = buildProjectIntelligence({
  decisions: [
    { decisionId: 'a', category: 'hosting', score: 96 },
    { decisionId: 'b', category: 'design', score: 92 },
  ],
  autoDecidedToday: 3, hoursSaved: 2, openQuestions: 0,
})
check('headline is plain language', view.headline === 'Projekt läuft effizient.', view.headline)
check('highlights are concrete and few', view.highlights.length === 3, JSON.stringify(view.highlights))
check('no jargon leaks into the copy',
  !JSON.stringify(view).match(/credit|token|efficiency score|AI Score/i))
check('empty project degrades gracefully',
  buildProjectIntelligence({ decisions: [] }).headline.includes('Noch keine'))

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
