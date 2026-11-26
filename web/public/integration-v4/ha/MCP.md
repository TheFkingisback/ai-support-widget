# MCP a kowane zama

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
