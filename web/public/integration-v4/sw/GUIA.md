# Ujumuishaji wa usaidizi · mkataba v4

**SDK 0.3.0 · Mwongozo wa backend, frontend na uendeshaji**

[TOC]

## 1. Jinsi inavyofanya kazi

Backend yako inathibitisha mtumiaji, inaweka muktadha ulioidhinishwa na kutoa kikao cha dakika 15. Katika simu ya kutoa, inaweza kujumuisha seva za MCP zinazopatikana kwa mtu huyo. Kivinjari kinapokea JWT ya wijeti na muktadha.

## 2. Mazingira na wahusika

Jukwaa liko https://support-ai.pontes.uk. Tumia kitambulisho cha ujumuishaji cha mazingira sahihi. Msimamizi wa nafasi ya kazi anapata kitambulisho kwenye paneli. Timu ya programu inadumisha bootstrap iliyothibitishwa, muktadha na tokeni zilizokabidhiwa kwa kila mtumiaji na seva.

## 3. Vitambulisho

| Kitambulisho | Lengo | Matumizi |
| --- | --- | --- |
| Kitambulisho cha ujumuishaji sik_ | Support AI | Toa kikao kwenye backend |
| Tokeni iliyokabidhiwa kwa kila seva | MCP iliyoonyeshwa kwenye kikao | Piga zana kama mtu aliyethibitishwa |
| JWT ya kikao | API ya gumzo | Fungua na uendelee mazungumzo kwenye wijeti |

Hifadhi kitambulisho cha ujumuishaji kwenye hifadhi ya programu. Kukibatilisha huzima JWTs zilizotolewa nacho kwenye ombi linalofuata. Tengeneza tokeni zilizokabidhiwa kwenye backend na uweke kikomo kila moja kwa rasilimali, mtumiaji na muda wa uhalali.

## 4. Mtiririko wa uthibitishaji na utambulisho

```text
Kikao cha programu kilichothibitishwa
  → backend inathibitisha mtu anayefanya kazi, shirika na ruhusa za sasa
  → POST /api/widget/sessions na sik_ kwenye seva
  ← jwt + tenantKey + expiresIn
  → backend inakusanya na kuweka muktadha wa utambulisho HUO HUO
  ← kivinjari kinapokea kikao/muktadha na Cache-Control: no-store
  → wijeti inaita /api/cases na njia za mazungumzo na JWT ya muda
```

Kuhifadhi kitambulisho cha kihistoria cha mteja `usr_...` huzuia kupoteza ufikiaji wa mazungumzo yao wenyewe. Usitumie email, jukumu, kifaa au timestamp kama utambulisho. Ikiwa mtumiaji yule yule anaweza kubadilisha kampuni, weka somo thabiti kwa uhusiano au sera wazi ya historia; jukwaa linaidhinisha mazungumzo kwa mpangaji + mtu, bila kudhani mashirika ya mteja.

Jukwaa linathibitisha saini, mtoaji `ai-support`, hadhira `ai-support-widget`, kusudi `widget`, `sub=userId`, uhalali na kitambulisho kinachotumika cha kikao. Kivinjari hakisaini upya wala kubadilisha madai. Majukumu yaliyotumwa kwa usaidizi ni habari ya muktadha; idhini ya API/MCP inaendelea kwenye seva ya mteja.

## 5. Mkataba wa mtoaji

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Jibu 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Thibitisha `tenantKey` kabla ya kurudisha kwenye kivinjari. Faili `backend-session.mjs` inatekeleza mwili mkali, muda wa kuisha, kuzuia uelekezaji upya, kikomo cha jibu na uthibitishaji wa mpangaji; haibadilishi middleware yako ya uthibitishaji.

| Sehemu | Sheria |
| --- | --- |
| mcpServers | Orodha ya hiari ya hadi vitu nane na id, url na accessToken za kipekee. Tazama sehemu ya 12. |
| userId | Inahitajika, punguza, herufi 1–200 |
| userEmail | Barua pepe halali hadi herufi 254 au tupu; chaguo-msingi tupu |
| userRoles | Hadi nyuzi 30 za herufi 1–80; orodha tupu chaguo-msingi |
| plan | Mfuatano wa herufi 1–80; chaguo-msingi standard |

Usitume tenantId, tenantKey, userName, role, purpose, exp au sehemu zingine kwenye body. Kitambulisho huamua mpangaji. Utambulisho hutoka kwenye kipindi/database, si kutoka kwenye swala/body ya kivinjari. Mtoaji hakubali JWT ya mtumiaji, ufunguo wa usimamizi, au siri ya zamani badala ya `sik_`.

Mtoaji wa umma hufanya kazi bila upendeleo wa matumizi kwa kila mradi. Tumia tena kipindi ambacho bado ni halali cha mtu yule yule, kampuni, na ruhusa, na kumalizika mapema na kutobatilisha mabadiliko.

## 6. Muktadha wa lazima na utambulisho sahihi

Kila kesi mpya inahitaji `context.userState`, `context.userHistory` na `context.userLogs`. Tuma orodha tupu wakati chanzo kiliulizwa na hakuna rekodi; **usibadilishe mkusanyiko ulioshindwa kuwa orodha tupu inayoonekana kufanikiwa**. Ikiwa huwezi kutoa muktadha halali na ulioidhinishwa, kuanzisha mteja kunapaswa kurudisha kosa lililodhibitiwa.

`context.example.json` ni mfano mdogo. `context.schema.json` ilisafirishwa kutoka schema Zod iliyotumiwa kwenye seva, haikuandikwa kwa kujitegemea. Thibitisha JSON kwenye backend kabla ya kupeleka. Sehemu za ziada zisizotambuliwa zimetupwa; metadata na sheria zinaweza kuwa na miundo yao wenyewe, kulingana na makadirio/mipaka. Schema haithibitishi idhini wala kuondoa data zote nyeti.

| Kizuizi | Inahitajika / muundo |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours chanya hadi 720, events; ratiba inajengwa upya kutoka events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Hiari; docs na id, title, content, category |
| businessRules | Hiari; kitu cha sheria kilichoidhinishwa, kilichosawazishwa kama runbook |

`userState.userId` lazima iwe utambulisho uliotolewa. **`userState.tenantId` ni mpangaji wa jukwaa**, kamwe si kitambulisho cha shirika/duka kwa mteja. Tofauti hurudisha 403. Data kwenye kivinjari inaweza kubadilishwa; muktadha hauidhinishi shughuli.

## 7. Sehemu, mipaka na urekebishaji

| Muundo | Sehemu kuu / sheria |
| --- | --- |
| entities | type, status; id/description hiari; metadata kitu; hadi 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; hadi 100 |
| errorClass ya activeErrors | validation, permission, infra au business; kategoria kama payment zinahitaji ramani |
| events | ts, event, page; elementId, intent, correlationRequestId inakubali null/chaguomsingi; hadi 1,000 |
| recentRequests | ts, route, httpStatus integer, timingMs, requestId; errorCode/resourceId zinaweza kuwa null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs nambari au null; errorCode/lastStage zinaweza kuwa null |
| status ya jobs | queued, running, succeeded, failed, canceled |
| errors kutoka backend | ts, errorCode, errorClass string, route, requestId; resourceId inaweza kuwa null |
| docs | Hadi 50; content hadi herufi 32,000, maandishi mengine hadi 4,096 |

Tarehe ni strings ISO-8601 zenye timezone; sawazisha Tarehe kwenye backend. Usibuni updatedAt, durationMs, retryable au kategoria ili tu kupitisha schema: tumia chanzo halisi au acha rekodi na ujulishe kutopatikana kwa chanzo. Sajili ramani maalum za mradi wako kwenye kukubali.

Kikomo cha muktadha uliotumwa: **baiti 262,144 UTF-8 (256 KiB)**. HTTP kamili bado imepunguzwa hadi baiti 1,048,576. Bajeti ya picha ni `min(maxContextBytes, 262144)`. Ikiwa hata sehemu muhimu haitoshi, ombi litashindwa; punguza metadata/nyaraka kwenye backend. Tunashauri kuanza na KiB 48, huluki kumi na maarifa mafupi.

Seva huchuja matukio/magogo kwa dirisha dogo zaidi kati ya lililoombwa na la mpangaji, huondoa tarehe za baadaye na kutumia maxLogLines iliyounganishwa na maombi, makosa na jobs (kwa mpangilio huu). maxDocs hupunguza orodha docs; businessRules ni runbook tofauti na pia inachukua bajeti yote. Ratiba inafuata matukio yaliyohifadhiwa. Data isiyo muhimu sana mara nyingi hutoa uchunguzi bora na gharama ndogo.

## 8. Faragha na uhifadhi

Buni data kabla ya kuituma: usiwahi kusambaza vichwa, vidakuzi, JWTs, vitambulisho, nyuzi za muunganisho, URL zilizotiwa saini, maudhui ya binary, data ya watumiaji wengine au usafirishaji ghafi. Badilisha siri na marejeleo ya usaidizi. Usitume PRD nzima au magogo kamili kama msingi wa maarifa.

Picha mpya hupitia uthibitisho, uhariri, upunguzaji na bajeti kabla ya kurekodiwa. Ujumbe na matokeo ya zana hutibiwa kwa mifumo inayojulikana ya siri. Ulinzi huu ni wa ziada: si kigawanyaji kisichokosea cha data ya kibinafsi, hairekebishi rekodi za kihistoria kiotomatiki wala haibadilishi muundo wa mteja.

Muktadha ni picha ya mwanzo wa mazungumzo, si swali la wakati halisi. Toa mihuri ya muda na vyanzo. `updateContext()` inatumika kwa kesi inayofuata; kwa data ya sasa wakati wa mazungumzo, tumia zana ya kusoma iliyoidhinishwa.

## 9. Frontend na SDK 0.3.0

Toa SDK iliyobandikwa kutoka kwenye kifurushi au URL ya umma. Thibitisha SHA-256 na `widget.manifest.json`. Epuka hati rudufu, toleo linaloelea na akiba ya JWT. Kidhibiti cha marejeleo katika `widget-controller.mjs` huweka baada ya kuanzisha, husubiri onOpen, hufanya upya na kuzuia kuweka kuchelewa baada ya kuingia.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// Wakati wa kuondoka, kubadilisha mtu/kampuni/jukumu na kusafisha kijenzi:
controller.destroy();
```

Kazi zilizo hapo juu ni callbacks za programu, zitakazotekelezwa na mteja wako wa kawaida wa HTTP. Bootstrap inarudisha `{jwt,tenantKey,expiresIn,context}`. getContext inarudisha kitu cha muktadha. Katika React, thibitisha callbacks na useCallback na uweke katika useEffect iliyounganishwa na utambulisho. Usiweke wijeti nje ya eneo lililothibitishwa wala usitoe wageni na userId iliyoshirikiwa.

SDK inakubali `onTokenRefresh` ambayo inarudisha JWT mpya; baada ya 401, inarudia ombi mara moja. Usasishaji unahitaji kutumia mtu yule yule. Mabadiliko ya utambulisho yanahitaji kuharibu na kuanzisha. Ikiwa unatumia kipima muda kinachofanya kazi, pendelea takriban dakika kumi na jitter na ughairi wakati wa kusafisha. Makosa ya kuanzisha, kukusanya na mfano hayapaswi kuzuia programu kuu.

## 10. Kuondoka, ruhusa na historia

`destroy()` huondoa simu na kuondoa uhifadhi wa ndani kwa mpangaji/mtu. Sio ubatilishaji wa kibinafsi kwenye seva. JWT ambayo tayari imenakiliwa inaweza kubaki halali kwa hadi dakika 15 baada ya kuingia/kufunga kwenye mteja. Ikiwa unahitaji ubatilishaji wa haraka kwa kila mtu, mkataba unahitaji mageuzi ya ziada; usitumie mzunguko wa mpangaji mzima kama kuingia kwa kawaida.

Kila usomaji/uandishi wa mazungumzo unahitaji mmiliki na mpangaji sawa. Mabadiliko ya jukumu kwenye mteja hayaondoi maudhui ambayo mtu tayari amepokea kwenye mazungumzo. Weka sera ya historia kwa ajili ya kupunguza ruhusa na mabadiliko ya shirika. Usilegeze idhini ili kurejesha caseId ya zamani; thibitisha somo la asili au anza mazungumzo mapya.

## 11. CORS, CSP, PWA na ufikiaji

Ruhusu kwenye jukwaa chanzo halisi cha kila frontend. SDK inahitaji connect-src kwa usaidizi; kuhudumia faili ya ndani inaruhusu script-src self. SDK inaingiza mtindo kwenye Shadow DOM na bado haipokei nonce: idhinisha sera halisi ya CSP, ambayo inaweza kuhitaji mageuzi ya SDK kwa mitindo ya nje/nonce/hash. Usizime sera nzima.

Vikao na muktadha ni no-store. Ondoa njia za usaidizi kutoka kwa kache za PWA, uhifadhi wa maswali na zana za kucheza tena. Jaribu kibodi, umakini, kisoma skrini, kukuza na simu ya mkononi. Wasilisha chaneli halisi ya kibinadamu kwenye programu, na saa/URL zilizothibitishwa. SDK haibuni mtoa huduma.

## 12. Seva za MCP kwenye kikao

Backend ya programu hutuma `POST /api/widget/sessions` na kitambulisho cha ujumuishaji `sik_`. Inatoa mtu na shirika lake kutoka kwa kuingia na inaweza kujumuisha hadi seva nane katika `mcpServers`. Sehemu iliyoachwa au tupu huunda gumzo na muktadha. Kila kikao kipya hupokea orodha yake mwenyewe.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Kila id huanza na herufi ndogo na inakubali herufi ndogo, tarakimu, alama ya chini na alama ya kuunganisha, hadi herufi 32. Vitambulisho, URL zilizosanifishwa na tokeni ni za kipekee kwenye orodha. Usafiri ni MCP Streamable HTTP katika HTTPS ya umma, bandari 443, na URL bila vitambulisho, swali au kipande. Huduma inathibitisha DNS inapounganisha na kukataa uelekezaji upya.

Programu inatoa au kupata tokeni fupi ya ufikiaji kwa kila lengo, iliyozuiliwa kwa mtu, shirika, ruhusa na hadhira ya MCP hiyo. Support AI inawasilisha `Authorization: Bearer <accessToken>` kwa seva inayolingana. Mtoa huduma anathibitisha saini au utangulizi, mtoaji, uhalali, hadhira na ufikiaji wa rasilimali katika kila operesheni. Inachapisha kwenye katalogi tu zana zinazoruhusiwa kwa kitambulisho hicho. Kitambulisho cha jukwaa, JWT ya wijeti na funguo za huduma kama Stripe zina madhumuni yao wenyewe.

Tokeni iliyokabidhiwa imesimbwa kwenye seva kwa hadi sekunde 900. Kivinjari kinapokea `{jwt, tenantKey, expiresIn: 900}`. Wakati wa kusasisha, backend inathibitisha tena kitambulisho na kutuma orodha mpya na tokeni halali. Pendekezo lililoundwa kabla ya kusasisha linahitaji kuwasilishwa tena. Kwa mabadiliko ya shirika, tumia kitambulisho thabiti kwa kiungo na uharibu mfano wa awali wa wijeti.

AI ya Usaidizi Support AI hupitia kurasa za `tools/list`, hutofautisha majina yanayofanana kwa seva na hutumia jina asili wakati wa kupiga `tools/call`. Katalogi zilizo na zana zaidi ya 32 zina utafutaji na ukurasa ndani ya gumzo. Vikomo vya ugunduzi kwa kila seva ni kurasa 128 na MB 4 za maelezo. Kushindwa kwa ugunduzi wa seva moja huhifadhi zingine.

Zana zilizo na `annotations.readOnlyHint: true` zinaweza kuulizwa moja kwa moja. Kwa kila zana iliyo na ufafanuzi usio sahihi au usio sahihi, gumzo huonyesha seva, jina na hoja kabla ya kutekeleza. Tangaza kusoma tu kwa shughuli zisizo na athari za biashara. Mtumiaji hujibu `confirmar` au `confirm` kwa ujumbe ulioonyeshwa ndani ya dakika tano. SDK hutuma `replyToMessageId`. Uthibitisho ni halali kwa hoja hizo, seva, kikao na mazungumzo. Pendekezo jipya hubadilisha la awali.

Jukwaa hujaribu kutekeleza baada ya kusajili uthibitisho na kutuma `Idempotency-Key` na kitambulisho cha pendekezo. Kwa malipo na shughuli zilizo na athari za nje, mtoa huduma lazima ahifadhi ufunguo na matokeo kwa usahihi na kuheshimu funguo za utambulisho zinazohitajika na huduma ya kifedha. Baada ya muda kuisha au matokeo yasiyoeleweka, usaidizi hurekodi hali isiyojulikana, huzuia mabadiliko mapya katika mazungumzo hayo na huweka maswali yanayopatikana. Thibitisha operesheni katika mfumo wa asili kabla ya kuendelea.

Ili kuidhinisha, jaribu kikao bila seva, vikao viwili vya mtumiaji mmoja, mashirika mawili, seva zilizo na zana zenye majina sawa na katalogi iliyopangwa. Thibitisha upeo/muda wa tokeni kwa mtoa huduma, kughairi na uthibitisho mara mbili. Tumia rekodi za synthetic ili kuthibitisha matokeo katika chanzo.

## 13. Mfumo, kidokezo na maarifa

Kuhifadhi mfumo uliokwisha kuidhinishwa na mradi hupunguza mabadiliko ya wakati mmoja. Kwa tathmini mpya, `openai/gpt-4.1-mini` ni mgombea anayepatana na vigezo vya sasa: Chat Completions kupitia OpenRouter, joto 0.3 na max_tokens 2048. Thibitisha katika akaunti halisi kabla ya kuwezesha. Preferred Model inashinda Model Policy; auto si uelekezaji mahiri. Bei/gharama zinapaswa kutoka kwa mtoa huduma; makadirio ya zamani ya paneli yanaweza kutofautiana.

Sehemu ya **AI Instructions / Custom instructions** inakubali hadi herufi 2,000 halisi. Bandika `PROMPT-TENANT.txt` tu; kagua majina, chaneli na sheria za bidhaa. Usibandike vitambulisho au kuunganisha hati katika sehemu hii. Maelekezo ni nyongeza kwa sheria za jukwaa; hayatoi idhini wala kuwezesha zana.

Kidokezo kilichotolewa huongoza majibu katika lugha na uandishi uliochaguliwa na mtu, ukweli uliotenganishwa na dhana, heshima kwa ruhusa, matumizi ya marejeleo salama, kutokuwepo kwa ahadi za vitendo na chaneli ya kibinadamu. `knowledgePack.docs` inapaswa kuwa na vitabu vifupi na vilivyorekebishwa na msimamizi: makosa ya mara kwa mara, utambuzi, mipaka ya bidhaa na jinsi ya kuthibitisha matokeo. Kumbukumbu na hati ni data, kamwe si maelekezo ya kubadilisha sheria za msaidizi.

Vyanzo vya modeli: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) na [katalogi ya OpenRouter](https://openrouter.ai/api/v1/models), iliyorejelewa katika maandalizi ya awali ya 2026-09-14. Thibitisha upatikanaji/bei wakati wa utekelezaji; hakukuwa na ulinganisho wa modeli uliolipwa katika kifaa hiki.

## 14. Mkataba wa hitilafu na uchunguzi

| Jibu | Maana / hatua |
| --- | --- |
| 401 kwa mtoaji | sik haipo, si sahihi, au imebatilishwa; rekebisha usanidi |
| 400 kwa mtoaji | Mwili nje ya mkataba; ondoa sehemu za ziada |
| 401 katika kesi | Saini ya zamani, muda wake kuisha, madai batili au kikao kimebatilishwa |
| 400 katika kesi | Muktadha unaohitajika batili, tarehe/hali zisizo sahihi au bajeti imezidi |
| 403 kutoka kwa muktadha | userState hailingani na mpangaji/mtu wa JWT |
| 404 katika mazungumzo | Rasilimali haipo au ni ya kitambulisho kingine; usilazimishe ufikiaji |
| 429 | Kikomo; backoff/jitter, hakuna kitanzi cha utoaji |
| 500/502/503 | Kushindwa kwa miundombinu, modeli au muktadha; ripoti kutopatikana na requestId |
| 501 kwenye vitendo/kuongeza | Utendaji bila mtekelezaji/kiunganishi; tumia chaneli halisi ya binadamu |
| Chat inafanya kazi, MCP haifanyi kazi | Angalia orodha iliyotumwa katika toleo la mwisho, uhalali, hadhira na jibu la katalogi. |
| Zana haipo | Angalia katalogi inayopatikana kwa tokeni iliyokabidhiwa na muunganisho wa seva. |

Usitumie HTTP 200 pekee kama kukubali: angalia maudhui ya jibu na picha. Uundaji unaoshindwa baada ya kuhifadhi kesi unaweza kuacha kesi bila jibu; usidhani shughuli inayohusisha simu ya modeli. Majaribio yanapaswa kuwa na kikomo na kuripotiwa kwa mtumiaji. Sajili njia, njia iliyoparameterishwa, status, requestId na saa UTC; usiwahi kunasa Authorization/JWT, siri au malipo ghafi ili kusambaza uchunguzi.

## 15. Kukubali lazima

1. Njia ya bootstrap bila kuingia imekataliwa kabla ya mtoaji. Vitambulisho vilivyoghushiwa havibadilishi mtumiaji aliyeidhinishwa.
2. Utoaji na kitambulisho sahihi unarudisha mpangaji anayetarajiwa na sekunde 900; siri haionekani kwenye kivinjari/marudio/magogo.
3. JWT ya zamani inakataliwa. Kikao kipya huunda mazungumzo na picha na jibu halisi; hufungua tena kwa mtu yule yule.
4. Watu wawili kutoka mradi mmoja na wapangaji wawili: GET kesi na POST ujumbe/maoni/funga/ongeza/vitendo havipitani vitambulisho.
5. Muktadha bila vizuizi, kitambulisho tofauti, tarehe batili na saizi kubwa sana hukataliwa; siri za sintetiki hazidumu kwenye picha.
6. Usasishaji baada ya dakika 15, kuondoka wakati wa kukusanya, kubadilisha akaunti/kampuni/jukumu na urambazaji haurejeshi mazungumzo ya mtu mwingine.
7. Modeli hujibu kwa kutumia ushahidi na kuheshimu kikomo cha uchunguzi; kushindwa hakuzalishi mafanikio dhahiri.
8. Toa vikao na seva sifuri na mbili. Thibitisha kuwa kila lengo linapokea tokeni yake mwenyewe.
9. MCP inakataa tokeni isiyo sahihi/ya zamani, mpangaji asiye sahihi, mtumiaji asiyepo/asiyefanya kazi na rasilimali ya mtu mwingine. Jaribu kitambulisho cha kikao kilichotumiwa tena, ikiwa kuna kikao.
10. Thibitisha kuwa mabadiliko yanahitaji uthibitisho wa pendekezo na hayarudiwi katika kesi ya muda kuisha.
11. CORS/CSP, simu ya mkononi, kibodi na chaneli ya binadamu zimeidhinishwa. Mzunguko ulioratibiwa umejaribiwa katika uidhinishaji.

`node --test examples.test.mjs` huthibitisha adapta za pekee kwa kutumia mocks. Haibadilishi majaribio haya ya mwisho hadi mwisho. Jaza `ACEITE.md` na wahusika, matoleo, nyakati na ushahidi usio na siri.

## 16. Uchapishaji, ukataji na urejeshaji

Sakinisha kitambulisho cha ujumuishaji, chapisha bootstrap na SDK, thibitisha gumzo na uidhinishe seva zilizotangazwa katika vipindi.

Usianze tena usajili wa zamani au usambazaji wa MCP wa kimataifa ili kurejesha upatikanaji. Ikiwa kuna hitilafu, zima kwa muda wijeti au MCP ya mpangaji aliyeathirika na uendelee kutumia chaneli ya binadamu wakati unarekebisha adapta. Usifute mazungumzo ili kukwepa 404 ya mmiliki.

Andika mipaka ya uhifadhi na ushahidi maalum wa programu yako.

## 17. Maoni na faili za kifurushi

Rudisha jina la mradi, mpangaji, commits za backend/frontend, tarehe UTC, SDK/hash, kitambulisho kilichosakinishwa (ndiyo/hapana, bila thamani), gumzo lililoidhinishwa, MCP iliyoidhinishwa/kuzimwa, majaribio hasi, chaneli ya binadamu na mambo yanayosubiri. Usimalizie kwa “inaonekana kufanya kazi”.

Kifurushi cha umma kina mwongozo huu katika Markdown, schema ya seva, fixture ndogo, adapta ya mtoaji, uthibitishaji wa MCP, kidhibiti cha frontend, SDK, prompt, majaribio yaliyotengwa, orodha ya ukaguzi, mkataba wa vitendo na manifesto ya SHA-256. Vifurushi vya kibinafsi vinaweza kuongeza viambatisho maalum. Mifano haitekelezi kiotomatiki sehemu za mwisho za programu ya mteja. Toleo linaloweza kuvinjari liko https://support-ai.pontes.uk/developers?lang=sw.
