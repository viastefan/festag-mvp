export type FestagDocSection =
  | 'Erste Schritte'
  | 'Projekte'
  | 'Aufgaben & operative Arbeit'
  | 'Statusabfragen'
  | 'Tagro AI'
  | 'Reports & Briefings'
  | 'Teams & Rollen'
  | 'Whitelabel & Agenturen'
  | 'Sicherheit & Vertrauen'

// Editorial block types for the magazine-style long-form articles.
// Articles use either the legacy four-section `content` shape or the
// richer `body` block list. Both stay supported.
export type ArticleBlock =
  | { type: 'lead'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string; id?: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'note'; text: string; kind?: 'default' | 'warning' }
  | { type: 'quote'; text: string }
  | { type: 'mono'; text: string }
  | { type: 'kvtable'; rows: Array<[string, string]> }
  | { type: 'divider' }

export type FestagDocArticle = {
  title: string
  slug: string
  category: FestagDocSection
  description: string
  readingTime: string
  tags: string[]
  popular?: boolean
  content?: {
    overview: string
    explanation: string[]
    example: string
    nextStep: string
  }
  body?: ArticleBlock[]
}

export const docsCategories: Array<{ title: FestagDocSection | 'Best Practices' | 'Hilfe & Support'; description: string }> = [
  { title: 'Erste Schritte', description: 'Grundlagen, Navigation und die ersten Minuten in Festag.' },
  { title: 'Projekte', description: 'Projektanlage, Projektstatus, Detailansichten und nächste Schritte.' },
  { title: 'Aufgaben & operative Arbeit', description: 'Tasks, Prioritäten, Verantwortlichkeiten und Fortschritt.' },
  { title: 'Statusabfragen', description: 'Strukturierte Updates statt verstreuter Nachrichten.' },
  { title: 'Tagro AI', description: 'Wie Tagro Informationen sortiert, bewertet und verdichtet.' },
  { title: 'Teams & Rollen', description: 'Zusammenarbeit, externe Personen und klare Zugriffe.' },
  { title: 'Reports & Briefings', description: 'Statusberichte, Executive Summaries, Audio und Transkripte.' },
  { title: 'Whitelabel & Agenturen', description: 'Kundenportale, Agenturprozesse und diskrete Projektsteuerung.' },
  { title: 'Sicherheit & Vertrauen', description: 'Transparenz, Accountability, Datenschutz und professionelle Kommunikation.' },
  { title: 'Best Practices', description: 'Ruhige Arbeitsweisen für bessere Projektübersicht.' },
  { title: 'Hilfe & Support', description: 'Wenn etwas unklar ist oder ein Setup besprochen werden soll.' },
]

const article = (
  category: FestagDocSection,
  title: string,
  slug: string,
  description: string,
  tags: string[],
  content: FestagDocArticle['content'],
  popular = false,
  readingTime = '4 Min.',
): FestagDocArticle => ({ title, slug, category, description, tags, content, popular, readingTime })

const richArticle = (
  category: FestagDocSection,
  title: string,
  slug: string,
  description: string,
  tags: string[],
  body: ArticleBlock[],
  popular = false,
  readingTime = '6 Min.',
): FestagDocArticle => ({ title, slug, category, description, tags, body, popular, readingTime })

export const festagDocsArticles: FestagDocArticle[] = [
  article('Erste Schritte', 'Was ist Festag?', 'was-ist-festag',
    'Ein Überblick über Festag als Plattform für Projekte, Teams, Statusberichte und operative Transparenz.',
    ['Grundlagen', 'Plattform', 'Transparenz', 'Projekte'],
    {
      overview: 'Festag bündelt Projekte, Aufgaben, Statusabfragen und Tagro-Briefings in einer ruhigen Arbeitsoberfläche.',
      explanation: [
        'Der Kern von Festag ist operative Übersicht. Projekte werden nicht nur abgelegt, sondern laufend in verständliche Statussignale übersetzt.',
        'Teams, Kunden und externe Umsetzer arbeiten mit denselben Projektinformationen, ohne dass alles in Chats oder Tabellen verteilt werden muss.',
      ],
      example: 'Eine Agentur sieht in Festag, welche Kundenprojekte aktiv sind, welche Aufgaben offen sind und welche Entscheidungen gerade blockieren.',
      nextStep: 'Starte mit dem Dashboard und lege danach dein erstes Projekt an.',
    }, true),
  article('Erste Schritte', 'Schnellstart mit Festag', 'schnellstart-mit-festag',
    'Die wichtigsten ersten Schritte nach der Registrierung.',
    ['Start', 'Onboarding', 'Projektanlage'],
    {
      overview: 'Nach der Registrierung geht es darum, ein erstes Projekt, ein Team und den passenden Statusrhythmus aufzusetzen.',
      explanation: [
        'Lege zuerst ein Projekt an und beschreibe knapp Ziel, Umfang und aktuelle Lage.',
        'Ergänze anschließend Mitwirkende oder Teams, damit Verantwortlichkeiten früh sichtbar werden.',
        'Nutze Statusabfragen und Reports, sobald echte Arbeit läuft. So entstehen Berichte aus realen Signalen statt aus Bauchgefühl.',
      ],
      example: 'Ein neues Website-Projekt startet mit Titel, Ziel, nächstem Meilenstein und zwei Mitwirkenden. Danach kann Tagro erste nächste Schritte ableiten.',
      nextStep: 'Öffne Projekte und erstelle ein erstes Projekt mit klarer Kurzbeschreibung.',
    }, true, '3 Min.'),
  article('Erste Schritte', 'Das Dashboard verstehen', 'dashboard-verstehen',
    'Wie Projekte, Aufgaben, Statusmeldungen und Tagro-Hinweise zusammenlaufen.',
    ['Dashboard', 'Statusabfrage', 'Überblick'],
    {
      overview: 'Das Dashboard ist die tägliche Lagefläche für Fortschritt, Risiken, Entscheidungen und Briefings.',
      explanation: [
        'Die Statusabfrage zeigt nicht jede Detailinformation, sondern die wichtigsten Signale für Steuerung und nächste Schritte.',
        'Tagro verdichtet Aufgaben, Projektstatus und Berichte zu einer verständlichen Lage, die schnell gelesen oder gehört werden kann.',
      ],
      example: 'Wenn ein Projekt blockiert ist, erscheint der Hinweis nicht irgendwo tief in einer Aufgabe, sondern als Signal im Dashboard.',
      nextStep: 'Prüfe im Dashboard zuerst Risiken und Entscheidungen, dann öffne bei Bedarf das Projekt.',
    }, true),
  article('Erste Schritte', 'Die wichtigsten Bereiche in Festag', 'wichtigste-bereiche',
    'Kurzer Überblick über Projekte, Tasks, Statusabfragen, Teams, Reports und Tagro.',
    ['Navigation', 'Projekte', 'Tasks', 'Tagro'],
    {
      overview: 'Festag ist in wenige Kernbereiche gegliedert: Projekte, Tasks, Teams, Reports, Statusabfrage und Tagro AI.',
      explanation: [
        'Projekte bilden den Kontext. Tasks zeigen operative Arbeit. Teams und Rollen klären Verantwortlichkeiten.',
        'Reports und Audio-Briefings übersetzen laufende Arbeit in eine Form, die Entscheider und Stakeholder schnell verstehen.',
      ],
      example: 'Ein CEO öffnet nicht jedes Ticket, sondern liest den Report, hört das Briefing und prüft nur die offenen Entscheidungen.',
      nextStep: 'Nutze die Sidebar als feste Orientierung: erst Status, dann Projekte, dann Reports.',
    }),
  article('Erste Schritte', 'Festag für neue Nutzer erklärt', 'festag-fuer-neue-nutzer',
    'Eine einfache Einführung für Nutzer, die das Produkt zum ersten Mal verwenden.',
    ['Einführung', 'Neue Nutzer', 'Produkt'],
    {
      overview: 'Festag hilft neuen Nutzern, Projektarbeit ohne lange Einarbeitung zu verstehen.',
      explanation: [
        'Die Oberfläche ist bewusst ruhig aufgebaut. Wichtige Bereiche bleiben in der Sidebar stabil erreichbar.',
        'Neue Nutzer müssen nicht alle Details kennen. Sie können mit Projektübersicht, Statusberichten und Tagro-Briefings starten.',
      ],
      example: 'Ein Kunde sieht, was passiert ist, was offen ist und welche Freigabe von ihm erwartet wird, ohne ein Projektmanagement-Tool lernen zu müssen.',
      nextStep: 'Lies danach den Artikel zu Statusabfragen, weil sie den täglichen Informationsfluss erklären.',
    }),

  article('Projekte', 'Ein neues Projekt anlegen', 'projekt-anlegen',
    'Wie ein Projekt erstellt, beschrieben und vorbereitet wird.',
    ['Projekte', 'Projektanlage', 'Start'],
    {
      overview: 'Ein Projekt braucht einen verständlichen Namen, eine kurze Beschreibung und einen klaren Startkontext.',
      explanation: [
        'Beschreibe nicht jedes Detail, sondern Ziel, aktuelles Problem, gewünschtes Ergebnis und bekannte Rahmenbedingungen.',
        'Diese Informationen helfen Tagro später, Statusberichte, nächste Schritte und Risiken sinnvoll einzuordnen.',
      ],
      example: 'Statt "Website" ist "Praxis-Website für systemische Beratung mit Termin-Anfrage" deutlich besser.',
      nextStep: 'Nach der Anlage solltest du erste Aufgaben oder Mitwirkende hinzufügen.',
    }, true),
  article('Projekte', 'Projektfarben und Projektakzente nutzen', 'projektfarben-und-akzente',
    'Wie Projektakzente helfen, Projekte schneller wiederzuerkennen.',
    ['Projektfarben', 'Organisation', 'UI'],
    {
      overview: 'Projektakzente sind Orientierungshilfen, keine Dekoration.',
      explanation: [
        'Farben helfen, Projekte in Listen und Übersichten schneller wiederzuerkennen.',
        'Nutze Farben sparsam und konsistent, besonders wenn mehrere Kunden oder Teams parallel arbeiten.',
      ],
      example: 'Eine Agentur kann pro Kunde eine ruhige Akzentfarbe verwenden und interne Projekte neutral halten.',
      nextStep: 'Setze Akzente dort, wo viele Projekte gleichzeitig sichtbar sind.',
    }, false, '2 Min.'),
  article('Projekte', 'Projektstatus richtig verstehen', 'projektstatus-verstehen',
    'Wie Statusfilter genutzt werden und warum nicht jede Information in der Tabelle doppelt angezeigt werden muss.',
    ['Projektstatus', 'Filter', 'Übersicht'],
    {
      overview: 'Der Projektstatus zeigt die grobe operative Phase, nicht jeden einzelnen Arbeitsschritt.',
      explanation: [
        'Statuswerte helfen beim Filtern und Priorisieren. Details gehören in Aufgaben, Berichte und Projektansichten.',
        'So bleibt die Projektliste lesbar und wird nicht zu einer überladenen Tabelle.',
      ],
      example: 'Ein Projekt kann "In Arbeit" sein, während einzelne Tasks auf Review oder Freigabe warten.',
      nextStep: 'Nutze die Projektansicht, wenn du die Gründe hinter einem Status verstehen willst.',
    }),
  article('Projekte', 'Projektansicht verstehen', 'projektansicht-verstehen',
    'Welche Informationen in der Detailansicht sichtbar sind und wie sie gelesen werden.',
    ['Projektansicht', 'Details', 'Tasks'],
    {
      overview: 'Die Projektansicht sammelt Kontext, Aufgaben, Mitwirkende, Updates und relevante Hinweise an einem Ort.',
      explanation: [
        'Sie ist der richtige Ort, wenn du nicht nur wissen willst, dass etwas offen ist, sondern warum.',
        'Statusberichte und Tagro-Hinweise helfen, die Detailinformationen in eine verständliche Lage zu übersetzen.',
      ],
      example: 'Bei einem offenen Review zeigt die Projektansicht Aufgabe, Verantwortliche und Kontext des letzten Updates.',
      nextStep: 'Öffne ein aktives Projekt und prüfe Aufgaben, Status und letzte Updates zusammen.',
    }),
  article('Projekte', 'Nächste Schritte in Projekten planen', 'naechste-schritte-planen',
    'Wie aus einer Projektbeschreibung konkrete nächste Aktionen entstehen.',
    ['Nächste Schritte', 'Planung', 'Tagro'],
    {
      overview: 'Nächste Schritte verbinden Projektziel und operative Arbeit.',
      explanation: [
        'Gute nächste Schritte sind konkret, prüfbar und einer Person oder Rolle zuordenbar.',
        'Tagro kann aus Beschreibungen und Statusberichten Vorschläge ableiten, die vor dem Ausführen bestätigt werden.',
      ],
      example: 'Aus "Mobile Ansicht prüfen" wird eine Aufgabe wie "Navigation auf kleinen Screens testen und Abstände korrigieren".',
      nextStep: 'Erstelle wenige klare Schritte statt viele vage Aufgaben.',
    }),
  article('Projekte', 'Mitwirkende einem Projekt zuordnen', 'mitwirkende-zuordnen',
    'Wie Personen, Teams oder Entwickler einem Projekt zugeordnet werden.',
    ['Mitwirkende', 'Teams', 'Zuständigkeit'],
    {
      overview: 'Mitwirkende machen sichtbar, wer im Projekt beteiligt ist und wer Informationen erhalten sollte.',
      explanation: [
        'Festag trennt Projektkontext, Aufgaben und Rollen. Eine Person kann sichtbar beteiligt sein, ohne überall Zugriff zu haben.',
        'Dadurch bleiben Zuständigkeiten klar, während sensible Bereiche geschützt bleiben.',
      ],
      example: 'Ein externer Entwickler sieht die relevanten Aufgaben, aber nicht automatisch alle Kundendaten oder Abrechnungsinformationen.',
      nextStep: 'Ordne Mitwirkende erst nach Rolle und Verantwortlichkeit zu, nicht nach Gewohnheit.',
    }),
  article('Projekte', 'Interne und externe Projekte unterscheiden', 'interne-und-externe-projekte',
    'Wie Festag zwischen eigenen Teams, externen Entwicklern und Whitelabel-Projekten unterscheidet.',
    ['Intern', 'Extern', 'Whitelabel', 'Agenturen'],
    {
      overview: 'Nicht jedes Projekt hat dieselbe Sichtbarkeit und denselben Kommunikationsbedarf.',
      explanation: [
        'Interne Projekte brauchen andere Transparenz als Kundenprojekte oder Whitelabel-Setups.',
        'Festag hilft dabei, operative Arbeit sichtbar zu machen, ohne unnötig viele interne Details nach außen zu geben.',
      ],
      example: 'Eine Agentur kann ein Kundenportal anbieten, während die tatsächliche Umsetzung im Hintergrund organisiert wird.',
      nextStep: 'Entscheide beim Projektstart, wer Fortschritt sehen darf und wer nur Ergebnisse braucht.',
    }),

  article('Aufgaben & operative Arbeit', 'Tasks in Festag verstehen', 'tasks-verstehen',
    'Wie Aufgaben strukturiert und verfolgt werden.',
    ['Tasks', 'Aufgaben', 'Operative Arbeit'],
    {
      overview: 'Tasks sind die operative Ebene unter Projekten.',
      explanation: [
        'Eine Aufgabe sollte beschreiben, was konkret zu tun ist und in welchem Projektkontext sie steht.',
        'Status, Priorität und Verantwortlichkeit helfen, Arbeit steuerbar zu machen, ohne jeden Schritt zu mikromanagen.',
      ],
      example: 'Eine Aufgabe wie "Dashboard Layout freigeben" ist klarer als "Dashboard anschauen".',
      nextStep: 'Achte darauf, dass jede wichtige Aufgabe einen Owner oder nächsten Prüfschritt hat.',
    }, true),
  article('Aufgaben & operative Arbeit', 'Aufgaben sinnvoll priorisieren', 'aufgaben-priorisieren',
    'Wie Prioritäten helfen, operative Arbeit klarer zu steuern.',
    ['Priorität', 'Tasks', 'Steuerung'],
    {
      overview: 'Prioritäten sind nur hilfreich, wenn sie Entscheidungen erleichtern.',
      explanation: [
        'Nicht jede Aufgabe ist dringend. Gute Priorisierung unterscheidet Blocker, Review-Punkte, nächste Schritte und spätere Verbesserungen.',
        'Festag nutzt Prioritäten als Signal für Übersicht und Berichte, nicht als starres Kontrollsystem.',
      ],
      example: 'Ein blockierter Login ist höher zu priorisieren als eine optionale Textkorrektur im Footer.',
      nextStep: 'Priorisiere nach Risiko, Nutzerwirkung und Abhängigkeiten.',
    }),
  article('Aufgaben & operative Arbeit', 'Verantwortlichkeiten sichtbar machen', 'verantwortlichkeiten-sichtbar-machen',
    'Wie Festag zeigt, wer für welche Aufgabe zuständig ist.',
    ['Verantwortlichkeit', 'Owner', 'Accountability'],
    {
      overview: 'Klare Verantwortlichkeiten reduzieren Rückfragen und stille Blockaden.',
      explanation: [
        'Festag macht sichtbar, wer an einer Aufgabe arbeitet, wer prüft und wer eine Entscheidung treffen muss.',
        'Das schafft Accountability, ohne Menschen permanent kontrollieren zu müssen.',
      ],
      example: 'Wenn ein Review offen ist, sieht der Nutzer nicht nur die Aufgabe, sondern auch, wer sie freigeben soll.',
      nextStep: 'Weise Aufgaben so zu, dass der nächste konkrete Schritt klar ist.',
    }),
  article('Aufgaben & operative Arbeit', 'Offene Punkte erkennen', 'offene-punkte-erkennen',
    'Wie aus Projektinformationen konkrete offene Punkte entstehen.',
    ['Offene Punkte', 'Risiken', 'Entscheidungen'],
    {
      overview: 'Offene Punkte entstehen oft aus unklaren Entscheidungen, fehlendem Feedback oder blockierten Aufgaben.',
      explanation: [
        'Festag sammelt diese Signale aus Projekten, Tasks und Statusberichten.',
        'Tagro kann sie in Berichten sichtbar machen und daraus bestätigungspflichtige Vorschläge ableiten.',
      ],
      example: 'Wenn mehrere Aufgaben auf Kundenfeedback warten, wird daraus ein Entscheidungs- oder Review-Signal.',
      nextStep: 'Prüfe offene Punkte regelmäßig in Statusabfrage und Reports.',
    }),
  article('Aufgaben & operative Arbeit', 'Fortschritt ohne Mikromanagement verfolgen', 'fortschritt-ohne-mikromanagement',
    'Wie Führungskräfte Überblick behalten, ohne ständig nachfragen zu müssen.',
    ['Führung', 'Fortschritt', 'Übersicht'],
    {
      overview: 'Festag soll Überblick schaffen, nicht Kontrolle simulieren.',
      explanation: [
        'Führungskräfte brauchen verlässliche Signale: Fortschritt, Blocker, Entscheidungen und nächste Schritte.',
        'Statusabfragen und Reports ersetzen viele kurze Nachfragen, weil Informationen regelmäßig strukturiert eintreffen.',
      ],
      example: 'Ein CEO hört ein Audio-Briefing und öffnet nur die zwei Projekte, bei denen Entscheidungen nötig sind.',
      nextStep: 'Nutze Reports als Entscheidungsgrundlage statt als Tätigkeitsprotokoll.',
    }),

  article('Statusabfragen', 'Was ist eine Statusabfrage?', 'was-ist-eine-statusabfrage',
    'Statusabfragen helfen dabei, klare Updates von Beteiligten einzuholen, ohne lange Rückfragen oder unübersichtliche Chats.',
    ['Statusabfrage', 'Updates', 'Transparenz'],
    {
      overview: 'Eine Statusabfrage ist eine strukturierte Nachfrage nach dem aktuellen Arbeitsstand.',
      explanation: [
        'Sie ersetzt unklare Chat-Nachrichten wie "Wie sieht es aus?" durch wiederholbare, kurze und auswertbare Updates.',
        'Tagro kann Antworten später zusammenfassen und daraus Statusberichte, Risiken oder nächste Schritte ableiten.',
      ],
      example: 'Ein Entwickler meldet Fortschritt, Blocker und nächste Schritte. Der Kunde sieht daraus eine klare Zusammenfassung.',
      nextStep: 'Erstelle Statusabfragen für Projekte, bei denen du regelmäßig Überblick brauchst.',
    }, true),
  article('Statusabfragen', 'Statusabfragen erstellen', 'statusabfragen-erstellen',
    'Wie eine neue Statusabfrage angelegt wird.',
    ['Statusabfragen', 'Erstellen', 'Updates'],
    {
      overview: 'Eine gute Statusabfrage ist kurz und fragt nur nach Informationen, die wirklich helfen.',
      explanation: [
        'Frage nach Fortschritt, offenen Punkten und nächsten Schritten. Vermeide zu viele Felder.',
        'Je klarer die Abfrage, desto besser kann Tagro die Antworten später strukturieren.',
      ],
      example: 'Eine wöchentliche Abfrage fragt: Was wurde erledigt? Was blockiert? Was ist als Nächstes geplant?',
      nextStep: 'Starte mit einer einfachen Abfrage und passe sie erst an, wenn echte Antworten vorliegen.',
    }),
  article('Statusabfragen', 'Statusabfragen an Teammitglieder senden', 'statusabfragen-senden',
    'Wie Beteiligte regelmäßig kurze Updates geben können.',
    ['Team', 'Updates', 'Rhythmus'],
    {
      overview: 'Statusabfragen wirken am besten, wenn sie in einem festen Rhythmus verschickt werden.',
      explanation: [
        'Beteiligte müssen wissen, was von ihnen erwartet wird und wie knapp die Antwort sein darf.',
        'Regelmäßigkeit ist wichtiger als Länge. Kurze Updates sind oft wertvoller als seltene lange Berichte.',
      ],
      example: 'Ein Team gibt jeden Freitag kurze Projektupdates ab, aus denen Tagro eine Wochenübersicht erstellt.',
      nextStep: 'Lege einen Rhythmus fest, der zur Projektgeschwindigkeit passt.',
    }),
  article('Statusabfragen', 'Antworten aus Statusabfragen verstehen', 'antworten-aus-statusabfragen',
    'Wie Rückmeldungen gesammelt und lesbar gemacht werden.',
    ['Antworten', 'Auswertung', 'Tagro'],
    {
      overview: 'Antworten sind Rohsignale, die erst durch Struktur wirklich nützlich werden.',
      explanation: [
        'Festag sammelt Rückmeldungen und ordnet sie Projekt, Person und Zeitpunkt zu.',
        'Tagro kann daraus lesbare Zusammenfassungen und Hinweise auf Risiken oder Entscheidungen erstellen.',
      ],
      example: 'Drei einzelne Updates werden zu einer kurzen Lage: Fortschritt stabil, ein Review offen, kein Blocker.',
      nextStep: 'Lies Antworten nicht isoliert, sondern im Kontext von Projekt und Aufgaben.',
    }),
  article('Statusabfragen', 'Statusabfragen für Kundenprojekte nutzen', 'statusabfragen-fuer-kundenprojekte',
    'Wie Agenturen oder Dienstleister Kundenprojekte transparenter steuern können.',
    ['Kundenprojekte', 'Agenturen', 'Status'],
    {
      overview: 'Bei Kundenprojekten reduzieren Statusabfragen Unsicherheit auf beiden Seiten.',
      explanation: [
        'Kunden erhalten klare Updates, ohne permanent nachfragen zu müssen.',
        'Dienstleister können Fortschritt dokumentieren und Entscheidungen rechtzeitig sichtbar machen.',
      ],
      example: 'Eine Agentur sendet wöchentlich eine Statusabfrage an das Umsetzungsteam und teilt danach einen ruhigen Kundenreport.',
      nextStep: 'Nutze Statusabfragen vor allem dort, wo mehrere Stakeholder auf denselben Stand gebracht werden müssen.',
    }),
  article('Statusabfragen', 'Statusabfragen für interne Teams nutzen', 'statusabfragen-fuer-interne-teams',
    'Wie Unternehmen interne Arbeit besser sichtbar machen.',
    ['Interne Teams', 'Unternehmen', 'Updates'],
    {
      overview: 'Interne Statusabfragen schaffen Übersicht, ohne Meetings zu verlängern.',
      explanation: [
        'Teams können kurze Updates geben, bevor Führungskräfte oder Projektleitungen in Details gehen.',
        'So entstehen bessere Entscheidungsgrundlagen für Prioritäten, Ressourcen und Freigaben.',
      ],
      example: 'Ein internes Produktteam sammelt montags Updates und nutzt sie für eine kurze Executive Summary.',
      nextStep: 'Starte intern mit wenigen Fragen und einem festen wöchentlichen Rhythmus.',
    }),

  article('Tagro AI', 'Was ist Tagro?', 'was-ist-tagro',
    'Lerne, wie Tagro Projektinformationen in klare Statusberichte, Einschätzungen und Briefings übersetzt.',
    ['Tagro', 'AI', 'Briefings', 'Statusberichte'],
    {
      overview: 'Tagro ist die intelligente Strukturierungsschicht von Festag.',
      explanation: [
        'Tagro liest Projektinformationen, Aufgaben, Updates und Statusberichte im jeweiligen Kontext.',
        'Das Ziel ist nicht Smalltalk, sondern operative Klarheit: Was passiert, was ist offen, was ist riskant, was kommt als Nächstes?',
      ],
      example: 'Aus verstreuten Aufgaben und Updates formuliert Tagro eine kurze Lage mit offenen Reviews und Risiken.',
      nextStep: 'Öffne Tagro Chat, wenn du eine konkrete Frage zu Projekten oder Entscheidungen hast.',
    }, true),
  article('Tagro AI', 'Wie Tagro Projektinformationen strukturiert', 'wie-tagro-projektinformationen-strukturiert',
    'Wie aus Eingaben, Aufgaben und Updates klare Zusammenfassungen entstehen.',
    ['Tagro', 'Struktur', 'Zusammenfassungen'],
    {
      overview: 'Tagro sortiert Informationen nach Projekt, Status, Risiko, Entscheidung und nächstem Schritt.',
      explanation: [
        'Nicht jede Information ist gleich wichtig. Tagro trennt Fortschritt von Blockern und konkrete Entscheidungen von allgemeinem Kontext.',
        'Dadurch werden Berichte kürzer und besser lesbar.',
      ],
      example: 'Ein langer Projektverlauf wird zu vier Punkten: erledigt, offen, Risiko, nächste Entscheidung.',
      nextStep: 'Nutze klare Projekt- und Taskdaten, damit Tagro präzisere Zusammenfassungen erstellen kann.',
    }),
  article('Tagro AI', 'Warum Tagro nicht wie ein klassischer Chatbot arbeitet', 'tagro-kein-klassischer-chatbot',
    'Tagro fragt nicht unnötig viel, sondern registriert, strukturiert und bereitet nächste Schritte vor.',
    ['Tagro', 'Chat', 'Arbeitsweise'],
    {
      overview: 'Tagro ist kein Support-Chat, sondern eine Arbeitsoberfläche für Projektsteuerung.',
      explanation: [
        'Viele Chatbots reagieren nur auf einzelne Fragen. Tagro arbeitet mit dem vorhandenen Festag-Kontext.',
        'Wichtige Aktionen wie Tasks erstellen oder Reviews freigeben werden vorbereitet, aber nicht ohne Bestätigung ausgeführt.',
      ],
      example: 'Wenn du nach Risiken fragst, prüft Tagro Projektlage und Aufgaben statt eine allgemeine Antwort zu geben.',
      nextStep: 'Formuliere Fragen projektbezogen, zum Beispiel: "Welche Entscheidungen blockieren Client Portal?"',
    }),
  article('Tagro AI', 'Tagro Einschätzungen verstehen', 'tagro-einschaetzungen-verstehen',
    'Wie Tagro Risiken, Fortschritt und nächste Schritte zusammenfasst.',
    ['Risiken', 'Fortschritt', 'Tagro'],
    {
      overview: 'Tagro-Einschätzungen sind Hinweise, keine unsichtbaren Entscheidungen.',
      explanation: [
        'Tagro zeigt, warum ein Thema relevant sein könnte: blockierte Aufgaben, wartende Freigaben oder fehlende Updates.',
        'Die finale Entscheidung bleibt beim Nutzer oder der verantwortlichen Rolle.',
      ],
      example: 'Tagro kann sagen: "Ein Review ist seit drei Tagen offen und blockiert den nächsten Schritt."',
      nextStep: 'Nutze Einschätzungen als Startpunkt für Prüfung, nicht als automatische Wahrheit.',
    }),
  article('Tagro AI', 'Tagro bei neuen Projekten', 'tagro-bei-neuen-projekten',
    'Wie Tagro Projektbeschreibungen verarbeitet und abhängig von der Umsetzungsart reagiert.',
    ['Neue Projekte', 'Tagro', 'Projektanlage'],
    {
      overview: 'Bei neuen Projekten hilft Tagro, aus einer Beschreibung eine erste Struktur zu machen.',
      explanation: [
        'Je nach Projektart kann Tagro nächste Schritte, offene Fragen oder mögliche Aufgaben vorschlagen.',
        'Die Vorschläge bleiben bestätigungspflichtig, damit keine ungewollten Aktionen entstehen.',
      ],
      example: 'Aus einer App-Idee werden erste Bereiche wie Anforderungen, Design, Entwicklung, Review und Launch.',
      nextStep: 'Beschreibe ein neues Projekt so konkret wie möglich und prüfe Tagros Vorschläge.',
    }),
  article('Tagro AI', 'Tagro für Führungskräfte', 'tagro-fuer-fuehrungskraefte',
    'Wie CEOs, Gründer und Entscheider schnell Überblick über laufende Arbeit erhalten.',
    ['CEO', 'Führung', 'Entscheidungen'],
    {
      overview: 'Für Führungskräfte reduziert Tagro die Zeit zwischen Information und Entscheidung.',
      explanation: [
        'Statt Einzelupdates zu lesen, können Entscheider Projektstände, Risiken und Freigaben zusammengefasst prüfen.',
        'Audio-Briefings und Executive Summaries helfen, die Lage schnell zu erfassen.',
      ],
      example: 'Ein Gründer hört morgens ein Briefing und öffnet nur die Projekte mit offenen Entscheidungen.',
      nextStep: 'Nutze Tagro für Fragen wie: "Was ist heute wichtig?" oder "Was blockiert Delivery?"',
    }),

  article('Reports & Briefings', 'Statusberichte in Festag', 'statusberichte-in-festag',
    'Wie regelmäßige Berichte aus Projektinformationen entstehen.',
    ['Statusberichte', 'Reports', 'Projektinformationen'],
    {
      overview: 'Statusberichte übersetzen laufende Projektarbeit in verständliche Kommunikation.',
      explanation: [
        'Sie entstehen aus Aufgaben, Updates, Statusabfragen und Projektdaten.',
        'Ein guter Bericht zeigt Fortschritt, offene Punkte, Risiken und nächste Schritte, ohne jedes Detail zu wiederholen.',
      ],
      example: 'Ein Kunde erhält einen Bericht, der erklärt, was fertig ist und welche Freigabe als Nächstes nötig ist.',
      nextStep: 'Erstelle Statusberichte erst, wenn echte Projektinformationen vorhanden sind.',
    }, true),
  article('Reports & Briefings', 'Executive Weekly Summary', 'executive-weekly-summary',
    'Wie wöchentliche Zusammenfassungen für Entscheider aufgebaut sind.',
    ['Executive Summary', 'Weekly', 'Führung'],
    {
      overview: 'Eine Executive Weekly Summary fasst die Woche entscheidungsorientiert zusammen.',
      explanation: [
        'Sie priorisiert Fortschritt, Risiken, Blocker und Entscheidungen über Detailaktivität.',
        'Der Zweck ist Führung und Klarheit, nicht Tätigkeitsnachweis.',
      ],
      example: 'Eine Zusammenfassung zeigt: zwei Projekte im Plan, ein Review offen, ein Risiko ohne akute Verzögerung.',
      nextStep: 'Nutze Weekly Summaries für regelmäßige Steuerungstermine.',
    }),
  article('Reports & Briefings', 'Audio-Briefings mit Tagro', 'audio-briefings-mit-tagro',
    'Wie kurze Audio-Zusammenfassungen aus Statusberichten entstehen.',
    ['Audio', 'Briefings', 'Tagro'],
    {
      overview: 'Audio-Briefings machen Statusberichte hörbar.',
      explanation: [
        'Tagro nutzt den schriftlichen Bericht oder den Projektkontext und erstellt daraus eine kurze gesprochene Lage.',
        'Das eignet sich für schnelle Übersicht, nicht für vollständige Detailprüfung.',
      ],
      example: 'Ein Entscheider hört in unter zwei Minuten, welche Projekte stabil sind und wo eine Freigabe fehlt.',
      nextStep: 'Höre Audio-Briefings als Einstieg und öffne danach bei Bedarf den schriftlichen Report.',
    }, true),
  article('Reports & Briefings', 'Text-Transkripte zu Audio-Briefings', 'transkripte-zu-audio-briefings',
    'Warum jedes Audio-Briefing auch als Text gespeichert wird.',
    ['Transkript', 'Audio', 'Dokumentation'],
    {
      overview: 'Transkripte machen Audio-Briefings nachvollziehbar und zitierbar.',
      explanation: [
        'Nicht jeder kann oder will Audio hören. Ein Text-Transkript sorgt dafür, dass die Information dokumentiert bleibt.',
        'Transkripte können später als Briefing-Historie oder Grundlage für Reports dienen.',
      ],
      example: 'Nach einem Gesamtbriefing wird das Transkript links in der Statusabfrage als schriftlicher Eintrag abgelegt.',
      nextStep: 'Nutze Transkripte, wenn du Inhalte teilen, prüfen oder später wiederfinden willst.',
    }),
  article('Reports & Briefings', 'Reports für Kunden und Stakeholder', 'reports-fuer-kunden-und-stakeholder',
    'Wie Fortschritt verständlich nach außen kommuniziert werden kann.',
    ['Kunden', 'Stakeholder', 'Reports'],
    {
      overview: 'Externe Reports sollten verständlich, ruhig und handlungsorientiert sein.',
      explanation: [
        'Kunden brauchen nicht jedes interne Detail, sondern Fortschritt, offene Entscheidungen und Risiken.',
        'Festag hilft, interne Arbeit in professionelle Projektkommunikation zu übersetzen.',
      ],
      example: 'Ein Kunde sieht, dass Design abgeschlossen ist, Entwicklung läuft und eine Inhaltsfreigabe benötigt wird.',
      nextStep: 'Prüfe vor dem Teilen, ob der Report für die externe Zielgruppe geschrieben ist.',
    }),

  article('Teams & Rollen', 'Teams in Festag verwalten', 'teams-verwalten',
    'Wie Teams angelegt und organisiert werden.',
    ['Teams', 'Organisation', 'Rollen'],
    {
      overview: 'Teams bündeln Personen, Projekte und Verantwortlichkeiten.',
      explanation: [
        'Ein Team kann intern, kundenbezogen oder projektbezogen organisiert sein.',
        'Saubere Teamstrukturen helfen, Einladungen, Zugriffe und Projektübersicht konsistent zu halten.',
      ],
      example: 'Eine Agentur trennt internes Delivery-Team, Kunden-Team und externe Entwickler.',
      nextStep: 'Lege Teams so an, wie Arbeit tatsächlich organisiert wird.',
    }),
  article('Teams & Rollen', 'Rollen und Berechtigungen verstehen', 'rollen-und-berechtigungen',
    'Wie Zugriffe und Verantwortlichkeiten geregelt werden.',
    ['Rollen', 'Berechtigungen', 'Zugriff'],
    {
      overview: 'Rollen bestimmen, wer sehen, bearbeiten, prüfen oder freigeben kann.',
      explanation: [
        'Nicht jede Person braucht dieselben Informationen. Festag trennt Sichtbarkeit und Verantwortung.',
        'Das schützt sensible Daten und macht Zuständigkeiten klarer.',
      ],
      example: 'Ein Client Approver kann Entscheidungen freigeben, ohne interne Entwicklernotizen zu sehen.',
      nextStep: 'Vergib Rollen nach Aufgabe, nicht nach Hierarchie allein.',
    }, true),
  article('Teams & Rollen', 'Mit externen Entwicklern arbeiten', 'mit-externen-entwicklern-arbeiten',
    'Wie externe Personen kontrolliert und transparent eingebunden werden.',
    ['Externe Entwickler', 'Teams', 'Transparenz'],
    {
      overview: 'Externe Entwickler können produktiv eingebunden werden, ohne die Projektübersicht zu verlieren.',
      explanation: [
        'Festag macht Aufgaben, Updates und Fortschritt sichtbar, ohne jeden Arbeitsschritt zu überwachen.',
        'Klare Rollen und Statusabfragen reduzieren Unsicherheit in externer Zusammenarbeit.',
      ],
      example: 'Ein externer Entwickler gibt Updates ab, Tagro macht daraus eine kurze Kundenlage.',
      nextStep: 'Definiere Aufgaben, Update-Rhythmus und Review-Verantwortung vor dem Start.',
    }),
  article('Teams & Rollen', 'Zusammenarbeit zwischen Kunden und Umsetzern', 'zusammenarbeit-kunden-umsetzer',
    'Wie Festag Missverständnisse reduziert und klare Kommunikation unterstützt.',
    ['Kunden', 'Umsetzer', 'Kommunikation'],
    {
      overview: 'Festag schafft eine gemeinsame, ruhige Sicht auf Projektarbeit.',
      explanation: [
        'Kunden sehen Fortschritt und Entscheidungen, Umsetzer behalten operative Aufgaben im Blick.',
        'So müssen beide Seiten weniger interpretieren und können konkreter handeln.',
      ],
      example: 'Eine offene Freigabe wird als Entscheidung sichtbar, statt in einem Chatverlauf unterzugehen.',
      nextStep: 'Nutze Reports, um Kommunikation regelmäßig zu ordnen.',
    }),

  article('Whitelabel & Agenturen', 'Festag für Agenturen', 'festag-fuer-agenturen',
    'Wie Agenturen Festag nutzen können, um Kundenprojekte professioneller zu steuern.',
    ['Agenturen', 'Kundenprojekte', 'Projektsteuerung'],
    {
      overview: 'Agenturen können Festag als operative Projektzentrale und Kundenportal nutzen.',
      explanation: [
        'Kunden erhalten klare Sicht auf Fortschritt, offene Punkte und Reports.',
        'Das interne Team behält Aufgaben, externe Mitwirkende und Statusabfragen strukturiert im Griff.',
      ],
      example: 'Eine Agentur betreut fünf Kundenprojekte und verschickt wöchentlich klare Briefings statt langer E-Mail-Updates.',
      nextStep: 'Starte mit einem Kundenprojekt und prüfe, welche Informationen extern sichtbar sein sollen.',
    }, true),
  article('Whitelabel & Agenturen', 'Whitelabel-Projekte in Festag', 'whitelabel-projekte',
    'Wie Projekte diskret im Hintergrund verwaltet werden können, ohne Festag sichtbar in den Vordergrund zu stellen.',
    ['Whitelabel', 'Agenturen', 'Kundenportal'],
    {
      overview: 'Whitelabel-Projekte erlauben diskrete Projektsteuerung im Hintergrund.',
      explanation: [
        'Die Agentur kann Festag intern nutzen und Kunden dennoch eine professionelle Übersicht anbieten.',
        'Dabei geht es nicht um Verstecken von Arbeit, sondern um konsistente Kundenerfahrung.',
      ],
      example: 'Ein Kunde sieht das Portal der Agenturmarke, während Festag die operative Struktur liefert.',
      nextStep: 'Definiere, welche Marke, Domain und Sichtbarkeit im Kundenkontext gelten sollen.',
    }),
  article('Whitelabel & Agenturen', 'Eigene Entwickler oder Festag-Entwickler?', 'eigene-oder-festag-entwickler',
    'Wie bei der Projektanlage entschieden wird, wer ein Projekt umsetzt.',
    ['Entwickler', 'Projektanlage', 'Delivery'],
    {
      overview: 'Die Umsetzungsart sollte früh klar sein, weil sie Aufgaben, Rollen und Kommunikation beeinflusst.',
      explanation: [
        'Eigene Entwickler brauchen andere Workflows als externe oder Festag-Entwickler.',
        'Festag kann beide Modelle unterstützen, solange Verantwortlichkeiten und Zugriff sauber definiert sind.',
      ],
      example: 'Ein internes Team übernimmt Design, ein externer Entwickler die Umsetzung und der Kunde prüft Reviews.',
      nextStep: 'Lege beim Projektstart fest, wer liefert, wer prüft und wer entscheidet.',
    }),
  article('Whitelabel & Agenturen', 'Festag als Kundenportal für Agenturen', 'kundenportal-fuer-agenturen',
    'Wie Agenturen ihren Kunden eine professionelle Projektübersicht bieten können.',
    ['Kundenportal', 'Agenturen', 'Reports'],
    {
      overview: 'Als Kundenportal macht Festag Projektfortschritt verständlich und professionell sichtbar.',
      explanation: [
        'Kunden müssen nicht in interne Tools eintauchen. Sie sehen Status, Reports, Entscheidungen und relevante Aufgaben.',
        'Das reduziert Rückfragen und stärkt Vertrauen in die Projektführung.',
      ],
      example: 'Ein Kunde öffnet das Portal und sieht sofort, was abgeschlossen ist und welche Entscheidung offen ist.',
      nextStep: 'Nutze Reports und klare Rollen, bevor du ein Kundenportal breit ausrollst.',
    }),

  article('Sicherheit & Vertrauen', 'Transparenz ohne Überwachung', 'transparenz-ohne-ueberwachung',
    'Wie Festag operative Sichtbarkeit schafft, ohne wie ein Überwachungstool zu wirken.',
    ['Transparenz', 'Vertrauen', 'Teams'],
    {
      overview: 'Festag unterscheidet zwischen sinnvoller Sichtbarkeit und Überwachung.',
      explanation: [
        'Das Produkt zeigt Arbeitsstände, Verantwortlichkeiten und Blocker, aber nicht jede persönliche Aktivität als Kontrollsignal.',
        'So entsteht Vertrauen durch Klarheit statt Druck durch permanente Beobachtung.',
      ],
      example: 'Ein Team gibt strukturierte Updates, ohne dass jede Minute oder jeder Klick bewertet wird.',
      nextStep: 'Kommuniziere im Team, welche Informationen sichtbar sind und wofür sie genutzt werden.',
    }, true),
  article('Sicherheit & Vertrauen', 'Accountability in Projekten', 'accountability-in-projekten',
    'Warum klare Zuständigkeiten zu besseren Ergebnissen führen.',
    ['Accountability', 'Verantwortlichkeit', 'Projektsteuerung'],
    {
      overview: 'Accountability bedeutet, dass der nächste verantwortliche Schritt sichtbar ist.',
      explanation: [
        'Festag hilft, Aufgaben, Entscheidungen und Reviews nicht im Unklaren zu lassen.',
        'Dadurch entsteht weniger Schuldzuweisung und mehr gemeinsame Orientierung.',
      ],
      example: 'Wenn eine Entscheidung offen ist, ist klar, wer sie geben muss und welches Projekt davon abhängt.',
      nextStep: 'Achte bei Aufgaben und Reviews immer auf eine klare nächste Verantwortung.',
    }),
  article('Sicherheit & Vertrauen', 'Datenschutz und Zugriffskontrolle', 'datenschutz-und-zugriffskontrolle',
    'Wie sensible Projektinformationen geschützt und Rollen sauber getrennt werden.',
    ['Datenschutz', 'Zugriff', 'Rollen'],
    {
      overview: 'Sensible Projektinformationen brauchen klare Grenzen.',
      explanation: [
        'Rollen und Berechtigungen helfen, Informationen nur den Personen zugänglich zu machen, die sie benötigen.',
        'Das ist besonders wichtig bei Kundenprojekten, Whitelabel-Setups und externer Zusammenarbeit.',
      ],
      example: 'Ein externer Entwickler erhält Task-Kontext, aber keine Abrechnungsdaten oder interne Kundenkommunikation.',
      nextStep: 'Prüfe Rollen regelmäßig, wenn neue Mitwirkende in Projekte kommen.',
    }),
  article('Sicherheit & Vertrauen', 'Seriöse Projektkommunikation mit Festag', 'serioese-projektkommunikation',
    'Wie Festag hilft, professioneller und ruhiger zu kommunizieren.',
    ['Kommunikation', 'Reports', 'Vertrauen'],
    {
      overview: 'Gute Projektkommunikation ist klar, regelmäßig und frei von unnötiger Dramatik.',
      explanation: [
        'Festag hilft, Fortschritt, Risiken und Entscheidungen sachlich zu formulieren.',
        'Dadurch werden Kunden, Teams und Führungskräfte besser informiert, ohne von Details überflutet zu werden.',
      ],
      example: 'Statt hektischer Chat-Nachrichten erhält ein Stakeholder einen strukturierten Report mit konkretem nächsten Schritt.',
      nextStep: 'Nutze Statusberichte als Standardformat für externe Kommunikation.',
    }),

  // ─── New (2026-05) — Decisions / Notes / Focus / Inbox ──────────

  article('Aufgaben & operative Arbeit', 'Entscheidungen als eigene Fläche', 'entscheidungen',
    'Wie Festag Entscheidungen aus dem Chat raushebt und zu einer eigenen Tabelle macht — vom Developer-Request bis zur ruhigen Antwort des Kunden.',
    ['Entscheidungen', 'Workflow', 'Tagro', 'Verantwortung'],
    {
      overview: 'Entscheidungen sind in Festag ein eigenes Surface neben Tasks. Sie entstehen dort, wo Arbeit blockiert, weil eine Antwort vom Kunden fehlt — und sie verschwinden, sobald die Antwort vorliegt.',
      explanation: [
        'Ein Developer fordert die Entscheidung direkt aus seinem Task-Drawer an: Frage in einem Satz, optionalen Kontext, bis zu sechs Optionen und eine Dringlichkeit. Mit einem Klick landet sie als „offen" beim Entscheider.',
        'Der Kunde sieht die Entscheidung sofort an drei Stellen: als Eintrag in der Sidebar mit Counter-Badge, als Zeile in „Heute im Fokus" auf dem Dashboard und als Inbox-Benachrichtigung. Push, E-Mail und WhatsApp sind als Kanäle vorgesehen, damit Antworten auch unterwegs gegeben werden können.',
        'Auf `/decisions` öffnet ein Klick auf die Zeile einen Drawer mit Frage, Kontext und Optionen. Tagro kann auf Knopfdruck eine Empfehlung mit kurzer Begründung liefern; der Kunde übernimmt sie mit einem weiteren Klick oder schreibt eine eigene Antwort.',
        'Sobald die Entscheidung getroffen ist, fließt sie zurück an den Developer als Benachrichtigung — die Arbeit kann ohne Übersetzungsverlust weitergehen.',
      ],
      example: 'Ein Developer fragt: „Welcher Hosting-Provider soll es werden?" mit drei Optionen. Tagro empfiehlt nach kurzer Analyse Option B und nennt den Grund. Der Kunde bestätigt mit einem Klick — der Developer bekommt sofort die Antwort und arbeitet weiter, ohne dass jemand im Chat nachfragen musste.',
      nextStep: 'Probiere Entscheidungen aus, sobald in einem Projekt eine Frage offen ist. Erfahrungsgemäß sammeln sich diese Punkte schnell in unstrukturierten Chats — hier bleiben sie klar adressiert und nachvollziehbar.',
    }, true, '5 Min.'),

  article('Tagro AI', 'Notizen mit Tagro', 'notizen-mit-tagro',
    'Wie der Notizbereich in Festag funktioniert: vier Typen, [[Backlinks]], Tagro-Analyse und eine direkte Übergabe an den Chat.',
    ['Notizen', 'Tagro', 'Backlinks', 'Workflow'],
    {
      overview: 'Notizen sind nicht einfach Textblöcke, sondern eine eigene Arbeitsfläche mit klarer Logik. Beim Anlegen wird ein Typ gewählt — Journal, Brief, Meeting oder Research — der bestimmt, wie Tagro die Notiz später liest.',
      explanation: [
        'Beim Klick auf „Neue Notiz" öffnet sich ein Composer-Modal, das nach Titel, Inhalt, Typ, Projekt und Tags fragt. Direkt unten sitzen drei Pfade: ruhig anlegen, mit Tagro analysieren oder als Kontext an den Tagro-Chat übergeben.',
        'Im Editor erkennt Tagro die Notiz typabhängig: Briefs werden in konkrete Tasks zerlegt, Journals in Themen, Meeting-Protokolle in Folgepunkte, Research in Risiken und Lücken. Die Vorschläge erscheinen in einem ruhigen Panel innerhalb der Notiz.',
        'Mit der Syntax `[[Notiz-Titel]]` lassen sich Notizen untereinander verlinken. Ein Typeahead zeigt passende Treffer; im Editor-Footer erscheint später automatisch ein „Erwähnt von"-Block — Festag baut so einen leichtgewichtigen Wissensgraphen mit, ohne dass Stefan oder das Team manuell verlinken muss.',
        'Das Tastenkürzel ⌘⇧N öffnet das Composer-Modal überall in der App, sodass Gedanken direkt im Flow festgehalten werden können.',
      ],
      example: 'Während eines Kundencalls wird eine Meeting-Notiz angelegt. Tagro liest sie anschließend und schlägt drei Folgepunkte sowie eine Risiko-Frage vor. Mit einem Klick werden die Folgepunkte zu echten Tasks im verknüpften Projekt.',
      nextStep: 'Öffne die Daily Note über die Sidebar oder ⌘⇧N — die idempotente Tagesnotiz wird automatisch angeheftet und bleibt der ruhige Capture-Buffer für lose Gedanken.',
    }, true, '5 Min.'),

  article('Statusabfragen', '„Heute im Fokus" auf dem Dashboard', 'heute-im-fokus',
    'Ein ruhiger täglicher Check-in: offene Entscheidungen und Risiken sichtbar auch bei Null.',
    ['Dashboard', 'Statusabfrage', 'Entscheidungen', 'Risiken'],
    {
      overview: 'Der Block „Heute im Fokus" im rechten Briefing-Panel ist als täglicher Pulse-Check gedacht. Er zeigt zwei Zahlen: offene Entscheidungen, die auf den User warten, und Risiken, die Aufmerksamkeit brauchen — auch wenn beide bei Null stehen.',
      explanation: [
        'Die Zahlen werden live aus den Tabellen `decisions` (Status `offen`, `in_progress` oder `waiting_for_client`) und `tasks` (Status `blocked`) abgeleitet. Eine Realtime-Subscription auf Postgres aktualisiert beide ohne Reload.',
        'Beide Zeilen sind klickbar — sie führen direkt nach `/decisions`, wo Entscheidungen und Risiken in einer einheitlichen Tabelle erscheinen. Damit wird der tägliche Check zu einem Ein-Klick-Sprung an den Punkt, wo Aktion nötig ist.',
        'Im Zero-Zustand wird die Zahl in Grau gerendert, die Zeile bleibt aber als Hover-Element aktiv. So liest sich der Block als ruhiges „nichts dringend" statt als leerer Platz.',
        'Die fette weiße CTA darunter — „Statusbericht schreiben" oder „Neuen Statusbericht schreiben" — schreibt mit einem Klick einen frischen Tagro-Bericht direkt in den Notizblock links. Kein zusätzlicher Dialog, keine Wartezeit.',
      ],
      example: 'Vor dem ersten Meeting öffnet eine Kundin das Dashboard und sieht: 0 Entscheidungen warten · 0 Risiken brauchen Aufmerksamkeit. Sie klickt auf „Statusbericht schreiben", liest die Zusammenfassung und geht beruhigt ins Meeting.',
      nextStep: 'Nutze den Block als morgendlichen Anker. Wenn eine Zahl > 0 ist, klick sie an, bevor du irgendetwas anderes öffnest.',
    }, false, '3 Min.'),

  article('Erste Schritte', 'Posteingang verstehen', 'posteingang-verstehen',
    'Wie der Festag-Posteingang strukturiert ist und warum er ruhiger lesbar ist als ein klassischer Chat.',
    ['Posteingang', 'Inbox', 'Kommunikation', 'Übersicht'],
    {
      overview: 'Der Festag-Posteingang ist kein Chat-Strom, sondern eine kategorisierte Liste strukturierter Eingänge: Projekt-Updates, Rechnungen, Konto-Events und Tagro-Assists liegen sauber getrennt in einer einzigen Spalte.',
      explanation: [
        'Statt der bisherigen Reihe aus fünf Filter-Pills sitzt rechts oben ein Festag-Trigger, der ein 12px-Radius-Popover öffnet. Darin stehen alle Kategorien mit Hint-Text und einem eigenen Ungelesen-Badge — die aktive Kategorie ist im Trigger selbst sichtbar.',
        'Links die Liste, rechts der Detail-Pane: beide teilen sich dieselbe weiße Surface, getrennt nur durch eine feine Border-Right. Das Auge ruht statt auf zwei Boxen auf einer Leinwand.',
        'Eingänge entstehen automatisch — aus Status-Updates des Developer-Teams, aus Tagro-Zusammenfassungen, aus Decision-Requests und aus System-Events wie Rechnungen oder Vertragsversand. Manuelles Sortieren fällt weg.',
        'Ein optionaler Funnel-Knopf oben rechts blendet alle bereits gelesenen Items aus, sodass nur noch das Offene sichtbar bleibt.',
      ],
      example: 'Nach dem Mittag öffnet ein Kunde den Posteingang. Drei Eingänge sind ungelesen: ein Tagro-Briefing zum Stand der Landingpage, eine Rechnung des Vormonats und eine Entscheidungsanfrage. Mit drei Klicks ist alles eingeordnet.',
      nextStep: 'Wähle eine Kategorie über das Popover oben rechts — der Detail-Pane zeigt den Eintrag, danach kannst du direkt ins Projekt springen.',
    }),

  richArticle('Tagro AI', 'Entscheidungen in Festag', 'entscheidungen-in-festag',
    'Wie Auftraggeber und Auftragnehmer über Tagro saubere Entscheidungen treffen — ohne Chat-Chaos, ohne Missverständnisse, mit klarer Verantwortung.',
    ['Entscheidungen', 'Decision Engine', 'Tagro', 'Trust Layer', 'Dev Panel', 'Client Board'],
    [
      { type: 'lead', text: 'Eine Entscheidung ist die einzige formale Form, in der Auftraggeber und Auftragnehmer einander wirklich verpflichten. Tagro ist die Sprache, in der diese Verpflichtung geschrieben wird.' },

      { type: 'heading', level: 2, text: 'Warum Entscheidungen ein eigener Bereich sind', id: 'warum' },
      { type: 'paragraph', text: 'Die meisten Projekte scheitern nicht an der Arbeit, sondern an der Kommunikation rund um die Arbeit. Eine Frage des Devs landet in WhatsApp, die Antwort drei Tage später per E-Mail, der Kontext ist verschollen, niemand weiß mehr, was eigentlich entschieden wurde.' },
      { type: 'paragraph', text: 'Festag löst das, indem Entscheidungen nicht in Chats oder Mails stattfinden, sondern in einem eigenen, strukturierten Objekt. Eine Entscheidung hat einen Titel, eine Frage, mögliche Antworten, eine zuständige Rolle, eine Wirkung und einen Audit-Trail. Sie ist kein Nachrichten-Stream, sondern ein Vertrag im Kleinen.' },
      { type: 'paragraph', text: 'Tagro übersetzt zwischen den beiden Seiten. Was der Dev technisch fragt, wird für den Auftraggeber ruhig und verständlich. Was der Auftraggeber entscheidet, kommt beim Dev als klare Anweisung mit allen relevanten technischen Implikationen an. Niemand muss die Sprache der anderen Seite lernen.' },

      { type: 'heading', level: 2, text: 'Drei Sichten, eine Wahrheit', id: 'drei-sichten' },
      { type: 'paragraph', text: 'Eine Entscheidung existiert als ein einziges Objekt im System. Die drei Beteiligten sehen sie in jeweils ihrer eigenen Projektion — ohne dass die Information dabei wandert, kopiert oder verfälscht wird.' },
      { type: 'kvtable', rows: [
        ['Client Board', 'Ruhig und entscheidungsorientiert. Titel und Zusammenfassung in normaler Sprache, zwei bis vier Optionen, eine primäre Aktion. Keine technischen Details, keine Confidence-Prozente, keine Dev-Begriffe.'],
        ['Tagro Backend', 'Notar und Übersetzer. Rahmt die Entscheidung, formuliert beide Sichten, routet an die richtige Rolle, propagiert das Ergebnis. Selbst nie Entscheidungsträger, außer es ist explizit erlaubt.'],
        ['Dev Panel', 'Technisch und vollständig. Verlinkte Tasks, Begründung, Tagro-Vorschlag mit Reasoning, mögliche Verfeinerung vor dem Versand an den Client.'],
      ]},

      { type: 'heading', level: 2, text: 'Wer eine Entscheidung erzeugt', id: 'erzeugung' },
      { type: 'paragraph', text: 'Am Projektstart kommen Entscheidungen fast ausschließlich vom Dev. Er weiß, welche technischen oder organisatorischen Fragen beantwortet werden müssen, bevor er weiterarbeiten kann. Tagro hat in dieser Phase noch keinen ausreichenden Kontext, um eigenständig zu erkennen, was offen ist — sie ist hier reine Übersetzerin und Routerin.' },
      { type: 'paragraph', text: 'Sobald das Projekt läuft, kommen weitere Quellen dazu. Statusberichte, Blocker, Risikoindikatoren und Scope-Vergleiche füttern Tagro mit genug Signal, um Entscheidungsbedarf eigenständig zu erkennen. Auch dann bleibt der Dev der dominante Ursprung — Tagro ergänzt, sie ersetzt nicht.' },
      { type: 'list', items: [
        'Vage Tasks ohne klare Akzeptanzkriterien — Tagro fragt nach, statt zu raten.',
        'Blocker, deren Auflösung eine externe Wahl voraussetzt.',
        'Explizite Dev-Anfrage über die Aktion „Entscheidung anfragen" an einem Task.',
        'Scope-Drift, erkannt aus dem Vergleich aktueller Tasks mit dem ursprünglichen Auftrag.',
        'Überschrittene Risikoschwellen, etwa drohende Deadlines oder Budgetabweichungen.',
        'Statusbericht-Signale wie offene Fragen oder neue Anforderungen.',
      ]},
      { type: 'note', text: 'Tagro erzeugt maximal drei automatische Entscheidungen pro Projekt und Tag. Mehr wäre eine Belastung statt einer Hilfe. Nur kritische Themen umgehen dieses Limit.' },

      { type: 'heading', level: 2, text: 'Was Tagro für jede Entscheidung liefert', id: 'framing' },
      { type: 'paragraph', text: 'Bevor eine Entscheidung dem Auftraggeber gezeigt wird, prüft Tagro, ob sie vollständig gerahmt ist. Ohne die folgenden Elemente bleibt sie im Entwurf und erreicht das Client Board nicht.' },
      { type: 'list', ordered: true, items: [
        'Ein ruhiger Titel in normaler Sprache, höchstens ein Satz.',
        'Eine Zusammenfassung in zwei bis vier Sätzen: was zu entscheiden ist und warum jetzt.',
        'Zwischen zwei und vier Optionen, formuliert in der Sprache des Auftraggebers.',
        'Pro Option die strukturierte Auswirkung: zeitlicher Effekt, Kosten, Risiko, Scope.',
        'Eine Tagro-Empfehlung in einer einzigen Zeile — oder die ehrliche Aussage, dass keine Empfehlung möglich ist.',
      ]},

      { type: 'heading', level: 2, text: 'Wie der Auftraggeber antwortet', id: 'antworten' },
      { type: 'paragraph', text: 'Nicht jede Entscheidung sieht gleich aus. Manche brauchen ein einfaches Ja oder Nein, andere eine Auswahl, andere einen kurzen Text. Tagro erkennt den passenden Antworttyp aus dem Kontext und schlägt ihn dem Dev vor, der die Frage stellt.' },
      { type: 'kvtable', rows: [
        ['Ja / Nein', 'Binäre Entscheidung mit zwei klaren Konsequenzen. Beispiel: Soll diese Website ein Impressum erhalten?'],
        ['Auswahl', 'Zwei bis vier vorbereitete Optionen mit Auswirkung. Beispiel: Welche Hero-Variante soll umgesetzt werden?'],
        ['Mehrfachauswahl', 'Mehrere Optionen können gemeinsam gelten. Beispiel: Welche Sprachen soll die Plattform unterstützen?'],
        ['Freier Text', 'Eine eigene Eingabe ist sinnvoller als jede vorbereitete Option. Beispiel: Wie soll der Footer-Claim lauten?'],
      ]},

      { type: 'heading', level: 2, text: 'Tagro entscheiden lassen', id: 'delegation' },
      { type: 'paragraph', text: 'Neben den vier Antworttypen gibt es eine fünfte Möglichkeit, die jede Entscheidung still im Hintergrund mitführt: Der Auftraggeber kann Tagro bitten, für ihn zu entscheiden.' },
      { type: 'paragraph', text: 'Das ist kein Verzicht auf Kontrolle, sondern das Gegenteil. Der Auftraggeber entscheidet pro Entscheidung neu, wem er die Wahl überlässt. Tagro lernt mit jeder Delegation die Präferenzen des Projekts kennen — Tonalität, Risikoneigung, Designgeschmack — und kann zukünftige Vorschläge präziser rahmen.' },
      { type: 'paragraph', text: 'Jede delegierte Entscheidung wird mit einer kurzen Begründung dokumentiert. Der Auftraggeber sieht das Ergebnis sofort und kann es innerhalb von 48 Stunden überschreiben. Audit-Trail bleibt vollständig.' },
      { type: 'note', kind: 'warning', text: 'Bei rechtlichen Themen, Zahlungsfreigaben, Vertragsbedingungen und Datenschutzfragen steht die Delegationsoption nicht zur Verfügung. Diese Entscheidungen müssen immer von einem Menschen mit der nötigen Autorität getroffen werden.' },

      { type: 'heading', level: 2, text: 'Wenn die Entscheidung gefallen ist', id: 'propagation' },
      { type: 'paragraph', text: 'Eine Entscheidung im Status „decided" ist erst der zweite Schritt von dreien. Anschließend übersetzt Tagro die Wahl in konkrete Wirkung im Projekt — atomar, idempotent, mit vollständigem Audit-Trail.' },
      { type: 'mono', text: [
        'decision.state = decided',
        '   |',
        '   v',
        '[apply, transaktional]',
        '   |',
        '   +-- blockierte Tasks: wechseln zurück in ihren vorherigen Status',
        '   +-- betroffene Tasks: Tagro hängt eine Notiz an, ggf. neue Akzeptanzkriterien',
        '   +-- Statusbericht: enthält die Entscheidung in der naechsten Generation',
        '   +-- Progress: gewichtete Neuberechnung, Decision-Drag faellt weg',
        '   +-- Sync-Bus: Events fan-out an Client Board und Dev Panel',
        '   |',
        '   v',
        'decision.state = applied',
      ].join('\n') },
      { type: 'paragraph', text: 'Erst der Übergang zu „applied" bedeutet, dass die Entscheidung wirklich im Projekt angekommen ist. Schlägt eine Teiloperation fehl, rollt das System zurück und ein erneuter Versuch ist möglich. Der Auftraggeber bekommt davon nichts mit — er sieht nur, dass seine Entscheidung Wirkung gezeigt hat.' },

      { type: 'heading', level: 2, text: 'Was Tagro niemals tut', id: 'grenzen' },
      { type: 'list', items: [
        'Tagro erfindet keine Fragen, die der Dev nicht gestellt hat. Halluzination im Trust Layer wäre fatal.',
        'Tagro entscheidet nicht eigenständig, außer der Auftraggeber hat die Entscheidung explizit an sie delegiert oder es handelt sich um einen ausdrücklich erlaubten Trivial-Default.',
        'Tagro schätzt keine Auswirkungen, die sie nicht belegen kann. Unbekanntes wird als unbekannt markiert, nicht geraten.',
        'Tagro umgeht niemals die Autoritätsregeln. Wer entscheiden darf, ist im Datenmodell fixiert — Rolle, nicht Person.',
        'Tagro entscheidet nie rechtliche, finanzielle oder vertragliche Fragen. Diese sind explizit ausgeschlossen.',
      ]},

      { type: 'quote', text: 'Kontrolle ohne Überwachung. Klarheit ohne Bürokratie. Geschwindigkeit ohne Chaos.' },

      { type: 'heading', level: 2, text: 'Wo das im Produkt sichtbar wird', id: 'surfaces' },
      { type: 'paragraph', text: 'Auf dem Client Board liegt eine Entscheidung als ruhige Karte im Bereich „Entscheidungen". Maximal drei Karten sind primär sichtbar, weiteres rutscht in einen sekundären Bereich. Eine Karte zeigt Titel, Zusammenfassung, Optionen und eine einzelne Empfehlung. Daneben gibt es die Möglichkeit, die Entscheidung zu diskutieren — eine Rückfrage, die wieder bei Tagro landet und in eine geschärfte Version mündet.' },
      { type: 'paragraph', text: 'Im Dev Panel taucht jede aktive Entscheidung am Kopf des Projekt-Workspaces auf. Blockierte Tasks zeigen direkt, welche Entscheidung sie aufhält. Mit der Aktion „Entscheidung anfragen" an einem Task lässt sich eine neue Frage anstoßen — Tagro übernimmt das Rahmen und Übersetzen.' },
      { type: 'paragraph', text: 'Hinter beidem läuft Tagro als stille Schicht. Sie hat kein eigenes UI, sie ist die Schreibweise des Systems. Sichtbar wird sie nur im Audit-Log und in der ruhigen Tatsache, dass beide Seiten verstanden haben, was die andere meint.' },
    ], true, '7 Min.'),
]

export function getDocArticle(slug: string) {
  return festagDocsArticles.find((articleItem) => articleItem.slug === slug) ?? null
}

export function getDocArticlesByCategory(category: string) {
  return festagDocsArticles.filter((articleItem) => articleItem.category === category)
}
