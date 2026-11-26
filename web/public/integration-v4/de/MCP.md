# MCP pro Sitzung

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
