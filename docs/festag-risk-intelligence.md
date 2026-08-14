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
```

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

## Oberfläche

Der mobile Risiko-Flow (`components/dashboard/RiskFlowMobile.tsx`) zieht seine
Warteschlange über `hooks/useMobileRisks.ts` aus echten Risiken samt Belegen.
Solange die Migration nicht eingespielt ist (`table_ready: false`), fällt der
Hook auf blockierte Tasks und den provisorischen `/api/risks/assess`-Speicher
zurück, damit der Flow nicht leer wirkt.

## Noch offen

- GitHub-Webhook stößt die Erkennung nach relevanten Events an
- Tagro-Anreicherung der Kundenfassung und der Empfehlung (heute heuristisch)
- Desktop-Risikoseite und Einstellungsoberfläche für `risk_settings`
- CI-Checks als eigene Signalquelle (`github_check_runs` existiert noch nicht)
