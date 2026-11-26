# AI Support Widget pokretač

Ekstrahujte ZIP i pokrenite `node server.mjs` koristeći Node.js 22 ili noviji. Otvorite loopback URL odštampan u terminalu. Otvorite ćaskanje podrške i pitajte zašto uvoz nije uspeo. Odgovor identifikuje red 42 i prikazuje sintetički uvoz i reference greške. Resetujte uzorak da biste započeli novi razgovor.

`server.mjs` služi uzorak na vašem računaru. `starter/sample.js` se pokreće u pregledaču i odgovara lokalnim podacima. `widget.v0.3.0.js` je zakačena verzija vidžeta. Uporedite njen SHA-256 sa `widget.manifest.json`.

Preuzeti uzorak se otvara na jeziku ovog paketa. Dodajte `?lang=sr-Latn`, `?lang=sr-Cyrl` ili `?lang=ar` da biste proverili drugi dostupni lokalitet. Prosledite korisnikov izabrani lokalitet prilikom montiranja SDK u vašoj aplikaciji.

Da biste integrisali sopstvenu aplikaciju, uklonite skriptu za podatke i montirajte `createBootstrapHandler` iz `bootstrap.mjs` na vašem aplikacionom serveru na ruti kao što je `/api/support/bootstrap`. Obezbedite `authenticate(request)` iz vaše postojeće sesije middleware-a i `collectContext(user, tenantKey, signal)` iz vašeg sloja podataka. Postavite privatne promenljive okruženja u `backend.env.example`. Inicijalizujte vidžet sa tokenom i kontekstom koje vraća ta ruta. Postavite opcioni `handoffUrl` na vašu HTTPS stranicu za ljudsku podršku. Pratite [Brzi start za programere](https://support-ai.pontes.uk/developers/quick-start?lang=sr-Latn) za životni ciklus sesije.

Vaš backend može da obezbedi `getMcpServers(user, signal)` bootstrap rukovaocu. Vratite niz `{id, url, accessToken}` za ovo autentifikovano članstvo. Izradite kratkotrajni token sa opsegom publike po serveru. Izostavite povratni poziv za ćaskanje samo sa kontekstom. Pregledač prima samo sesiju vidžeta i kontekst.
