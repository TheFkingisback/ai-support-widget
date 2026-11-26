# Integration des Supports · Vertrag v4

**SDK 0.3.0 · Backend-, Frontend- und Bedienungshandbuch**

[TOC]

## 1. Funktionsweise

Ihr Backend authentifiziert den Benutzer, projiziert den autorisierten Kontext und stellt eine 15-minütige Sitzung aus. Beim Ausstellen kann es die für diese Person verfügbaren MCP-Server einschließen. Der Browser empfängt das JWT des Widgets und den Kontext.

## 2. Umgebungen und Verantwortlichkeiten

Die Plattform befindet sich unter https://support-ai.pontes.uk. Verwenden Sie die Integrationsanmeldeinformationen der richtigen Umgebung. Der Workspace-Administrator erhält die Anmeldeinformationen im Dashboard. Das Anwendungsteam verwaltet den authentifizierten Bootstrap, den Kontext und die delegierten Token pro Benutzer und Server.

## 3. Anmeldeinformationen

| Anmeldeinformationen | Ziel | Verwendung |
| --- | --- | --- |
| Integrationsanmeldeinformationen sik_ | Support AI | Sitzung im Backend ausstellen |
| Delegiertes Token pro Server | In der Sitzung angegebener MCP | Tools als authentifizierte Person aufrufen |
| JWT der Sitzung | API des Chats | Gespräche im Widget öffnen und fortsetzen |

Speichern Sie die Integrationsanmeldeinformationen im Tresor der Anwendung. Durch den Widerruf werden die damit ausgestellten JWTs bei der nächsten Anfrage deaktiviert. Generieren Sie die delegierten Token im Backend und beschränken Sie jedes auf eine Ressource, einen Benutzer und eine Gültigkeitsdauer.

## 4. Authentifizierungs- und Identitätsfluss

```text
Authentifizierte Anwendungssitzung
  → Backend validiert aktiven Benutzer, Organisation und aktuelle Berechtigungen
  → POST /api/widget/sessions mit sik_ auf dem Server
  ← jwt + tenantKey + expiresIn
  → Backend sammelt und projiziert Kontext derselben Identität
  ← Browser empfängt Sitzung/Kontext mit Cache-Control: no-store
  → Widget ruft /api/cases und Konversationsrouten mit dem temporären JWT auf
```

Die Beibehaltung des historischen Kundenidentifikators `usr_...` verhindert den Verlust des Zugriffs auf eigene Gespräche. Verwenden Sie nicht email, Rolle, Gerät oder Zeitstempel als Identität. Falls derselbe Benutzer das Unternehmen wechseln kann, definieren Sie ein stabiles Subjekt pro Bindung oder eine explizite Historienrichtlinie; die Plattform autorisiert Gespräche pro Mandant + Person, ohne Organisationen des Kunden abzuleiten.

Die Plattform überprüft Signatur, Aussteller `ai-support`, Zielgruppe `ai-support-widget`, Zweck `widget`, `sub=userId`, Gültigkeit und die aktive Sitzungsanmeldeinformation. Der Browser signiert oder ändert keine Claims neu. An den Support gesendete Rollen sind Kontextinformationen; die Autorisierung von APIs/MCP bleibt auf dem Client-Server.

## 5. Ausstellervertrag

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Antwort 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validieren Sie `tenantKey`, bevor Sie es an den Browser zurückgeben. Die Datei `backend-session.mjs` implementiert einen strikten Body, Timeout, Blockierung von Redirects, Antwortlimit und Validierung des Mandanten; sie ersetzt nicht Ihre Authentifizierungs-Middleware.

| Feld | Regel |
| --- | --- |
| mcpServers | Optionale Liste von bis zu acht Objekten mit eindeutigen id, URL und accessToken. Siehe Abschnitt 12. |
| userId | Obligatorisch, trim, 1–200 Zeichen |
| userEmail | Gültige E-Mail bis zu 254 Zeichen oder leer; Standard leer |
| userRoles | Bis zu 30 Strings von 1–80 Zeichen; Standard leere Liste |
| plan | String von 1–80 Zeichen; Standard standard |

Senden Sie tenantId, tenantKey, userName, role, purpose, exp oder andere Felder nicht im Body. Die Anmeldeinformationen bestimmen den Tenant. Die Identität stammt aus der Sitzung/Datenbank, nicht aus der Browser-Abfrage/dem Body. Der Aussteller akzeptiert kein JWT des Benutzers, keinen administrativen Schlüssel oder kein altes Geheimnis anstelle von `sik_`.

Der öffentliche Aussteller funktioniert ohne nutzungsbasierte Projektquoten. Verwenden Sie eine noch gültige Sitzung derselben Person, Firma und Berechtigungen wieder, mit vorzeitiger Ablauf und Invalidierung bei Änderungen.

## 6. Obligatorischer Kontext und korrekte Identität

Jeder neue Fall erfordert `context.userState`, `context.userHistory` und `context.userLogs`. Senden Sie leere Listen, wenn die Quelle abgefragt wurde und keine Datensätze vorhanden sind; **konvertieren Sie eine fehlgeschlagene Sammlung nicht in eine leere Liste, die erfolgreich erscheint**. Wenn Sie keinen gültigen und autorisierten Kontext bereitstellen können, sollte der Client-Bootstrap einen kontrollierten Fehler zurückgeben.

`context.example.json` ist das minimale Beispiel. `context.schema.json` wurde aus dem auf dem Server verwendeten Schema Zod exportiert, nicht unabhängig geschrieben. Validieren Sie das JSON im Backend vor dem Deployment. Nicht erkannte zusätzliche Felder werden verworfen; Metadaten und Regeln können eigene Strukturen enthalten, die Projektionen/Grenzen unterliegen. Das Schema beweist weder die Autorisierung noch eliminiert es alle sensiblen Daten.

| Block | Obligatorisch / Struktur |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positiv bis 720, events; die Zeitleiste wird aus events rekonstruiert |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Optional; docs mit id, title, content, category |
| businessRules | Optional; genehmigtes Regelobjekt, als Runbook serialisiert |

`userState.userId` muss exakt die ausgestellte Identität sein. **`userState.tenantId` ist der Tenant der Plattform**, niemals die Organisations-/Shop-ID im Client. Abweichungen führen zu 403. Daten im Browser können manipuliert werden; der Kontext autorisiert keine Operationen.

## 7. Felder, Grenzen und Normalisierung

| Struktur | Hauptfelder / Regeln |
| --- | --- |
| entities | type, status; id/description optional; metadata Objekt; bis zu 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; bis zu 100 |
| errorClass von activeErrors | validation, permission, infra oder business; Kategorien wie payment erfordern eine Zuordnung |
| events | ts, event, page; elementId, intent, correlationRequestId akzeptieren null/Auslassung; bis zu 1.000 |
| recentRequests | ts, route, httpStatus Integer, timingMs, requestId; errorCode/resourceId können null sein |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs Zahl oder null; errorCode/lastStage können null sein |
| status von jobs | queued, running, succeeded, failed, canceled |
| errors vom Backend | ts, errorCode, errorClass String, route, requestId; resourceId kann null sein |
| docs | Bis zu 50; content bis zu 32.000 Zeichen, andere Texte bis zu 4.096 |

Datumsangaben sind ISO-8601-Strings mit Zeitzone; Date im Backend serialisieren. Erfinden Sie keine updatedAt, durationMs, retryable oder Kategorien, nur um das Schema zu bestehen: Verwenden Sie die tatsächliche Quelle oder lassen Sie den Datensatz weg und informieren Sie über die Nichtverfügbarkeit der Quelle. Dokumentieren Sie die projektspezifischen Zuordnungen in der Abnahme.

Gesendeter Kontext-Header: **262.144 Bytes UTF-8 (256 KiB)**. Der vollständige HTTP ist weiterhin auf 1.048.576 Bytes begrenzt. Das Snapshot-Budget beträgt `min(maxContextBytes, 262144)`. Wenn selbst der wesentliche Teil nicht passt, schlägt die Anfrage fehl; reduzieren Sie Metadaten/Dokumente im Backend. Wir empfehlen, mit 48 KiB, zehn Entitäten und kurzem Wissen zu beginnen.

Der Server filtert Ereignisse/Protokolle nach dem kleineren Fenster zwischen dem angeforderten und dem des Mandanten, entfernt zukünftige Daten und wendet maxLogLines kombiniert auf Anfragen, Fehler und jobs an (in dieser Reihenfolge). maxDocs begrenzt die Liste docs; businessRules ist ein separates Runbook und belegt ebenfalls das Gesamtbudget. Die Zeitleiste folgt den beibehaltenen Ereignissen. Weniger relevante Daten führen in der Regel zu einer besseren Diagnose und geringeren Kosten.

## 8. Datenschutz und Persistenz

Daten vor dem Senden entwerfen: niemals Header, Cookies, JWTs, Anmeldeinformationen, Verbindungszeichenfolgen, signierte URLs, binäre Inhalte, Daten anderer Benutzer oder Rohdatenexporte weiterleiten. Ersetzen Sie Geheimnisse durch unterstützende Referenzen. Senden Sie nicht das gesamte PRD oder vollständige Protokolle als Wissensbasis.

Neue Snapshots durchlaufen vor der Speicherung Validierung, Redaktion, Reduzierung und Budgetierung. Nachrichten und Tool-Ergebnisse werden nach bekannten Geheimnismustern behandelt. Dieser Schutz ist ergänzend: Er ist kein unfehlbarer Klassifikator für personenbezogene Daten, korrigiert historische Aufzeichnungen nicht rückwirkend und ersetzt nicht die Kundenprojektion.

Der Kontext ist ein Snapshot vom Beginn des Gesprächs, keine Echtzeitabfrage. Geben Sie Zeitstempel und Quellen an. `updateContext()` gilt für den nächsten Fall; für aktuelle Daten während eines Gesprächs verwenden Sie ein zugelassenes Lesetool.

## 9. Frontend und SDK 0.3.0

Stellen Sie das fixierte SDK aus dem Paket oder der öffentlichen URL bereit. Überprüfen Sie SHA-256 mit `widget.manifest.json`. Vermeiden Sie doppelte Skripte, schwebende Versionen und JWT-Caching. Der Referenz-Controller in `widget-controller.mjs` wird nach dem Bootstrap montiert, wartet auf onOpen, erneuert und verhindert eine späte Montage nach dem Logout.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// Beim Logout, Wechsel der Person/Firma/Rolle und Bereinigung der Komponente:
controller.destroy();
```

Die oben genannten Funktionen sind Anwendungs-Callbacks, die mit Ihrem üblichen HTTP-Client implementiert werden müssen. Bootstrap gibt `{jwt,tenantKey,expiresIn,context}` zurück. getContext gibt das Kontextobjekt zurück. In React stabilisieren Sie Callbacks mit useCallback und montieren sie in useEffect, das an die Identität gebunden ist. Platzieren Sie das Widget nicht außerhalb des authentifizierten Bereichs und bieten Sie Besuchern kein geteiltes userId an.

Das SDK akzeptiert `onTokenRefresh`, das das neue JWT zurückgibt; nach 401 wiederholt es die Anfrage einmal. Die Erneuerung muss dieselbe Person verwenden. Ein Identitätswechsel erfordert Zerstörung und Initialisierung. Wenn Sie einen proaktiven Timer verwenden, bevorzugen Sie etwa zehn Minuten mit Jitter und brechen Sie ihn bei der Bereinigung ab. Fehler bei Bootstrap, Sammlung und Modell sollten die Hauptanwendung nicht blockieren.

## 10. Logout, Berechtigungen und Verlauf

`destroy()` bricht Anrufe ab und entfernt die lokale Persistenz pro Mandant/Person. Es ist keine individuelle Widerrufung auf dem Server. Ein bereits kopiertes JWT kann bis zu 15 Minuten nach dem Abmelden/Sperren auf dem Client gültig bleiben. Wenn eine sofortige Widerrufung pro Person erforderlich ist, erfordert der Vertrag eine zusätzliche Entwicklung; verwenden Sie keine mandantenweite Rotation als normale Abmeldung.

Jede Konversationslese-/schreiboperation erfordert denselben Eigentümer und Mandanten. Eine Rollenänderung auf dem Client löscht keine Inhalte, die die Person bereits in der Konversation erhalten hat. Definieren Sie eine Verlaufspolitik für die Herabstufung von Berechtigungen und Organisationsänderungen. Lockern Sie die Autorisierung nicht, um ein altes caseId wiederherzustellen; überprüfen Sie das ursprüngliche Subjekt oder starten Sie eine neue Konversation.

## 11. CORS, CSP, PWA und Zugriff

Erlauben Sie auf der Plattform den genauen Ursprung jedes Frontends. Das SDK benötigt connect-src für den Support; das lokale Servieren der Datei erlaubt script-src self. Das SDK injiziert Stil in das Shadow DOM und erhält noch keine Nonce: homologieren Sie die tatsächliche CSP-Richtlinie, was eine Weiterentwicklung des SDK für externe Stile/Nonce/Hash erfordern kann. Schalten Sie die gesamte Richtlinie nicht aus.

Sitzungen und Kontext sind no-store. Schließen Sie Support-Routen von den PWA-Caches, der Abfragepersistenz und den Replay-Tools aus. Testen Sie Tastatur, Fokus, Bildschirmleser, Zoom und Mobilgeräte. Präsentieren Sie einen echten menschlichen Kanal in der Anwendung, mit bestätigter Uhrzeit/URL. Das SDK erfindet keinen Serviceanbieter.

## 12. MCP-Server in der Sitzung

Das Backend der Anwendung sendet `POST /api/widget/sessions` mit der Integrationsanmeldeinformation `sik_`. Es leitet die Person und ihre Organisation aus dem Login ab und kann bis zu acht Server in `mcpServers` enthalten. Das weggelassene oder leere Feld erstellt einen Chat mit Kontext. Jede neue Sitzung erhält ihre eigene Liste.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Jede id beginnt mit einem Kleinbuchstaben und akzeptiert Kleinbuchstaben, Ziffern, Unterstriche und Bindestriche, bis zu 32 Zeichen. IDs, normalisierte URLs und Token sind in der Liste eindeutig. Der Transport ist MCP Streamable HTTP über öffentliches HTTPS, Port 443, mit einer URL ohne Anmeldeinformationen, Abfrage oder Fragment. Der Dienst überprüft den DNS beim Verbinden und lehnt Weiterleitungen ab.

Die Anwendung gibt für jedes Ziel ein kurzes Zugriffstoken aus oder erhält es, beschränkt auf die Person, Organisation, Berechtigungen und Zielgruppe dieses MCP. Der Support AI präsentiert `Authorization: Bearer <accessToken>` dem entsprechenden Server. Der Anbieter überprüft Signatur oder Introspektion, Aussteller, Gültigkeit, Zielgruppe und Ressourcenzugriff bei jeder Operation. Er veröffentlicht im Katalog nur die für diese Identität erlaubten Tools. Die Plattform-Anmeldeinformationen, das JWT des Widgets und die Schlüssel von Diensten wie Stripe haben eigene Zwecke.

Das delegierte Token wird auf dem Server bis zu 900 Sekunden lang verschlüsselt. Der Browser empfängt `{jwt, tenantKey, expiresIn: 900}`. Bei der Erneuerung validiert das Backend die Identität neu und sendet eine neue Liste mit gültigen Token. Ein vor der Erneuerung erstellter Vorschlag muss erneut präsentiert werden. Für Organisationsänderungen verwenden Sie einen stabilen Bezeichner pro Verknüpfung und zerstören Sie die vorherige Widget-Instanz.

Die Support AI durchsucht die Seiten von `tools/list`, unterscheidet gleiche Namen nach Server und verwendet den ursprünglichen Namen beim Aufruf von `tools/call`. Kataloge mit mehr als 32 Tools verfügen über Such- und Paginierungsfunktionen innerhalb des Chats. Die Erkennungsgrenzen pro Server betragen 128 Seiten und 4 MB Beschreibungen. Ein Erkennungsfehler eines Servers beeinträchtigt die anderen nicht.

Tools mit `annotations.readOnlyHint: true` können direkt abgefragt werden. Für jedes Tool, bei dem die Annotation fehlt oder falsch ist, zeigt der Chat Server, Name und Argumente vor der Ausführung an. Deklarieren Sie „Nur Lesen“ für Operationen ohne geschäftliche Auswirkungen. Der Benutzer antwortet `confirmar` oder `confirm` auf die angezeigte Nachricht innerhalb von fünf Minuten. Das SDK sendet `replyToMessageId`. Die Bestätigung gilt für diese Argumente, Server, Sitzung und Konversation. Ein neuer Vorschlag ersetzt den vorherigen.

Die Plattform versucht eine Ausführung, nachdem die Bestätigung registriert wurde, und sendet `Idempotency-Key` mit der Vorschlags-ID. Für Zahlungen und Operationen mit externen Effekten muss der Anbieter den Schlüssel und das Ergebnis atomar speichern und die vom Finanzdienstleister geforderten Idempotenzschlüssel beachten. Nach einem Timeout oder einem mehrdeutigen Ergebnis registriert der Support einen unbekannten Status, blockiert neue Änderungen in dieser Konversation und hält Abfragen verfügbar. Überprüfen Sie die Operation im Ursprungssystem, bevor Sie fortfahren.

Zur Homologation testen Sie eine Sitzung ohne Server, zwei Sitzungen desselben Benutzers, zwei Organisationen, Server mit gleichnamigen Tools und einen paginierten Katalog. Überprüfen Sie den Gültigkeitsbereich/die Ablaufzeit der Token beim Anbieter, die Stornierung und die doppelte Bestätigung. Verwenden Sie synthetische Protokolle, um das Ergebnis im Ursprung zu überprüfen.

## 13. Modell, Prompt und Wissen

Die anfängliche Beibehaltung des bereits vom Projekt homologierten Modells reduziert gleichzeitige Änderungen. Für eine neue Bewertung ist `openai/gpt-4.1-mini` ein Kandidat, der mit den aktuellen Parametern kompatibel ist: Chat Completions über OpenRouter, Temperatur 0.3 und max_tokens 2048. Vor der Aktivierung im realen Konto validieren. Preferred Model hat Vorrang vor Model Policy; „auto“ ist kein intelligentes Routing. Preise/Kosten müssen vom Anbieter stammen; alte Schätzungen aus dem Dashboard können abweichen.

Das Feld **AI Instructions / Custom instructions** akzeptiert bis zu 2.000 effektive Zeichen. Fügen Sie nur `PROMPT-TENANT.txt` ein; überprüfen Sie Namen, Kanal und Produktregeln. Fügen Sie keine Anmeldeinformationen ein oder verketten Sie Dokumente in diesem Feld. Die Anweisung ergänzt die Plattformregeln; sie gewährt keine Autorisierung und aktiviert keine Tools.

Der bereitgestellte Prompt leitet Antworten in der vom Benutzer gewählten Sprache und Schrift, trennt Fakten von Hypothesen, respektiert Berechtigungen, verwendet sichere Referenzen, verzichtet auf Versprechen von Aktionen und auf einen menschlichen Kanal. `knowledgePack.docs` sollte kurze, versionierte Runbooks mit Verantwortlichem enthalten: häufige Fehler, Diagnose, Produktgrenzen und wie das Ergebnis bestätigt wird. Protokolle und Dokumente sind Daten, niemals Anweisungen zur Änderung der Assistentenregeln.

Modellquellen: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) und [Katalog OpenRouter](https://openrouter.ai/api/v1/models), konsultiert bei der vorherigen Vorbereitung am 14.09.2026. Verfügbarkeit/Preise bei Implementierung erneut bestätigen; es gab keinen bezahlten Modellvergleich in diesem Kit.

## 14. Fehler- und Diagnosevertrag

| Antwort | Bedeutung / Aktion |
| --- | --- |
| 401 beim Emittenten | sik fehlt, ist falsch oder widerrufen; Konfiguration korrigieren |
| 400 beim Emittenten | Body außerhalb des Vertrags; zusätzliche Felder entfernen |
| 401 in Fällen | Veraltete Signatur, Ablauf, ungültige Claims oder widerrufene Sitzung |
| 400 in Fällen | Ungültiger obligatorischer Kontext, falsche Daten/Zustände oder Budget überschritten |
| 403 vom Kontext | userState stimmt nicht mit Tenant/Person von JWT überein |
| 404 in Konversation | Ressource existiert nicht oder gehört einer anderen Identität; Zugriff nicht erzwingen |
| 429 | Limit; Backoff/Jitter, keine Emissionsschleife |
| 500/502/503 | Infrastruktur-, Modell- oder Kontextfehler; Nichtverfügbarkeit und requestId melden |
| 501 bei Aktionen/Eskalation | Funktionalität ohne Executor/Konnektor; echten menschlichen Kanal verwenden |
| Chat funktioniert, MCP nicht | Überprüfen Sie die in der letzten Emission gesendete Liste, Gültigkeit, Zielgruppe und Katalogantwort. |
| Tool fehlt | Überprüfen Sie den für das delegierte Token verfügbaren Katalog und die Serverkonnektivität. |

Nicht nur HTTP 200 als Akzeptanz verwenden: Antwortinhalt und Snapshot überprüfen. Eine Erstellung, die nach dem Speichern des Falls fehlschlägt, kann einen Fall ohne Antwort hinterlassen; keine Transaktion annehmen, die den Modellaufruf beinhaltet. Wiederholungsversuche sollten begrenzt und dem Benutzer mitgeteilt werden. Methode, parametrisierte Route, status, requestId und Uhrzeit UTC protokollieren; niemals Authorization/JWT, Geheimnis oder rohes Payload zur Weiterleitung der Diagnose erfassen.

## 15. Obligatorische Akzeptanz

1. Bootstrap-Route ohne Login vor dem Emittenten abgelehnt. Gefälschte Identitäten ändern den authentifizierten Benutzer nicht.
2. Emission mit den korrekten Anmeldeinformationen gibt den erwarteten Tenant und 900 Sekunden zurück; Geheimnis erscheint nicht im Browser/Replay/Logs.
3. Altes JWT wird abgelehnt. Neue Sitzung erstellt Konversation mit Snapshot und echter Antwort; öffnet sich für dieselbe Person erneut.
4. Zwei Personen desselben Projekts und zwei Tenants: GET Fall und POST Nachrichten/Feedback/Schließen/Eskalieren/Aktionen kreuzen keine Identitäten.
5. Kontext ohne Blöcke, andere Identität, ungültiges Datum und übermäßige Größe werden abgelehnt; synthetische Geheimnisse bleiben nicht im Snapshot erhalten.
6. Erneuerung nach 15 Minuten, Abmeldung während der Erfassung, Konto-/Firmen-/Rollenwechsel und Navigation stellen keine Konversation einer anderen Person wieder her.
7. Modell antwortet unter Verwendung von Beweisen und respektiert das Diagnose-Limit; Fehler führt nicht zu scheinbarem Erfolg.
8. Sitzungen mit null und zwei Servern emittieren. Überprüfen Sie, ob jedes Ziel sein eigenes Token erhält.
9. MCP lehnt falsches/altes Token, falschen Tenant, fehlenden/inaktiven Benutzer und Ressource einer anderen Person ab. Wiederverwendete Session-ID testen, falls Sitzung vorhanden.
10. Bestätigen Sie, dass Änderungen eine Bestätigung des Vorschlags erfordern und sich im Falle eines Timeouts nicht wiederholen.
11. CORS/CSP, Mobiltelefon, Tastatur und menschlicher Kanal zugelassen. Koordinierte Rotation in der Homologation getestet.

`node --test examples.test.mjs` validiert die isolierten Adapter mit Mocks. Dies ersetzt keine End-to-End-Tests. Füllen Sie `ACEITE.md` mit Verantwortlichen, Versionen, Zeitstempeln und nicht-geheimen Nachweisen aus.

## 16. Veröffentlichung, Kürzung und Wiederherstellung

Installieren Sie die Integrationsanmeldeinformationen, veröffentlichen Sie den Bootstrap und das SDK, validieren Sie den Chat und genehmigen Sie die in den Sitzungen deklarierten Server.

Reaktivieren Sie keine Legacy-Abonnements oder die globale MCP-Weiterleitung, um die Verfügbarkeit wiederherzustellen. Im Falle eines Fehlers deaktivieren Sie vorübergehend das Widget oder MCP des betroffenen Mandanten und halten Sie den menschlichen Kanal aufrecht, während Sie den Adapter korrigieren. Löschen Sie keine Konversationen, um einen 404-Fehler des Eigentümers zu umgehen.

Erfassen Sie die Aufbewahrungslimits und die spezifischen Nachweise Ihrer Anwendung.

## 17. Rückmeldung und Paketdateien

Geben Sie Projektname, Mandant, Backend-/Frontend-Commits, UTC-Datum, SDK/Hash, installierte Anmeldeinformationen (ja/nein, ohne Wert), genehmigten Chat, MCP genehmigt/deaktiviert, negative Tests, menschlichen Kanal und offene Punkte zurück. Schließen Sie nicht mit „scheint zu funktionieren“ ab.

Das öffentliche Kit enthält diesen Leitfaden in Markdown, Serverschema, minimale Fixture, Emittentenadapter, MCP-Authentifizierung, Frontend-Controller, SDK, Prompt, isolierte Tests, Checkliste, Aktionsvertrag und SHA-256-Manifest. Einzelne Pakete können spezifische Anhänge hinzufügen. Die Beispiele implementieren die Endpunkte der Client-Anwendung nicht automatisch. Die navigierbare Version finden Sie unter https://support-ai.pontes.uk/developers?lang=de.
