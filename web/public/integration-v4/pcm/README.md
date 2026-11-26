# AI Support Widget starter

Extract the ZIP file, then run `node server.mjs` using Node.js 22 or later. Open the loopback URL wey dey for inside terminal. Open the support chat and ask why the import no gree work. The reply go show row 42 and display the synthetic import and error references. Reset the sample to start a fresh conversation.

`server.mjs` go serve the sample for your computer. `starter/sample.js` go run for inside browser and answer with local fixtures. `widget.v0.3.0.js` na the pinned widget release. Compare its SHA-256 with `widget.manifest.json`.

The sample wey you download go open for the language of this kit. Add `?lang=sr-Latn`, `?lang=sr-Cyrl`, or `?lang=ar` to check another available locale. Pass the user selected locale when you dey mount the SDK for your application.

To join your own app, remove the fixture script and mount `createBootstrapHandler` from `bootstrap.mjs` for your application server for one route like `/api/support/bootstrap`. Give `authenticate(request)` from your existing session middleware and `collectContext(user, tenantKey, signal)` from your data layer. Set the private environment variables for `backend.env.example`. Initialize the widget with the token and context wey that route return. Set the optional `handoffUrl` to your HTTPS human support page. Follow the [Developer Center Quick Start](https://support-ai.pontes.uk/developers/quick-start?lang=pcm) for the session lifecycle.

Your backend fit supply `getMcpServers(user, signal)` to the bootstrap handler. Return an array of `{id, url, accessToken}` for this authenticated membership. Mint a short-lived, audience-scoped token per server. No put the callback for chat with context alone. The browser go only receive the widget session and context.
