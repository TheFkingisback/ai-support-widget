# Haɗin kai na tallafi · kwangila v4

**SDK 0.3.0 · Littafin baya, gaba da aiki**

[TOC]

## 1. Yadda yake aiki

Bayananku yana tabbatar da mai amfani, yana tsara mahallin da aka ba izini kuma yana fitar da zaman minti 15. A kiran fitarwa, zai iya haɗa da sabobin MCP da ke akwai ga wannan mutumin. Mai bincike yana karɓar JWT na widget da mahallin.

## 2. Muhalli da masu alhakin

Dandalin yana kan https://support-ai.pontes.uk. Yi amfani da takardar shaidar haɗin kai na madaidaicin muhalli. Mai gudanar da wurin aiki yana samun takardar shaidar a cikin dashboard. Ƙungiyar aikace-aikacen tana kula da ingantaccen bootstrap, mahallin da alamun da aka ba da izini ga kowane mai amfani da sabar.

## 3. Takardun shaida

| Takardar shaida | Makoma | Amfani |
| --- | --- | --- |
| Takardar shaidar haɗin kai sik_ | Support AI | Fitar da zama a baya |
| Alamar da aka ba da izini ta sabar | MCP da aka nuna a zaman | Kira kayan aiki a matsayin mutumin da aka tabbatar |
| JWT na zaman | API na hira | Bude da ci gaba da tattaunawa a cikin widget |

Ajiye takardar shaidar haɗin kai a cikin ma'ajiyar aikace-aikacen. Soke ta yana kashe JWTs da aka bayar da ita a buƙatar gaba. Samar da alamun da aka ba da izini a baya kuma iyakance kowane ɗaya zuwa albarkatu, mai amfani da lokacin karewa.

## 4. Tsarin tabbatarwa da asali

```text
Zaman aikace-aikacen da aka tabbatar
  → baya yana tabbatar da mutum mai aiki, ƙungiya da izini na yanzu
  → POST /api/widget/sessions tare da sik_ a sabar
  ← jwt + tenantKey + expiresIn
  → baya yana tattara kuma yana tsara mahallin asali ƊAYA
  ← mai bincike yana karɓar zama/mahallin tare da Cache-Control: no-store
  → widget yana kiran /api/cases da hanyoyin tattaunawa tare da JWT na ɗan lokaci
```

Kiyaye mai gano tarihi `usr_...` na abokin ciniki yana hana rasa damar shiga tattaunawarsu. Kada a yi amfani da email, rawa, na'ura ko timestamp a matsayin asali. Idan mai amfani ɗaya zai iya canza kamfani, ayyana batun daidaitacce ta hanyar haɗi ko manufar tarihi bayyananne; dandalin yana ba da izini ga tattaunawa ta hanyar mai haya + mutum, ba tare da gano ƙungiyoyin abokin ciniki ba.

Dandalin yana duba sa hannu, mai bayarwa `ai-support`, masu sauraro `ai-support-widget`, manufa `widget`, `sub=userId`, inganci da takardar shaidar aiki na zaman. Mai bincike baya sake sa hannu ko canza da'awa. Matsayin da aka aika zuwa tallafi shine bayanin mahallin; izini na APIs/MCP yana ci gaba a sabar abokin ciniki.

## 5. Kwangilar mai bayarwa

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Amsa 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Tabbatar da `tenantKey` kafin mayar da shi ga mai bincike. Fayil ɗin `backend-session.mjs` yana aiwatar da tsayayyen jiki, lokacin ƙarewa, toshewar sake tura, iyakance amsa da tabbatar da mai haya; baya maye gurbin middleware na tabbatarwa.

| Filin | Dokar |
| --- | --- |
| mcpServers | Jerin zaɓi na har zuwa abubuwa takwas tare da id, url da accessToken na musamman. Duba sashe na 12. |
| userId | Wajibi, yanke, haruffa 1–200 |
| userEmail | Imel mai inganci har zuwa haruffa 254 ko fanko; tsoho fanko |
| userRoles | Har zuwa igiyoyi 30 na haruffa 1–80; tsoho jerin fanko |
| plan | Igiyar haruffa 1–80; tsoho standard |

Kada a aika tenantId, tenantKey, userName, role, purpose, exp ko wasu filaye a cikin jiki. Takardar shaidar tana tantance mai haya. Asalin yana fitowa daga zaman/database, ba daga tambaya/jiki na browser ba. Mai bayarwa baya karɓar JWT mai amfani, maɓallin gudanarwa ko tsohon sirri a maimakon `sik_`.

Mai bayarwa na jama'a yana aiki ba tare da ƙayyadaddun amfani ba ga kowane aiki. Sake amfani da zaman da har yanzu yana aiki daga mutum ɗaya, kamfani da izini, tare da ƙarewa da wuri da kuma soke shi akan canje-canje.

## 6. Wajibi ne mahallin da kuma asalin daidai

Kowane sabon hali yana buƙatar `context.userState`, `context.userHistory` da `context.userLogs`. Aika jerin fanko lokacin da aka tambayi tushen kuma babu bayanai; **kada a canza tarin da ya gaza zuwa jerin fanko wanda ke nuna nasara**. Idan ba za a iya samar da mahallin ingantacce kuma mai izini ba, dole ne abokin ciniki ya dawo da kuskuren da aka sarrafa.

`context.example.json` shine mafi ƙarancin misali. An fitar da `context.schema.json` daga schema Zod da aka yi amfani da shi a kan sabar, ba a rubuta shi da kansa ba. Tabbatar da JSON a cikin backend kafin turawa. Ana watsar da ƙarin filaye da ba a gane su ba; metadata da dokoki na iya ƙunsar tsarin nasu, waɗanda ke ƙarƙashin tsinkaya/iyaka. Schema baya tabbatar da izini ko kawar da duk bayanan sirri.

| Tashar | Wajibi / tsari |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours mai kyau har zuwa 720, events; ana sake gina timeline daga events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Na zaɓi; docs tare da id, title, content, category |
| businessRules | Na zaɓi; abin da aka amince da shi na dokoki, wanda aka tsara a matsayin runbook |

`userState.userId` dole ne ya zama daidai da asalin da aka bayar. **`userState.tenantId` shine mai haya na dandamali**, ba ID na ƙungiya/shago a cikin abokin ciniki ba. Bambance-bambance suna dawo da 403. Ana iya canza bayanai a cikin browser; mahallin baya ba da izinin ayyuka.

## 7. Filaye, iyakoki da daidaitawa

| Tsari | Babban filaye / dokoki |
| --- | --- |
| entities | type, status; id/description na zaɓi; metadata abu; har zuwa 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; har zuwa 100 |
| errorClass na activeErrors | validation, permission, infra ko business; nau'ikan kamar payment suna buƙatar taswira |
| events | ts, event, page; elementId, intent, correlationRequestId suna karɓar null/ƙetare; har zuwa 1,000 |
| recentRequests | ts, route, httpStatus cikakke, timingMs, requestId; errorCode/resourceId na iya zama null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs lamba ko null; errorCode/lastStage na iya zama null |
| status na jobs | queued, running, succeeded, failed, canceled |
| errors daga backend | ts, errorCode, errorClass string, route, requestId; resourceId na iya zama null |
| docs | Har zuwa 50; content har zuwa haruffa 32,000, sauran rubutun har zuwa 4,096 |

Kwanakin sune strings ISO-8601 tare da timezone; serializing Date a cikin backend. Kada a ƙirƙira updatedAt, durationMs, retryable ko nau'ikan don kawai a wuce schema: yi amfani da ainihin tushen ko ƙetare rikodin kuma sanar da rashin samun tushen. Yi rikodin takamaiman taswirar aikinku a cikin karɓa.

Girman mahallin da aka aiko: **262.144 bytes UTF-8 (256 KiB)**. Cikakken HTTP yana ci gaba da iyakancewa zuwa 1.048.576 bytes. Kasafin kuɗin hoton yana `min(maxContextBytes, 262144)`. Idan har ma muhimmin ɓangaren bai dace ba, buƙatar ta gaza; rage metadata/takardu a bayan fage. Muna ba da shawarar farawa da 48 KiB, abubuwa goma da ɗan gajeren ilimi.

Sabar tana tace abubuwan da suka faru/logs ta mafi ƙarancin taga tsakanin wanda aka nema da na mai haya, tana cire kwanakin gaba kuma tana amfani da maxLogLines haɗe da buƙatun, kurakurai da jobs (a wannan tsari). maxDocs yana iyakance jerin docs; businessRules littafi ne na gudanarwa daban kuma yana cinye jimlar kasafin kuɗi. Lokacin yana bin abubuwan da aka kiyaye. Ƙananan bayanai masu dacewa yawanci suna samar da ingantaccen ganewar asali da ƙarancin farashi.

## 8. Sirri da dorewa

Tsara bayanai kafin a aiko su: kada a taɓa tura headers, cookies, JWTs, takardun shaida, igiyoyin haɗi, URLs masu sa hannu, abun ciki na binary, bayanan wasu masu amfani ko fitarwa marasa tsari. Sauya sirri da nassoshi masu tallafawa. Kada a aiko da PRD gabaɗaya ko cikakkun logs a matsayin tushen ilimi.

Sabbin hotuna suna wucewa ta ingantawa, gyarawa, ragewa da kasafin kuɗi kafin a rubuta su. Saƙonni da sakamakon kayan aiki suna da maganin sanannun tsarin sirri. Wannan kariya ce ta ƙari: ba mai rarraba bayanan sirri ba ce, ba ta gyara bayanan tarihi a baya kuma ba ta maye gurbin tsarin abokin ciniki ba.

Mahaɗin shine hoton farkon tattaunawar, ba tambaya ta ainihin lokaci ba. Sanar da timestamps da tushe. `updateContext()` yana aiki don shari'ar gaba; don bayanan yanzu yayin tattaunawa, yi amfani da kayan aikin karatu da aka amince da su.

## 9. Frontend da SDK 0.3.0

Bada SDK da aka gyara daga kunshin ko daga URL na jama'a. Bincika SHA-256 tare da `widget.manifest.json`. Guji rubutun da aka maimaita, sigar da ke shawagi da cache na JWT. Mai sarrafa nuni a `widget-controller.mjs` yana haɗawa bayan bootstrap, yana jira onOpen, yana sabuntawa kuma yana hana haɗawa da latti bayan fita.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// A lokacin fita, canjin mutum/kamfani/rawar da tsaftacewar sashi:
controller.destroy();
```

Ayyukan da ke sama sune kiran baya na aikace-aikacen, don aiwatarwa tare da abokin cinikin ku na HTTP na yau da kullun. Bootstrap yana dawo da `{jwt,tenantKey,expiresIn,context}`. getContext yana dawo da abin mahallin. A cikin React, daidaita kiran baya tare da useCallback kuma haɗa a useEffect da aka haɗa da asali. Kada a sanya widget ɗin a waje da yankin da aka tabbatar ko kuma a ba da baƙi tare da userId da aka raba.

SDK yana karɓar `onTokenRefresh` wanda ke dawo da sabon JWT; bayan 401, yana maimaita buƙatar sau ɗaya. Sabuntawa yana buƙatar amfani da mutum ɗaya. Canjin asali yana buƙatar lalata da farawa. Idan an yi amfani da mai ƙidayar lokaci mai aiki, fi son kusan mintuna goma tare da jitter kuma soke a lokacin tsaftacewa. Kurakuran bootstrap, tattarawa da samfuri bai kamata su toshe babban aikace-aikacen ba.

## 10. Fita, izini da tarihi

`destroy()` yana soke kira kuma yana cire ci gaba na gida ta mai haya/mutum. Ba soke mutum ɗaya bane a kan sabar. Wani JWT da aka riga aka kwafa zai iya kasancewa mai inganci har zuwa minti 15 bayan fita/kullewa a kan abokin ciniki. Idan ana buƙatar soke nan take ta mutum, kwangilar tana buƙatar ƙarin ci gaba; kada a yi amfani da juyawar mai haya gaba ɗaya a matsayin fita ta al'ada.

Kowane karatu/rubutu na tattaunawa yana buƙatar mai shi ɗaya da mai haya ɗaya. Canjin rawa a kan abokin ciniki baya share abun ciki da mutumin ya riga ya karɓa a cikin tattaunawar. Saita manufar tarihi don rage izini da canje-canjen ƙungiya. Kada a sassauta izini don dawo da tsohon caseId; duba asalin batun ko fara sabuwar tattaunawa.

## 11. CORS, CSP, PWA da samun dama

Bada izinin asalin kowane gaba a kan dandamali. SDK yana buƙatar connect-src don tallafi; hidimar fayil ɗin gida yana ba da izinin script-src kai. SDK yana allura salo a cikin Shadow DOM kuma har yanzu baya karɓar nonce: tabbatar da ainihin manufar CSP, wanda zai iya buƙatar ci gaba na SDK don salo na waje/nonce/hash. Kada a kashe manufar gaba ɗaya.

Zama da mahallin sune no-store. Cire hanyoyin tallafi daga caches na PWA, ci gaba na tambayoyi da kayan aikin sake kunnawa. Gwada madannai, mai da hankali, mai karanta allo, zuƙowa da wayar hannu. Gabatar da ainihin tashar mutum a cikin aikace-aikacen, tare da tabbatar da lokaci/URL. SDK baya ƙirƙira mai ba da sabis.

## 12. Sabar MCP a cikin zama

Bayanin aikace-aikacen yana aika `POST /api/widget/sessions` tare da takardar shaidar haɗin kai `sik_`. Yana samo mutumin da ƙungiyarsa daga shiga kuma yana iya haɗawa da sabar har takwas a cikin `mcpServers`. Filin da aka bari ko fanko yana ƙirƙira hira tare da mahallin. Kowane sabon zama yana karɓar jerin nasa.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Kowane id yana farawa da ƙaramin harafi kuma yana karɓar ƙananan haruffa, lambobi, ƙaramin layi da alamar haɗi, har zuwa haruffa 32. IDs, URLs da aka daidaita da alamomi suna da keɓantacce a cikin jerin. Sufuri shine MCP Streamable HTTP a cikin HTTPS na jama'a, tashar jiragen ruwa 443, tare da URL ba tare da takardun shaida ba, tambaya ko yanki. Sabis ɗin yana duba DNS lokacin haɗawa kuma yana ƙin turawa.

Aikace-aikacen yana bayarwa ko samun ɗan gajeren alamar shiga don kowane wuri, an iyakance shi ga mutum, ƙungiya, izini da masu sauraro na wannan MCP. Support AI yana gabatar da `Authorization: Bearer <accessToken>` ga sabar da ta dace. Mai bayarwa yana duba sa hannu ko introspeksi, mai bayarwa, inganci, masu sauraro da samun dama ga albarkatu a kowane aiki. Yana bugawa a cikin kasida kawai kayan aikin da aka ba da izini don wannan asalin. Takardar shaidar dandamali, JWT na widget da maɓallan sabis kamar Stripe suna da manufofinsu.

Alamar da aka ba da izini tana ɓoye a kan sabar har zuwa daƙiƙa 900. Mai bincike yana karɓar `{jwt, tenantKey, expiresIn: 900}`. Lokacin sabuntawa, bayanai yana sake tabbatar da asalin kuma yana aika sabon jerin tare da alamomi masu inganci. Shawarar da aka ƙirƙira kafin sabuntawa tana buƙatar sake gabatarwa. Don canjin ƙungiya, yi amfani da mai gano abubuwa mai dorewa ta hanyar haɗi kuma lalata tsohuwar misalin widget.

AI mai Taimako Support AI yana bincika shafukan `tools/list`, yana bambanta sunaye iri ɗaya ta hanyar sabar kuma yana amfani da sunan asali lokacin kiran `tools/call`. Kataloji masu kayan aiki sama da 32 suna da bincike da shafuka a cikin taɗi. Iyakokin gano sabar sune shafuka 128 da 4 MB na bayani. Rashin gano sabar ɗaya yana kiyaye sauran.

Ana iya tuntuɓar kayan aiki tare da `annotations.readOnlyHint: true` kai tsaye. Ga kowane kayan aiki da babu bayanin ko kuma ba daidai ba ne, taɗi yana nuna sabar, suna da hujjoji kafin aiwatarwa. Bayyana karatu kawai don ayyukan da ba su da tasirin kasuwanci. Mai amfani yana amsa `confirmar` ko `confirm` ga saƙon da aka nuna a cikin minti biyar. SDK yana aikawa `replyToMessageId`. Tabbatarwa tana aiki ga waɗannan hujjoji, sabar, zama da tattaunawa. Sabon shawara yana maye gurbin na baya.

Dandalin yana yin yunƙurin aiwatarwa bayan yin rajistar tabbatarwa kuma yana aikawa `Idempotency-Key` tare da ID na shawarar. Don biyan kuɗi da ayyukan da ke da tasirin waje, mai bayarwa dole ne ya adana maɓalli da sakamako a atomatik kuma ya mutunta maɓallan idempotency da sabis ɗin kuɗi ke buƙata. Bayan lokaci ya ƙare ko sakamako mara tabbas, tallafi yana yin rajistar yanayin da ba a sani ba, yana toshe sabbin canje-canje a cikin wannan tattaunawar kuma yana kiyaye tambayoyi. Bincika aikin a cikin tsarin asali kafin ci gaba.

Don tabbatarwa, gwada zama ba tare da sabar ba, zaman biyu na mai amfani ɗaya, ƙungiyoyi biyu, sabar tare da kayan aiki iri ɗaya da kataloji mai shafuka. Bincika iyaka/ƙarewar alamun a cikin mai bayarwa, soke da tabbatarwa sau biyu. Yi amfani da rajistar roba don bincika sakamakon a asali.

## 13. Samfuri, umarni da ilimi

Kiyaye samfurin da aikin ya riga ya tabbatar da shi da farko yana rage canje-canje lokaci guda. Don sabon kimantawa, `openai/gpt-4.1-mini` ɗan takara ne mai dacewa da sigogin yanzu: Chat Completions ta hanyar OpenRouter, zafin jiki 0.3 da max_tokens 2048. Tabbatar a ainihin asusun kafin kunnawa. Preferred Model ya fi Model Policy; auto ba hanyar da ta dace ba ce. Farashi/kuɗi dole ne su fito daga mai bayarwa; tsofaffin ƙididdigar daga kwamitin na iya bambanta.

Filin **AI Instructions / Custom instructions** yana karɓar haruffa 2,000 masu inganci. Liƙa kawai `PROMPT-TENANT.txt`; bincika sunaye, tashar da ka'idodin samfurin. Kada a liƙa takardun shaida ko haɗa takardu a cikin wannan filin. Umarnin yana ƙarin ga ka'idodin dandalin; baya ba da izini ko kunna kayan aiki.

Umarnin da aka bayar yana jagorantar amsoshi a cikin harshe da rubutun da mutum ya zaɓa, gaskiya da aka raba daga zato, mutunta izini, amfani da amintattun bayanai, rashin alkawuran ayyuka da tashar ɗan adam. `knowledgePack.docs` dole ne ya ƙunshi gajerun littattafan aiki da aka yi amfani da su tare da mai alhakin: kurakurai akai-akai, ganewar asali, iyakokin samfurin da yadda za a tabbatar da sakamako. Rajista da takardu bayanai ne, ba umarni ba ne don canza ka'idodin mataimakin.

Tushen samfuri: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) da [kasida OpenRouter](https://openrouter.ai/api/v1/models), an duba su a shirye-shiryen baya na 14/09/2026. Sake tabbatar da samuwa/farashi lokacin aiwatarwa; babu kwatancen samfura da aka biya a cikin wannan kit ɗin.

## 14. Yarjejeniyar kuskure da bincike

| Amsa | Ma'ana / aiki |
| --- | --- |
| 401 a mai fitarwa | sik ya ɓace, ba daidai ba ne ko an soke shi; gyara saitin |
| 400 a mai fitarwa | Jiki ya fita daga yarjejeniya; cire ƙarin filaye |
| 401 a cikin shari'o'i | Sa hannu na gado, ƙarewa, da'awar mara inganci ko zaman da aka soke |
| 400 a cikin shari'o'i | Yanayin da ake buƙata mara inganci, kwanakin/jihohi marasa daidai ko kasafin kuɗi ya wuce |
| 403 daga mahallin | userState bai dace da mai haya/mutum na JWT ba |
| 404 a cikin tattaunawa | Albarkatu babu ko mallakar wani; kar a tilasta shiga |
| 429 | Iyakance; backoff/jitter, babu madauki na fitarwa |
| 500/502/503 | Kuskuren kayan aiki, samfuri ko mahallin; sanar da rashin samuwa da requestId |
| 501 a kan ayyuka/haɓakawa | Aiki ba tare da mai aiwatarwa/mai haɗawa ba; yi amfani da ainihin tashar mutum |
| Chat yana aiki, MCP baya aiki | Duba jerin da aka aika a fitarwa ta ƙarshe, inganci, masu sauraro da amsar kasida. |
| Kayan aiki ya ɓace | Duba kasidar da ke akwai don alamar da aka ba da izini da haɗin haɗin uwar garken. |

Kar a yi amfani da HTTP 200 kawai azaman karɓa: duba abun ciki na amsa da hoton allo. Ƙirƙirar da ta gaza bayan adana shari'ar na iya barin shari'ar ba tare da amsa ba; kar a ɗauka cewa ma'amala ta shafi kiran samfurin. Dole ne a iyakance sake gwadawa kuma a sanar da mai amfani. Yi rikodin hanya, hanyar da aka tsara, status, requestId da lokaci UTC; kar a taɓa kama Authorization/JWT, sirri ko ɗanyen kaya don tura bincike.

## 15. Karɓa na tilas

1. Hanyar bootstrap ba tare da shiga ba an ƙi ta kafin mai fitarwa. Ba a canza asali na bogi ba mai amfani da aka tabbatar.
2. Fitarwa tare da ingantaccen takardar shaidar yana dawo da mai haya da aka sa ran da sakan 900; sirri baya bayyana a cikin mai bincike/sake kunnawa/rajista.
3. JWT na da an ƙi shi. Sabon zaman yana ƙirƙirar tattaunawa tare da hoton allo da ainihin amsa; yana sake buɗewa ga mutum ɗaya.
4. Mutane biyu daga aiki ɗaya da masu haya biyu: GET shari'a da POST saƙonni/ra'ayi/rufe/haɓakawa/ayyuka ba sa ketare asali.
5. Yanayin ba tare da tubalan ba, asali daban, kwanan wata mara inganci da girman da ya wuce kima an ƙi su; sirrin roba baya dawwama a cikin hoton allo.
6. Sabuntawa bayan mintuna 15, fita yayin tattarawa, canjin asusu/kamfani/rawar da kewayawa ba sa dawo da tattaunawar wani.
7. Samfurin yana amsawa ta amfani da shaidu kuma yana mutunta iyakokin bincike; gazawa baya haifar da nasara bayyananne.
8. Fitar da zaman tare da sifili da sabobin biyu. Tabbatar cewa kowane wuri yana karɓar alamar sa.
9. MCP yana ƙin alamar da ba daidai ba/na da, mai haya mara daidai, mai amfani da ya ɓace/mara aiki da albarkatun wani. Gwada ID na zaman da aka sake amfani da shi, idan akwai zaman.
10. Tabbatar cewa canje-canje suna buƙatar tabbatar da shawarar kuma ba sa maimaita kansu idan akwai lokacin ƙarewa.
11. CORS/CSP, wayar hannu, madannai da tashar mutum an amince da su. An gwada juyawa da aka haɗa a cikin amincewa.

`node --test examples.test.mjs` yana inganta adaftan da aka ware tare da mocks. Ba ya maye gurbin waɗannan gwaje-gwaje na ƙarshe-zuwa-ƙarshe. Cika `ACEITE.md` tare da masu alhakin, sigogi, lokuta da shaidu ba tare da sirri ba.

## 16. Bugawa, yanke da dawo da su

Shigar da takardar shaidar haɗin kai, buga bootstrap da SDK, tabbatar da taɗi kuma amince da sabobin da aka bayyana a cikin zaman.

Kada a sake kunna tsoffin biyan kuɗi ko tura MCP na duniya don dawo da samuwa. Idan akwai gazawa, kashe widget din na ɗan lokaci ko MCP na mai haya da abin ya shafa kuma a kiyaye tashar ɗan adam yayin gyara adaftan. Kada a share tattaunawa don kauce wa 404 na mai shi.

Yi rikodin iyakokin riƙewa da takamaiman shaidar aikace-aikacen ku.

## 17. Amsa da fayilolin kunshin

Mayar da sunan aikin, mai haya, backend/frontend commits, kwanan wata UTC, SDK/hash, takardar shaidar da aka shigar (eh/a'a, babu daraja), taɗi da aka amince da shi, MCP an amince da shi/kashe, gwaje-gwaje marasa kyau, tashar ɗan adam da abubuwan da ba a warware ba. Kada a kammala da “yana kama da aiki”.

Kit ɗin jama'a ya ƙunshi wannan jagorar a cikin Markdown, tsarin sabar, mafi ƙarancin kayan aiki, adaftan mai bayarwa, tantancewa MCP, mai sarrafa gaba, SDK, sauri, gwaje-gwaje masu zaman kansu, jerin abubuwan dubawa, kwangilar ayyuka da bayanin SHA-256. Fakitin mutum ɗaya na iya ƙara takamaiman abubuwan haɗe-haɗe. Misalai ba sa aiwatar da wuraren ƙarshe na aikace-aikacen abokin ciniki ta atomatik. Sigar da za a iya bincika tana cikin https://support-ai.pontes.uk/developers?lang=ha.
