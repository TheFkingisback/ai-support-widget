# MCP kwa kila kipindi

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
