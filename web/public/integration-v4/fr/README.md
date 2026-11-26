# Démarreur AI Support Widget

Extrayez le ZIP et exécutez `node server.mjs` avec Node.js 22 ou version ultérieure. Ouvrez l'URL de bouclage affichée dans le terminal. Ouvrez le chat d'assistance et demandez pourquoi l'importation a échoué. La réponse identifie la ligne 42 et affiche les références d'importation synthétique et d'erreur. Réinitialisez l'échantillon pour démarrer une nouvelle conversation.

`server.mjs` sert l'échantillon sur votre ordinateur. `starter/sample.js` s'exécute dans le navigateur et répond avec des "fixtures" locales. `widget.v0.3.0.js` est la version épinglée du widget. Comparez son SHA-256 avec `widget.manifest.json`.

L'échantillon téléchargé s'ouvre dans la langue de ce kit. Ajoutez `?lang=sr-Latn`, `?lang=sr-Cyrl` ou `?lang=ar` pour vérifier un autre "locale" disponible. Transmettez le "locale" sélectionné par l'utilisateur lors du montage du SDK dans votre application.

Pour intégrer votre propre application, supprimez le script de "fixture" et montez `createBootstrapHandler` de `bootstrap.mjs` sur votre serveur d'application à une route telle que `/api/support/bootstrap`. Fournissez `authenticate(request)` à partir de votre "middleware" de session existant et `collectContext(user, tenantKey, signal)` à partir de votre couche de données. Définissez les variables d'environnement privées dans `backend.env.example`. Initialisez le widget avec le jeton et le contexte renvoyés par cette route. Définissez l'option `handoffUrl` sur votre page d'assistance humaine HTTPS. Suivez le [Démarrage rapide du Centre de développement](https://support-ai.pontes.uk/developers/quick-start?lang=fr) pour le cycle de vie de la session.

Votre "backend" peut fournir `getMcpServers(user, signal)` au gestionnaire de démarrage. Retournez un tableau de `{id, url, accessToken}` pour cette adhésion authentifiée. Créez un jeton de courte durée, "audience-scoped" par serveur. Omettez le rappel pour le chat avec le contexte seul. Le navigateur ne reçoit que la session et le contexte du widget.
