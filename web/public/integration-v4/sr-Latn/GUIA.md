# Integracija podrške · ugovor v4

**SDK 0.3.0 · Priručnik za pozadinu, prednji kraj i rad**

[TOC]

## 1. Kako funkcioniše

Vaš backend autentifikuje korisnika, projektuje autorizovani kontekst i izdaje 15-minutnu sesiju. U pozivu za izdavanje, može uključiti dostupne MCP servere za tu osobu. Pretraživač prima JWT vidžeta i kontekst.

## 2. Okruženja i odgovornosti

Platforma je na https://support-ai.pontes.uk. Koristite integracione akreditive ispravnog okruženja. Administrator radnog prostora dobija akreditive na kontrolnoj tabli. Tim aplikacije održava autentifikovani bootstrap, kontekst i delegirane tokene po korisniku i serveru.

## 3. Akreditivi

| Akreditiv | Odredište | Upotreba |
| --- | --- | --- |
| Integracioni akreditiv sik_ | Support AI | Izdavanje sesije u backendu |
| Token delegiran po serveru | MCP naznačen u sesiji | Pozivanje alata kao autentifikovana osoba |
| JWT sesije | API četa | Otvaranje i nastavak razgovora u vidžetu |

Čuvajte integracioni akreditiv u sefu aplikacije. Opoziv ga deaktivira JWTs izdate sa njim pri sledećem zahtevu. Generišite delegirane tokene u backendu i ograničite svaki na resurs, korisnika i rok važenja.

## 4. Tok autentifikacije i identiteta

```text
Autentifikovana sesija aplikacije
  → backend validira aktivnu osobu, organizaciju i trenutne dozvole
  → POST /api/widget/sessions sa sik_ na serveru
  ← jwt + tenantKey + expiresIn
  → backend prikuplja i projektuje kontekst ISTOG identiteta
  ← pretraživač prima sesiju/kontekst sa Cache-Control: no-store
  → vidžet poziva /api/cases i rute razgovora sa privremenim JWT
```

Očuvanje istorijskog identifikatora klijenta `usr_...` sprečava gubitak pristupa sopstvenim razgovorima. Ne koristiti email, ulogu, uređaj ili vremensku oznaku kao identitet. Ako isti korisnik može promeniti kompaniju, definisati stabilan subjekat po vezi ili eksplicitnoj politici istorije; platforma autorizuje razgovore po zakupcu + osobi, bez inferiranja organizacija klijenta.

Platforma proverava potpis, izdavaoca `ai-support`, publiku `ai-support-widget`, svrhu `widget`, `sub=userId`, validnost i aktivni akreditiv sesije. Pretraživač ne potpisuje ponovo niti menja zahteve. Uloge poslate podršci su informacije o kontekstu; autorizacija API-ja/MCP nastavlja se na klijentskom serveru.

## 5. Ugovor izdavaoca

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Odgovor 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validirati `tenantKey` pre vraćanja pretraživaču. Datoteka `backend-session.mjs` implementira strogo telo, vremensko ograničenje, blokiranje preusmeravanja, ograničenje odgovora i validaciju zakupca; ne zamenjuje vaš middleware za autentifikaciju.

| Polje | Pravilo |
| --- | --- |
| mcpServers | Opciona lista do osam objekata sa jedinstvenim id, url i accessToken. Pogledajte odeljak 12. |
| userId | Obavezno, trim, 1–200 karaktera |
| userEmail | Važeći email do 254 karaktera ili prazan; podrazumevano prazan |
| userRoles | Do 30 stringova od 1–80 karaktera; podrazumevano prazna lista |
| plan | String od 1–80 karaktera; podrazumevano standard |

Ne šaljite tenantId, tenantKey, userName, role, purpose, exp ili druga polja u telu. Akreditiv određuje zakupca. Identitet dolazi iz sesije/baze, a ne iz upita/tela pretraživača. Izdavalac ne prihvata korisnički JWT, administrativni ključ ili staru tajnu umesto `sik_`.

Javni izdavalac radi bez kvota korišćenja po projektu. Ponovo koristite još uvek važeću sesiju iste osobe, kompanije i dozvola, sa ranijim istekom i poništavanjem pri promenama.

## 6. Obavezan kontekst i ispravan identitet

Svaki novi slučaj zahteva `context.userState`, `context.userHistory` i `context.userLogs`. Pošaljite prazne liste kada je izvor upitan i nema zapisa; **ne pretvarajte neuspelu kolekciju u praznu listu koja izgleda uspešno**. Ako ne možete da obezbedite važeći i autorizovan kontekst, klijentski bootstrap mora vratiti kontrolisanu grešku.

`context.example.json` je minimalni primer. `context.schema.json` je izvezen iz šeme Zod korišćene na serveru, nije napisan nezavisno. Validirajte JSON na backendu pre implementacije. Dodatna neprepoznata polja se odbacuju; metapodaci i pravila mogu sadržati sopstvene strukture, podložne projekciji/ograničenjima. Šema ne dokazuje autorizaciju niti eliminiše sve osetljive podatke.

| Blok | Obavezno / struktura |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours pozitivno do 720, events; vremenska linija se rekonstruiše iz events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Opcionalno; docs sa id, title, content, category |
| businessRules | Opcionalno; odobren objekat pravila, serijalizovan kao runbook |

`userState.userId` mora biti tačno izdati identitet. **`userState.tenantId` je zakupac platforme**, nikada ID organizacije/prodavnice kod klijenta. Neslaganja vraćaju 403. Podaci u pretraživaču mogu biti izmenjeni; kontekst ne autorizuje operacije.

## 7. Polja, ograničenja i normalizacija

| Struktura | Glavna polja / pravila |
| --- | --- |
| entities | type, status; id/description opcionalno; metadata objekat; do 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; do 100 |
| errorClass od activeErrors | validation, permission, infra ili business; kategorije kao što je payment zahtevaju mapiranje |
| events | ts, event, page; elementId, intent, correlationRequestId prihvataju null/izostavljanje; do 1.000 |
| recentRequests | ts, route, httpStatus ceo broj, timingMs, requestId; errorCode/resourceId mogu biti null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs broj ili null; errorCode/lastStage mogu biti null |
| status od jobs | queued, running, succeeded, failed, canceled |
| errors sa backenda | ts, errorCode, errorClass string, route, requestId; resourceId može biti null |
| docs | Do 50; content do 32.000 znakova, ostali tekstovi do 4.096 |

Datumi su ISO-8601 stringovi sa vremenskom zonom; serijalizujte Date na backendu. Ne izmišljajte updatedAt, durationMs, retryable ili kategorije samo da biste prošli šemu: koristite stvarni izvor ili izostavite zapis i prijavite nedostupnost izvora. Registrujte specifična mapiranja vašeg projekta u prihvatanju.

Poslati kontekstni krov: **262.144 bajta UTF-8 (256 KiB)**. Ukupni HTTP ostaje ograničen na 1.048.576 bajta. Budžet snimka je `min(maxContextBytes, 262144)`. Ako se ni suštinski deo ne uklapa, zahtev ne uspeva; smanjite metapodatke/dokumente na backendu. Predlažemo da počnete sa 48 KiB, deset entiteta i kratkim znanjem.

Server filtrira događaje/logove po najmanjem prozoru između traženog i prozora zakupca, uklanja buduće datume i primenjuje maxLogLines kombinovano sa zahtevima, greškama i jobs (ovim redosledom). maxDocs ograničava listu docs; businessRules je zaseban runbook i takođe zauzima ukupan budžet. Vremenska linija prati zadržane događaje. Manje relevantnih podataka obično proizvodi bolju dijagnozu i niže troškove.

## 8. Privatnost i postojanost

Dizajnirajte podatke pre slanja: nikada ne prosleđujte zaglavlja, kolačiće, JWTs, akreditive, stringove za povezivanje, potpisane URL-ove, binarni sadržaj, podatke drugih korisnika ili sirove izvoze. Zamenite tajne referencama podrške. Ne šaljite ceo PRD ili kompletne logove kao bazu znanja.

Novi snimci prolaze validaciju, redakciju, smanjenje i budžetiranje pre snimanja. Poruke i rezultati alata tretiraju se poznatim obrascima tajni. Ova zaštita je komplementarna: nije nepogrešiv klasifikator ličnih podataka, ne ispravlja retroaktivno istorijske zapise niti zamenjuje projektovanje klijenta.

Kontekst je snimak početka razgovora, a ne upit u realnom vremenu. Navedite vremenske oznake i izvore. `updateContext()` važi za sledeći slučaj; za trenutne podatke tokom razgovora, koristite odobreni alat za čitanje.

## 9. Frontend i SDK 0.3.0

Poslužite fiksni SDK iz paketa ili sa javnog URL-a. Proverite SHA-256 sa `widget.manifest.json`. Izbegavajte duplirani skript, plutajuću verziju i keširanje JWT. Referentni kontroler u `widget-controller.mjs` se montira nakon bootstrapa, čeka onOpen, obnavlja i sprečava kasno montiranje nakon odjave.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// Pri odjavi, promeni osobe/kompanije/uloge i čišćenju komponente:
controller.destroy();
```

Gore navedene funkcije su povratni pozivi aplikacije, koje treba implementirati sa vašim uobičajenim HTTP klijentom. Bootstrap vraća `{jwt,tenantKey,expiresIn,context}`. getContext vraća kontekstni objekat. U Reactu, stabilizujte povratne pozive sa useCallback i montirajte u useEffect povezanom sa identitetom. Ne postavljajte vidžet izvan autentifikovanog područja niti nudite posetiocima sa zajedničkim userId.

SDK prihvata `onTokenRefresh` koji vraća novi JWT; nakon 401, ponavlja zahtev jednom. Obnova mora koristiti istu osobu. Promena identiteta zahteva uništenje i inicijalizaciju. Ako koristite proaktivni tajmer, preferirajte oko deset minuta sa podrhtavanjem i otkažite pri čišćenju. Greške pri pokretanju, prikupljanju i modelu ne bi trebalo da blokiraju glavnu aplikaciju.

## 10. Odjava, dozvole i istorija

`destroy()` prekida pozive i uklanja lokalnu postojanost po zakupcu/osobi. To nije pojedinačno opozivanje na serveru. Već kopirani JWT može ostati važeći do 15 minuta nakon odjave/zaključavanja na klijentu. Ako je potrebno trenutno opozivanje po osobi, ugovor zahteva dodatnu evoluciju; ne koristiti rotaciju celog zakupca kao normalnu odjavu.

Svako čitanje/pisanje razgovora zahteva istog vlasnika i zakupca. Promena uloge na klijentu ne briše sadržaj koji je osoba već primila u razgovoru. Definisati politiku istorije za smanjenje dozvola i promene organizacije. Ne popuštati autorizaciju za oporavak starog caseId; proveriti originalni subjekat ili započeti novi razgovor.

## 11. CORS, CSP, PWA i pristup

Dozvoliti na platformi tačan izvor svakog frontenda. SDK treba connect-src za podršku; serviranje lokalnog fajla omogućava script-src self. SDK ubacuje stil u Shadow DOM i još uvek ne prima nonce: homologovati stvarnu CSP politiku, što može zahtevati evoluciju SDK za eksterne stilove/nonce/hash. Ne isključivati celu politiku.

Sesije i kontekst su no-store. Isključiti rute podrške iz kešova PWA, postojanosti upita i alata za ponovno reprodukovanje. Testirati tastaturu, fokus, čitač ekrana, zum i mobilni telefon. Predstaviti pravi ljudski kanal u aplikaciji, sa potvrđenim vremenom/URL-om. SDK ne izmišlja pružaoca usluga.

## 12. MCP serveri u sesiji

Backend aplikacije šalje `POST /api/widget/sessions` sa integracionim kredencijalom `sik_`. On izvodi osobu i njenu organizaciju iz prijave i može uključivati do osam servera u `mcpServers`. Izostavljeno ili prazno polje kreira chat sa kontekstom. Svaka nova sesija dobija svoju listu.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Svaki id počinje malim slovom i prihvata mala slova, cifre, donju crtu i crticu, do 32 znaka. ID-ovi, normalizovani URL-ovi i tokeni su jedinstveni na listi. Transport je MCP Streamable HTTP preko javnog HTTPS, porta 443, sa URL-om bez kredencijala, upita ili fragmenta. Servis proverava DNS prilikom povezivanja i odbija preusmeravanja.

Aplikacija izdaje ili dobija kratak pristupni token za svaku destinaciju, ograničen na osobu, organizaciju, dozvole i publiku tog MCP. Support AI predstavlja `Authorization: Bearer <accessToken>` odgovarajućem serveru. Pružalac proverava potpis ili introspekciju, izdavaoca, validnost, publiku i pristup resursu u svakoj operaciji. On objavljuje u katalogu samo alate dozvoljene za taj identitet. Kredencijal platforme, JWT vidžeta i ključevi servisa kao što je Stripe imaju svoje svrhe.

Delegirani token ostaje šifrovan na serveru do 900 sekundi. Pretraživač prima `{jwt, tenantKey, expiresIn: 900}`. Prilikom obnove, backend ponovo validira identitet i šalje novu listu sa važećim tokenima. Predlog kreiran pre obnove mora biti ponovo predstavljen. Za promenu organizacije, koristite stabilan identifikator po vezi i uništite prethodnu instancu vidžeta.

Support AI prolazi kroz stranice `tools/list`, razlikuje ista imena po serveru i koristi originalno ime prilikom pozivanja `tools/call`. Katalozi sa više od 32 alata imaju pretragu i paginaciju unutar ćaskanja. Ograničenja otkrivanja po serveru su 128 stranica i 4 MB opisa. Neuspeh otkrivanja jednog servera čuva ostale.

Alati sa `annotations.readOnlyHint: true` mogu se direktno konsultovati. Za svaki alat sa nedostajućom ili lažnom anotacijom, ćaskanje prikazuje server, ime i argumente pre izvršavanja. Deklarišite samo za čitanje za operacije bez poslovnih efekata. Korisnik odgovara `confirmar` ili `confirm` na prikazanu poruku u roku od pet minuta. SDK šalje `replyToMessageId`. Potvrda važi za te argumente, server, sesiju i razgovor. Novi predlog zamenjuje prethodni.

Platforma pokušava izvršenje nakon registracije potvrde i šalje `Idempotency-Key` sa ID-om predloga. Za plaćanja i operacije sa spoljnim efektima, provajder mora atomski sačuvati ključ i rezultat i poštovati ključeve idempotencije koje zahteva finansijska usluga. Nakon isteka vremena ili dvosmislenog rezultata, podrška registruje nepoznato stanje, blokira nove izmene u tom razgovoru i održava dostupne upite. Proverite operaciju u izvornom sistemu pre nego što nastavite.

Za homologaciju, testirajte sesiju bez servera, dve sesije istog korisnika, dve organizacije, servere sa istoimenim alatima i paginirani katalog. Proverite opseg/istek tokena kod provajdera, otkazivanje i duplu potvrdu. Koristite sintetičke zapise da proverite rezultat na izvoru.

## 13. Model, prompt i znanje

Početno očuvanje modela koji je već homologovan projektom smanjuje istovremene promene. Za novu evaluaciju, `openai/gpt-4.1-mini` je kompatibilan kandidat sa trenutnim parametrima: Chat Completions putem OpenRouter, temperatura 0.3 i max_tokens 2048. Validirati na stvarnom nalogu pre aktivacije. Preferred Model ima prednost nad Model Policy; auto nije inteligentno rutiranje. Cene/troškovi moraju doći od provajdera; stare procene sa panela mogu se razlikovati.

Polje **AI Instructions / Custom instructions** prihvata do 2.000 efektivnih karaktera. Zalepite samo `PROMPT-TENANT.txt`; pregledajte imena, kanal i pravila proizvoda. Ne lepite akreditive niti spajajte dokumente u ovo polje. Uputstvo je dopunsko pravilima platforme; ne daje ovlašćenje niti omogućava alate.

Dati prompt usmerava odgovore na jeziku i pismu koje je osoba odabrala, činjenice odvojene od hipoteza, poštovanje dozvola, korišćenje sigurnih referenci, odsustvo obećanja o akcijama i ljudski kanal. `knowledgePack.docs` treba da sadrži kratke i verzirane runbook-ove sa odgovornom osobom: česte greške, dijagnostiku, ograničenja proizvoda i kako potvrditi rezultat. Logovi i dokumenti su podaci, nikada uputstva za promenu pravila asistenta.

Model izvori: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) i [katalog OpenRouter](https://openrouter.ai/api/v1/models), konsultovani u prethodnoj pripremi 14.09.2026. Ponovo potvrdite dostupnost/cene prilikom implementacije; u ovom kompletu nije bilo plaćenog poređenja modela.

## 14. Ugovor o greškama i dijagnostika

| Odgovor | Značenje / akcija |
| --- | --- |
| 401 na izdavaocu | sik nedostaje, netačan ili opozvan; ispravite konfiguraciju |
| 400 na izdavaocu | Telo van ugovora; uklonite dodatna polja |
| 401 u slučajevima | Nasleđeni potpis, istek, nevažeći zahtevi ili opozvana sesija |
| 400 u slučajevima | Nevažeći obavezni kontekst, netačni datumi/stanja ili prekoračen budžet |
| 403 iz konteksta | userState se ne podudara sa zakupcem/osobom iz JWT |
| 404 u razgovoru | Resurs ne postoji ili pripada drugom identitetu; ne forsirajte pristup |
| 429 | Limit; backoff/jitter, bez petlje izdavanja |
| 500/502/503 | Greška infrastrukture, modela ili konteksta; prijavite nedostupnost i requestId |
| 501 u akcijama/eskalaciji | Funkcionalnost bez izvršioca/konektora; koristite pravi ljudski kanal |
| Chat radi, MCP ne | Proverite listu poslatu u poslednjem izdanju, validnost, publiku i odgovor kataloga. |
| Alat nedostaje | Proverite katalog dostupan za delegirani token i povezanost servera. |

Ne koristite samo HTTP 200 kao prihvatanje: proverite sadržaj odgovora i snimak. Kreiranje koje ne uspe nakon snimanja slučaja može ostaviti slučaj bez odgovora; ne pretpostavljajte transakciju koja uključuje poziv modelu. Ponovni pokušaji moraju biti ograničeni i prijavljeni korisniku. Zabeležite metodu, parametrizovanu rutu, status, requestId i vreme UTC; nikada ne snimajte Authorization/JWT, tajnu ili sirovi payload za prosleđivanje dijagnostike.

## 15. Obavezno prihvatanje

1. Bootstrap ruta bez prijave odbijena pre izdavaoca. Falsifikovani identiteti ne menjaju autentifikovanog korisnika.
2. Izdavanje sa ispravnim akreditivom vraća očekivanog zakupca i 900 sekundi; tajna se ne pojavljuje u pretraživaču/reprodukciji/logovima.
3. Stari JWT je odbijen. Nova sesija kreira razgovor sa snimkom i stvarnim odgovorom; ponovo se otvara za istu osobu.
4. Dve osobe iz istog projekta i dva zakupca: GET slučaj i POST poruke/povratne informacije/zatvaranje/eskalacija/akcije ne ukrštaju identitete.
5. Kontekst bez blokova, različit identitet, nevažeći datum i prevelika veličina su odbijeni; sintetičke tajne ne opstaju u snimku.
6. Obnova nakon 15 minuta, odjava tokom prikupljanja, promena naloga/kompanije/uloge i navigacija ne vraćaju razgovor druge osobe.
7. Model odgovara koristeći dokaze i poštuje ograničenje dijagnostike; neuspeh ne generiše očigledan uspeh.
8. Izdajte sesije sa nula i dva servera. Proverite da svaka destinacija prima sopstveni token.
9. MCP odbija pogrešan/stari token, pogrešnog zakupca, nedostajućeg/neaktivnog korisnika i resurs druge osobe. Testirajte ponovo korišćeni ID sesije, ako postoji sesija.
10. Potvrdite da promene zahtevaju potvrdu predloga i da se ne ponavljaju u slučaju isteka vremena.
11. CORS/CSP, mobilni telefon, tastatura i ljudski kanal su odobreni. Koordinisana rotacija testirana u homologaciji.

`node --test examples.test.mjs` validira izolovane adaptere sa mockovima. Ne zamenjuje ove end-to-end testove. Popunite `ACEITE.md` sa odgovornim osobama, verzijama, vremenima i dokazima bez tajni.

## 16. Objavljivanje, sečenje i oporavak

Instalirajte integracionu akreditaciju, objavite bootstrap i SDK, validirajte chat i homologujte servere deklarisane u sesijama.

Ne reaktivirati zastarele pretplate niti globalno prosleđivanje MCP radi oporavka dostupnosti. Ako dođe do kvara, privremeno onemogućite widget ili MCP pogođenog zakupca i održavajte ljudski kanal dok se adapter ne popravi. Ne brišite razgovore da biste zaobišli 404 grešku vlasnika.

Zabeležite ograničenja zadržavanja i specifične dokaze vaše aplikacije.

## 17. Povratne informacije i datoteke paketa

Vratite naziv projekta, zakupca, backend/frontend commit-ove, datum UTC, SDK/hash, instaliranu akreditaciju (da/ne, bez vrednosti), odobren chat, MCP odobren/isključen, negativne testove, ljudski kanal i nerešene stavke. Ne zaključujte sa „čini se da radi“.

Javni komplet sadrži ovaj vodič u Markdown, šemu servera, minimalnu fixturu, adapter izdavaoca, MCP autentifikaciju, frontend kontroler, SDK, prompt, izolovane testove, kontrolnu listu, ugovor o akcijama i SHA-256 manifest. Pojedinačni paketi mogu dodati specifične priloge. Primeri ne implementiraju automatski krajnje tačke klijentske aplikacije. Verzija za pregled je na https://support-ai.pontes.uk/developers?lang=sr-Latn.
