# Festag Risk Intelligence v1

Risiken sind kein Formular, das jemand pflegt. Sie entstehen aus Signalen, die
das System ohnehin sieht — und enden in einer Entscheidung, die ein Mensch
trifft.

```
SIGNALE → BEOBACHTUNG → RISIKO → BEWERTUNG → EMPFEHLUNG → MASSNAHME → ENTSCHEIDUNG
```

## Datenmodell

`supabase/migrations/20260814_risk_intelligence_v1.sql`

| Tabelle | Zweck |
| --- | --- |
| `risks` | Das Objekt selbst: Kategorie, Wahrscheinlichkeit, Auswirkung, Schweregrad, Lebenszyklus, beide Sprachfassungen |
| `risk_signals` | Die Belege — genau die Zeilen, die in „Warum diese Empfehlung?" stehen |
| `risk_links` | Was betroffen ist: Tasks, Entscheidungen, Meilensteine, Issues |
| `risk_events` | Verlauf in ganzen Sätzen, nie als Rohevent |
| `risk_settings` | Erkennung an/aus, Quellen, Sensitivität, Tagro-Autonomie (pro Workspace, optional pro Projekt) |

**Ein Risiko, zwei Ansichten.** `title`/`description` sind die Lieferansicht,
`client_title`/`client_summary` die Kundenansicht. Es gibt niemals zwei
Risikoobjekte für dieselbe Sache — `lib/risks/present.ts` entscheidet, was
rausgeht, und `lib/risks/audience.ts` bestimmt anhand der Rolle, welche Fassung
ein Nutzer bekommt. Technische Belege (GitHub, CI) verlassen die API in der
Kundenansicht gar nicht erst.

## Erkennung

`lib/risks/detect.ts` — reine Funktionen, kein Modellaufruf, kein DB-Zugriff.

Ein einzelnes Signal wird kein Risiko. Jede Regel sammelt Belege mit Gewichten;
erst wenn die Summe über der Schwelle der eingestellten Sensitivität liegt
(`low` 1.0, `medium` 0.6, `high` 0.35), entsteht ein Kandidat.

Regeln in v1:

1. Blockierter Task (+ Blockermeldung, offener PR auf dem Branch, Termin, abhängige Aufgaben)
2. Überfällige Tasks — ab drei Stück als ein einziges Lieferrisiko
3. Gemeldeter Blocker ohne blockierten Task („warte auf Zugangsdaten")
4. Scope-Erweiterung gegen einen gesetzten Zieltermin
5. Restaufwand vs. verbleibende Kapazität
6. Offene, überfällige oder eskalierte Entscheidungen

`lib/risks/severity.ts` berechnet den Schweregrad deterministisch aus
Wahrscheinlichkeit, Auswirkung, Terminnähe und Anzahl abhängiger Vorgänge. Ein
Modell darf schätzen — den Schweregrad setzt es nie.

## Persistenz und Deduplizierung

`lib/risks/engine.ts` lädt die aktivierten Quellen, erkennt und schreibt.
Deduplizierung läuft über `risks.fingerprint` (z. B. `task_blocked:<task_id>`):
Dieselbe Ursache aktualisiert ein Risiko und hängt Belege an. Zehn fehlgeschlagene
Checks sind zehn Signale an einem Risiko, nicht zehn Risiken.

Verschwinden die Signale, fällt ein automatisch erkanntes Risiko erst auf
`monitoring` und beim nächsten stillen Lauf auf `resolved`. Manuell angelegte
Risiken schließt das System nie von selbst. Hat ein Mensch bereits bewertet,
bleibt seine Einschätzung stehen — es kommen nur noch Belege dazu.

## API

```
GET  /api/risks?open=1&with_signals=1     Liste in der Fassung der eigenen Rolle
POST /api/risks                            manuell anlegen (Severity wird berechnet)
GET  /api/risks/[id]                       Risiko + Belege + Verlauf + betroffene Tasks
PATCH /api/risks/[id]                      bearbeiten
POST /api/risks/[id]/respond               Bewertung + Maßnahme aus dem Flow
POST /api/risks/[id]/status                lösen, verwerfen, akzeptieren, wieder öffnen
POST /api/risks/detect                     Erkennung anstoßen (idempotent)
POST /api/risks/[id]/analyze               Tagro formuliert Fassung neu
GET/PUT /api/risks/settings                Erkennungsverhalten je Workspace
```

Die Erkennung läuft nicht nur auf Zuruf, sondern dort, wo Signale entstehen:
nach einem Pull-Request-Webhook und wenn ein Entwickler eine Aufgabe blockiert
oder wieder aufnimmt (`lib/risks/trigger.ts`). Push-Events lösen bewusst nichts
aus — ihre Commits sieht der nächste Lauf ohnehin.

## Maßnahme → Entscheidung

`respond` bildet die Maßnahme auf den Lebenszyklus ab:

| Maßnahme | Status |
| --- | --- |
| Akzeptieren | `accepted` |
| Absichern | `monitoring` |
| Beobachten | `monitoring` |
| Delegieren | `decision_required` + echte Entscheidung |

Delegieren erzeugt über `lib/risks/to-decision.ts` eine Entscheidung im
bestehenden Decision Engine (`decision_type: 'risk_response'`) — keine zweite,
parallele Freigabemechanik. Gespeichert wird außerdem, ob der Mensch der
Empfehlung gefolgt ist; die Abweichung ist der interessante Teil des Protokolls.

## Tagro-Anteil

`lib/risks/enrich.ts` schreibt `client_title`, `client_summary`,
`recommendation`, `recommendation_reason` — und sonst nichts. Wahrscheinlichkeit,
Auswirkung und Schweregrad kommen aus Erkennung und Formel. Jedes Feld wird vor
dem Schreiben geprüft; Kundentext mit Entwicklervokabular wird verworfen, nicht
repariert. Ohne Modell oder bei unbrauchbarer Antwort bleibt die heuristische
Fassung stehen.

## Oberfläche

`/risks` ist die vollständige Ansicht: nach Schweregrad sortiert, Detailpanel
mit Belegen, betroffenen Aufgaben, Empfehlung, Maßnahmen und Verlauf. Manuell
melden geht dort ebenfalls — niemand muss dafür mit Tagro reden.

`/issues` heißt jetzt wieder **Vorfälle** (Bugs, Security, technische Schulden).
Beides sind eigene Objekte: ein Vorfall ist etwas, das kaputt ist, ein Risiko
etwas, das schiefgehen könnte.

Die Einstellungen liegen unter Einstellungen → Tagro & Klarheit →
Risiko-Intelligenz: Erkennung, Signalquellen, Aufmerksamkeit und Tagros
Handlungsspielraum.

Der mobile Risiko-Flow (`components/dashboard/RiskFlowMobile.tsx`) zieht seine
Warteschlange über `hooks/useMobileRisks.ts` aus echten Risiken samt Belegen;
„Mit Tagro analysieren" schärft die Begründung im Sheet nach. Solange die
Migration nicht eingespielt ist (`table_ready: false`), zeigt der Hook
ersatzweise blockierte Tasks — gespeichert wird dann nichts, es gibt bewusst
nur einen Risiko-Speicher.

## Nach der Entscheidung

`lib/risks/actions.ts` ist die einzige Stelle, an der aus einem Risiko eine
Änderung im Projekt wird — über feste Aktionstypen (Priorität anheben, Status
setzen, Notiz, Folgeaufgabe anlegen, Termin verschieben), nie über frei
formulierte Modellanweisungen:

```
Aktion vorschlagen → Berechtigung prüfen → ausführen → protokollieren
```

Die Berechtigung kommt aus der Autonomiestufe (`observe` ändert nichts,
`recommend` fragt, `assist`/`act` dürfen mehr), pro Aktionsart über
`action_permissions` überschreibbar. Einen Termin verschiebt auf keiner Stufe
die Maschine allein — das ist eine Zusage an jemanden.

Was nicht automatisch laufen darf, kommt als offene Aktion zurück und wird der
Person angezeigt — stille Automatik gibt es nicht. Jede ausgeführte Aktion
steht als ganzer Satz im Verlauf, samt Freigeber.

`lib/risks/from-decision.ts` schließt den Kreis: Wird eine Entscheidung
angewendet, die aus einem Risiko entstand, bewegt sich das Risiko mit —
Empfehlung angenommen → `monitoring` plus Maßnahmen, bewusst dagegen →
`accepted`.

## Projektgesundheit

`lib/risks/health.ts` verdichtet offene Risiken zu Zuversicht und Zustand je
Dimension (Lieferung, Scope, Technik, Qualität, Budget, Team). Bewusst eine
Einschätzung, keine Vorhersage: die Zahl steht nie ohne den Grund daneben, und
sie heißt in der Oberfläche „Festag-Einschätzung".

Statusberichte lesen die offenen Risiken mit (`lib/tagro/generate-status-digest.ts`):
in der Kundenfassung, bereits eingestuft — das Modell soll sie zusammenfassen,
nicht neu bewerten. Ohne Risiken bleibt der Bericht, wie er war.

## Wer wann etwas erfährt

`lib/risks/notify.ts` meldet sparsam: nur kritische, offene Risiken, und jedes
höchstens einmal — die Dedupe-Sperre ist der Verlauf selbst (`notified`).
Entscheidungen benachrichtigen bereits über den Decision Engine, hier würde
dieselbe Sache ein zweites Mal klingeln. Kunde und Team bekommen dieselbe
Sache in ihrer jeweiligen Fassung, verlinkt auf dieselbe Risikoseite.

Gemeldet wird erst nach der Anreicherung, damit die Nachricht Tagros
Formulierung trägt und nicht die heuristische Zwischenfassung.

## Wo Risiken sonst auftauchen

- **Kontrollstatus** (`lib/trust/control-status.ts`): ein kritisches Risiko
  schlägt die reine Blocker-Zahl — es benennt, *warum* etwas steht.
- **Executive-Übersicht**: kritische Risiken zählen wie Blocker, und die
  Projektzeile trägt die Kundenfassung des schwersten Risikos.
- **Statusberichte**: siehe oben.

## Noch offen

- CI-Checks als eigene Signalquelle (`github_check_runs` existiert noch nicht)
- Die Zuversichtszahl steht bisher nur auf `/risks`; Dashboard und Executive
  lesen Zähler und Schweregrad, nicht die Prozentzahl
- Benachrichtigungen gehen in die Inbox, nicht per E-Mail oder Push
- `action_permissions` ist im Datenmodell und in der Engine da, aber noch ohne
  eigene Oberfläche — heute stellt man die Autonomiestufe ein, nicht die
  einzelne Aktion
