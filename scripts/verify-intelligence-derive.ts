import { deriveAcceptance, deriveDelayDays, scoreDecisionRow } from '@/lib/intelligence'
let p=0,f=0; const ck=(n:string,c:boolean,d='')=>{c?(p++,console.log('  ok   '+n)):(f++,console.log('  FAIL '+n+' '+d))}
ck('same option = accepted', deriveAcceptance({id:'1',recommended_option:'Modern',selected_option:'modern'})==='accepted')
ck('different option = modified', deriveAcceptance({id:'1',recommended_option:'Modern',selected_option:'Premium'})==='modified')
ck('rejected status wins', deriveAcceptance({id:'1',status:'rejected',recommended_option:'a',selected_option:'a'})==='rejected')
ck('dev override wins', deriveAcceptance({id:'1',recommended_option:'a',selected_option:'a'},{developerOverride:true})==='dev_override')
ck('late by 3 days', deriveDelayDays({id:'1',due_at:'2026-08-01T00:00:00Z',decided_at:'2026-08-04T00:00:00Z'})===3)
ck('missing dates -> undefined', deriveDelayDays({id:'1'})===undefined)
const s=scoreDecisionRow({id:'x',decision_type:'Security',recommended_option:'a',selected_option:'a',superseded_by:'y'})
ck('superseded row reads as reverted', s.score<60 && s.category==='security', JSON.stringify(s))
console.log(`\n${f===0?'ALL PASS':'FAILURES'} — ${p} passed, ${f} failed\n`); process.exit(f?1:0)
