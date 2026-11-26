# Mai farawa AI Support Widget

Cire ZIP ɗin kuma gudanar da `node server.mjs` ta amfani da Node.js 22 ko kuma daga baya. Bude URL ɗin loopback da aka buga a cikin tashar. Bude tattaunawar tallafi kuma tambayi dalilin da yasa shigo da bayanan ya gaza. Amsar ta gano jere na 42 kuma tana nuna shigo da bayanan na roba da kuma nassoshin kuskure. Sake saita samfurin don fara sabuwar tattaunawa.

`server.mjs` yana ba da samfurin a kwamfutarka. `starter/sample.js` yana gudana a cikin burauzar kuma yana amsawa da kayan aiki na gida. `widget.v0.3.0.js` shine fitowar widget ɗin da aka ɗora. Kwatanta SHA-256 ɗinsa da `widget.manifest.json`.

Samfurin da aka sauke yana buɗewa a cikin yaren wannan kit ɗin. Ƙara `?lang=sr-Latn`, `?lang=sr-Cyrl`, ko `?lang=ar` don duba wani yaren da ke akwai. Ba da yaren da mai amfani ya zaɓa lokacin da ake ɗora SDK a cikin aikace-aikacenku.

Don haɗa aikace-aikacenku, cire rubutun kayan aiki kuma ɗora `createBootstrapHandler` daga `bootstrap.mjs` a kan sabar aikace-aikacenku a wata hanya kamar `/api/support/bootstrap`. Samar da `authenticate(request)` daga middleware ɗin zaman ku na yanzu da `collectContext(user, tenantKey, signal)` daga layin bayanan ku. Saita masu canjin muhalli masu zaman kansu a cikin `backend.env.example`. Fara widget ɗin tare da alamar da mahallin da wannan hanyar ta dawo. Saita zaɓi `handoffUrl` zuwa shafin tallafin ɗan adam na HTTPS ku. Bi [Cibiyar Masu Haɓakawa Mai Saurin Fara](https://support-ai.pontes.uk/developers/quick-start?lang=ha) don rayuwar zaman.

Bayananku na iya samar da `getMcpServers(user, signal)` ga mai sarrafa bootstrap. Dawo da jerin `{id, url, accessToken}` don wannan memba da aka tabbatar. Ƙirƙiri alama mai ɗan gajeren lokaci, mai faɗin masu sauraro ga kowace sabar. Cire kiran baya don tattaunawa tare da mahallin kawai. Burauzar tana karɓar zaman widget ɗin da mahallin kawai.
