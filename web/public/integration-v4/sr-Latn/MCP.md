# MCP po sesiji

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
