import { detectRelationship, roleForRelationship, requirementsFor } from '@/lib/projects/handover'
let p=0,f=0; const ck=(n:string,c:boolean,d='')=>{c?(p++,console.log('  ok   '+n)):(f++,console.log('  FAIL '+n+' '+d))}
ck('dev → client erkannt', detectRelationship('dev','client')==='dev_client')
ck('client → dev erkannt', detectRelationship('client','dev')==='client_dev')
ck('dev → dev erkannt', detectRelationship('developer','admin')==='dev_dev')
ck('unbekannt bleibt unbekannt', detectRelationship(null,null)==='unknown')
ck('Groß/Klein egal', detectRelationship('  DEV ','Client')==='dev_client')
ck('Client wird nicht zum Entwickler gemacht', roleForRelationship('dev_client')==='client')
ck('Dev-Dev gibt Entwicklerrolle', roleForRelationship('dev_dev')==='developer')
ck('Auftragsverhältnis braucht Preis+Vertrag', requirementsFor('dev_client').needsPrice && requirementsFor('dev_client').needsContract)
ck('Team-Zusammenarbeit braucht kein Angebot', !requirementsFor('dev_dev').needsPrice)
console.log(`\n${f===0?'ALL PASS':'FAILURES'} — ${p} passed, ${f} failed\n`); process.exit(f?1:0)
