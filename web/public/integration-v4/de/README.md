# Starter für das AI Support Widget

Entpacken Sie die ZIP-Datei und führen Sie `node server.mjs` mit Node.js 22 oder höher aus. Öffnen Sie die im Terminal angezeigte Loopback-URL. Öffnen Sie den Support-Chat und fragen Sie, warum der Import fehlgeschlagen ist. Die Antwort identifiziert Zeile 42 und zeigt die synthetischen Import- und Fehlerreferenzen an. Setzen Sie das Beispiel zurück, um eine neue Konversation zu starten.

`server.mjs` stellt das Beispiel auf Ihrem Computer bereit. `starter/sample.js` wird im Browser ausgeführt und antwortet mit lokalen Fixtures. `widget.v0.3.0.js` ist die angeheftete Widget-Version. Vergleichen Sie deren SHA-256 mit `widget.manifest.json`.

Das heruntergeladene Beispiel wird in der Sprache dieses Kits geöffnet. Fügen Sie `?lang=sr-Latn`, `?lang=sr-Cyrl` oder `?lang=ar` an, um ein anderes verfügbares Gebietsschema zu überprüfen. Übergeben Sie das vom Benutzer ausgewählte Gebietsschema, wenn Sie das SDK in Ihrer Anwendung mounten.

Um Ihre eigene App zu integrieren, entfernen Sie das Fixture-Skript und mounten Sie `createBootstrapHandler` von `bootstrap.mjs` auf Ihrem Anwendungsserver unter einer Route wie `/api/support/bootstrap`. Stellen Sie `authenticate(request)` von Ihrer vorhandenen Sitzungs-Middleware und `collectContext(user, tenantKey, signal)` von Ihrer Datenschicht bereit. Legen Sie die privaten Umgebungsvariablen in `backend.env.example` fest. Initialisieren Sie das Widget mit dem Token und dem Kontext, die von dieser Route zurückgegeben werden. Legen Sie die optionale `handoffUrl` auf Ihre HTTPS menschliche Support-Seite fest. Befolgen Sie den [Developer Center Quick Start](https://support-ai.pontes.uk/developers/quick-start?lang=de) für den Sitzungslebenszyklus.

Ihr Backend kann `getMcpServers(user, signal)` an den Bootstrap-Handler liefern. Geben Sie ein Array von `{id, url, accessToken}` für diese authentifizierte Mitgliedschaft zurück. Prägen Sie ein kurzlebiges, auf die Zielgruppe zugeschnittenes Token pro Server. Lassen Sie den Callback für den Chat nur mit Kontext weg. Der Browser empfängt nur die Widget-Sitzung und den Kontext.
