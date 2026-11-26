# AI Support Widget starter

Extract the ZIP and run `node server.mjs` using Node.js 22 or later. Open the loopback URL printed in the terminal. Open the support chat and ask why the import failed. The reply identifies row 42 and displays the synthetic import and error references. Reset the sample to start a fresh conversation.

`server.mjs` serves the sample on your computer. `starter/sample.js` runs in the browser and answers with local fixtures. `widget.v0.3.0.js` is the pinned widget release. Compare its SHA-256 with `widget.manifest.json`.

The downloaded sample opens in the language of this kit. Append `?lang=sr-Latn`, `?lang=sr-Cyrl`, or `?lang=ar` to check another available locale. Pass the user's selected locale when mounting the SDK in your application.

To integrate your own app, remove the fixture script and mount `createBootstrapHandler` from `bootstrap.mjs` on your application server at a route such as `/api/support/bootstrap`. Supply `authenticate(request)` from your existing session middleware and `collectContext(user, tenantKey, signal)` from your data layer. Set the private environment variables in `backend.env.example`. Initialize the widget with the token and context returned by that route. Set the optional `handoffUrl` to your HTTPS human support page. Follow the [Developer Center Quick Start](https://support-ai.pontes.uk/developers/quick-start) for the session lifecycle.

Your backend can supply `getMcpServers(user, signal)` to the bootstrap handler. Return an array of `{id, url, accessToken}` for this authenticated membership. Mint a short-lived, audience-scoped token per server. Omit the callback for chat with context alone. The browser receives only the widget session and context.
