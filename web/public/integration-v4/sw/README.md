# Kianzisha cha AI Support Widget

Fungua ZIP na uendeshe `node server.mjs` ukitumia Node.js 22 au toleo jipya zaidi. Fungua URL ya loopback iliyochapishwa kwenye terminal. Fungua gumzo la usaidizi na uulize kwa nini uingizaji haukufaulu. Jibu linabainisha safu 42 na kuonyesha marejeleo ya uingizaji bandia na makosa. Weka upya sampuli ili kuanza mazungumzo mapya.

`server.mjs` inatoa sampuli kwenye kompyuta yako. `starter/sample.js` inaendeshwa kwenye kivinjari na kujibu kwa vifaa vya ndani. `widget.v0.3.0.js` ni toleo lililobandikwa la wijeti. Linganisha SHA-256 yake na `widget.manifest.json`.

Sampuli iliyopakuliwa inafunguka katika lugha ya kifaa hiki. Ongeza `?lang=sr-Latn`, `?lang=sr-Cyrl`, au `?lang=ar` ili kuangalia lugha nyingine inayopatikana. Pitisha lugha iliyochaguliwa na mtumiaji wakati wa kuweka SDK kwenye programu yako.

Ili kuunganisha programu yako mwenyewe, ondoa hati ya kurekebisha na uweke `createBootstrapHandler` kutoka `bootstrap.mjs` kwenye seva yako ya programu kwenye njia kama vile `/api/support/bootstrap`. Toa `authenticate(request)` kutoka kwa programu yako iliyopo ya kikao na `collectContext(user, tenantKey, signal)` kutoka kwa safu yako ya data. Weka vigezo vya mazingira ya faragha katika `backend.env.example`. Anzisha wijeti na tokeni na muktadha uliorejeshwa na njia hiyo. Weka `handoffUrl` ya hiari kwenye ukurasa wako wa usaidizi wa binadamu wa HTTPS. Fuata [Mwongozo wa Haraka wa Kituo cha Wasanidi Programu](https://support-ai.pontes.uk/developers/quick-start?lang=sw) kwa mzunguko wa maisha wa kikao.

Backend yako inaweza kutoa `getMcpServers(user, signal)` kwa kishughulikia cha bootstrap. Rejesha safu ya `{id, url, accessToken}` kwa uanachama huu uliothibitishwa. Tengeneza tokeni ya muda mfupi, yenye wigo wa hadhira kwa kila seva. Acha callback kwa gumzo na muktadha pekee. Kivinjari kinapokea tu kikao cha wijeti na muktadha.
