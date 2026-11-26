# 支援整合 · 合約 v4

**SDK 0.3.0 · 後端、前端與操作手冊**

[TOC]

## 1. 運作方式

您的後端會驗證使用者、投射授權上下文並發出一個 15 分鐘的會話。在發出呼叫時，可以包含該人員可用的 MCP 伺服器。瀏覽器會收到小工具的 JWT 和上下文。

## 2. 環境與負責人

平台位於 https://support-ai.pontes.uk。請使用正確環境的整合憑證。工作區管理員可在儀表板中取得憑證。應用程式團隊負責維護已驗證的啟動、上下文以及每個使用者和伺服器的委託權杖。

## 3. 憑證

| 憑證 | 目的地 | 用途 |
| --- | --- | --- |
| 整合憑證 sik_ | Support AI | 在後端發出會話 |
| 每個伺服器的委託權杖 | 會話中指示的 MCP | 以已驗證人員身份呼叫工具 |
| 會話的 JWT | 聊天 API | 在小工具中開啟並繼續對話 |

將整合憑證儲存在應用程式的保險庫中。撤銷它會在下次請求時停用使用它發出的 JWTs。在後端生成委託權杖，並將每個權杖限制為一個資源、使用者和有效期。

## 4. 驗證與身份流程

```text
應用程式的已驗證會話
  → 後端驗證活動人員、組織和當前權限
  → POST /api/widget/sessions 與伺服器上的 sik_
  ← jwt + tenantKey + expiresIn
  → 後端收集並投射相同身份的上下文
  ← 瀏覽器收到帶有 Cache-Control: no-store 的會話/上下文
  → 小工具使用臨時 JWT 呼叫 /api/cases 和對話路由
```

保留客戶的歷史識別碼 `usr_...` 可避免失去對自己對話的存取權。不要使用 email、角色、設備或時間戳作為身份。如果同一使用者可以更改公司，請為每個關聯或明確的歷史記錄策略定義穩定的主體；平台按租戶 + 人員授權對話，不推斷客戶的組織。

平台會檢查簽名、發行者 `ai-support`、受眾 `ai-support-widget`、目的 `widget`、`sub=userId`、有效期和會話的活動憑證。瀏覽器不會重新簽名或更改聲明。發送給支援的角色是上下文資訊；API/MCP 的授權仍在客戶端伺服器上。

## 5. 發行者合約

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

回應 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`。在返回瀏覽器之前驗證 `tenantKey`。檔案 `backend-session.mjs` 實作了嚴格的主體、逾時、重新導向阻擋、回應限制和租戶驗證；它不能取代您的驗證中介軟體。

| 欄位 | 規則 |
| --- | --- |
| mcpServers | 最多八個物件的可選列表，每個物件具有唯一的 id、url 和 accessToken。請參閱第 12 節。 |
| userId | 必填，修剪，1–200 個字元 |
| userEmail | 有效的電子郵件，最多 254 個字元或空白；預設為空白 |
| userRoles | 最多 30 個字串，每個 1–80 個字元；預設為空列表 |
| plan | 1–80 個字元的字串；預設為 standard |

請勿在主體中傳送 tenantId、tenantKey、userName、role、purpose、exp 或其他欄位。憑證決定租戶。身分來自會話/資料庫，而非瀏覽器查詢/主體。發行者不接受使用者 JWT、管理金鑰或舊密碼來代替 `sik_`。

公共發行者在每個專案沒有使用配額。重複使用同一個人、公司和權限的有效會話，並在變更時提前過期和失效。

## 6. 必要上下文和正確身分

每個新案例都需要 `context.userState`、`context.userHistory` 和 `context.userLogs`。當查詢來源且沒有記錄時，傳送空列表；**不要將失敗的收集轉換為看似成功的空列表**。如果無法提供有效且經授權的上下文，客戶端引導應返回受控錯誤。

`context.example.json` 是最小範例。`context.schema.json` 是從伺服器使用的 Zod 模式匯出的，並非獨立編寫。在部署之前，請在後端驗證 JSON。不識別的額外欄位將被丟棄；中繼資料和規則可能包含自己的結構，受制於投影/限制。模式不證明授權，也不消除所有敏感資料。

| 區塊 | 必填/結構 |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours 正數，最大為 720，events；時間軸從 events 重建 |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | 可選；docs 包含 id、title、content、category |
| businessRules | 可選；經批准的規則物件，序列化為運行手冊 |

`userState.userId` 必須與發出的身分完全一致。**`userState.tenantId` 是平台租戶**，絕不是客戶端中的組織/商店 ID。不一致將返回 403。瀏覽器中的資料可能被篡改；上下文不授權操作。

## 7. 欄位、限制和正規化

| 結構 | 主要欄位/規則 |
| --- | --- |
| entities | type、status；id/description 可選；metadata 物件；最多 100 個 |
| activeErrors | errorCode、errorClass、retryable、userActionable、resourceId、occurredAt；最多 100 個 |
| errorClass 的 activeErrors | validation、permission、infra 或 business；像 payment 這樣的類別需要映射 |
| events | ts、event、page；elementId、intent、correlationRequestId 接受 null/省略；最多 1,000 個 |
| recentRequests | ts、route、httpStatus 整數、timingMs、requestId；errorCode/resourceId 可以是 null |
| jobs | jobId、queue、status、createdAt、updatedAt、durationMs 數字或 null；errorCode/lastStage 可以是 null |
| status 的 jobs | queued, running, succeeded, failed, canceled |
| 後端 errors | ts、errorCode、errorClass 字串、route、requestId；resourceId 可以是 null |
| docs | 最多 50 個；content 最多 32,000 個字元，其他文字最多 4,096 個字元 |

日期是帶時區的 ISO-8601 字串；在後端序列化 Date。不要為了通過模式而發明 updatedAt、durationMs、retryable 或類別：請使用真實來源或省略記錄並告知來源不可用。在驗收時記錄您的專案特定映射。

已傳送的上下文上限：**262,144 位元組 UTF-8 (256 KiB)**。完整的 HTTP 仍限制為 1,048,576 位元組。快照預算為 `min(maxContextBytes, 262144)`。如果連基本部分都不符合，請求將會失敗；請減少後端的中繼資料/文件。我們建議從 48 KiB、十個實體和簡短知識開始。

伺服器會根據請求和租戶之間較小的視窗篩選事件/日誌，移除未來日期，並將 maxLogLines 應用於請求、錯誤和 jobs（依此順序）。maxDocs 限制了 docs 列表；businessRules 是一個單獨的執行手冊，也會佔用總預算。時間軸遵循保留的事件。較少的相關資料通常會產生更好的診斷和更低的成本。

## 8. 隱私與持久性

在傳送資料之前設計資料：切勿轉發標頭、Cookie、JWTs、憑證、連接字串、簽名 URL、二進位內容、其他使用者的資料或原始匯出。用支援參考替換機密。不要將整個 PRD 或完整日誌作為知識庫傳送。

新的快照在寫入之前會經過驗證、編輯、縮減和預算。訊息和工具結果會處理已知的機密模式。此保護是補充性的：它不是萬無一失的個人資料分類器，不會追溯糾正歷史記錄，也不會取代客戶的設計。

上下文是會話開始時的快照，而不是即時查詢。請提供時間戳記和來源。`updateContext()` 適用於下一個案例；對於會話期間的當前資料，請使用經批准的讀取工具。

## 9. 前端和 SDK 0.3.0

提供來自套件或公共 URL 的固定 SDK。使用 `widget.manifest.json` 檢查 SHA-256。避免重複腳本、浮動版本和 JWT 快取。`widget-controller.mjs` 中的參考控制器在引導後組裝，等待 onOpen，更新並防止登出後延遲組裝。

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// 登出、人員/公司/角色變更和組件清理：
controller.destroy();
```

以上功能是應用程式的回調，需使用您常用的 HTTP 客戶端實作。Bootstrap 返回 `{jwt,tenantKey,expiresIn,context}`。getContext 返回上下文物件。在 React 中，使用 useCallback 穩定回調，並在與身份綁定的 useEffect 中掛載。請勿將小工具放置在未經身份驗證的區域之外，也不要為訪客提供共享的 userId。

SDK 接受 `onTokenRefresh`，它會返回新的 JWT；在 401 之後，它會重複請求一次。續訂必須使用相同的人員。身份變更需要銷毀和初始化。如果使用主動計時器，最好選擇大約十分鐘並帶有抖動，並在清理時取消。引導、收集和模型錯誤不應阻止主應用程式。

## 10. 登出、權限和歷史記錄

`destroy()` 會中止通話並移除每個租用戶/人員的本地持久性。這不是伺服器上的個人撤銷。已複製的 JWT 在客戶端登出/鎖定後，可能仍有效長達 15 分鐘。如果需要按人立即撤銷，合約需要進一步演進；不要將整個租用戶的輪換用作正常登出。

每次對話讀取/寫入都需要相同的擁有者和租用戶。客戶端中的角色變更不會清除該人員已在對話中收到的內容。設定歷史記錄策略以用於權限降級和組織變更。不要放鬆授權以恢復舊的 caseId；驗證原始主體或開始新的對話。

## 11. CORS、CSP、PWA 和存取

允許每個前端的確切來源在平台上。SDK 需要 connect-src 才能獲得支援；提供本地檔案允許 script-src self。SDK 將樣式注入 Shadow DOM，但尚未接收 nonce：批准實際的 CSP 策略，這可能需要 SDK 進一步演進以支援外部樣式/nonce/hash。不要關閉整個策略。

會話和上下文是 no-store。從 PWA 快取、查詢持久性和重播工具中排除支援路由。測試鍵盤、焦點、螢幕閱讀器、縮放和行動裝置。在應用程式中提供真實的人工管道，並確認時間/URL。SDK 不會發明服務提供者。

## 12. 會話中的 MCP 伺服器

應用程式後端使用整合憑證 `sik_` 發送 `POST /api/widget/sessions`。它從登入中派生人員及其組織，並且可以在 `mcpServers` 中包含最多八個伺服器。省略或空白的欄位會建立一個帶有上下文的聊天。每個新會話都會收到自己的列表。

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

每個 id 都以小寫字母開頭，並接受小寫字母、數字、底線和連字號，最多 32 個字元。ID、標準化 URL 和令牌在列表中是唯一的。傳輸是 MCP Streamable HTTP 在公共 HTTPS 上，埠 443，URL 不帶憑證、查詢或片段。服務在連接時驗證 DNS 並拒絕重定向。

應用程式為每個目的地發出或獲取一個短期的存取令牌，該令牌僅限於該 MCP 的人員、組織、權限和受眾。Support AI 向相應的伺服器呈現 `Authorization: Bearer <accessToken>`。提供者在每次操作中驗證簽名或內省、發行者、有效期、受眾和資源存取。它僅在目錄中發布該身份允許的工具。平台憑證、小部件的 JWT 以及 Stripe 等服務的密鑰都有其各自的用途。

委託令牌在伺服器上加密長達 900 秒。瀏覽器收到 `{jwt, tenantKey, expiresIn: 900}`。續訂時，後端會重新驗證身份並發送一個包含有效令牌的新列表。在續訂之前建立的提案需要重新提交。對於組織變更，請為每個連結使用一個穩定的識別碼，並銷毀小部件的先前實例。

「Support AI」會遍歷「`tools/list`」的頁面，透過伺服器區分同名工具，並在呼叫「`tools/call`」時使用原始名稱。包含超過 32 個工具的目錄在聊天中具有搜尋和分頁功能。每個伺服器的探索限制為 128 頁和 4 MB 的描述。一個伺服器的探索失敗不會影響其他伺服器。

具有「`annotations.readOnlyHint: true`」的工具可以直接查詢。對於所有缺少或錯誤註解的工具，聊天會在執行前顯示伺服器、名稱和參數。僅針對沒有業務影響的操作宣告唯讀。使用者在五分鐘內回覆顯示訊息「`confirmar`」或「`confirm`」。SDK 會傳送「`replyToMessageId`」。確認適用於這些參數、伺服器、會話和對話。新的提案會取代先前的提案。

平台在記錄確認後會嘗試執行，並傳送帶有提案 ID 的「`Idempotency-Key`」。對於付款和具有外部影響的操作，供應商必須原子地儲存金鑰和結果，並遵守金融服務要求的冪等金鑰。在逾時或結果不明確後，支援會記錄未知狀態，阻止該對話中的新更改，並保持查詢可用。在繼續之前，請在原始系統中檢查操作。

為了進行驗證，請測試一個沒有伺服器的會話、兩個相同使用者的會話、兩個組織、具有同名工具的伺服器以及一個分頁目錄。檢查供應商處的令牌範圍/過期、取消和重複確認。使用合成記錄來檢查原始結果。

## 13. 模型、提示和知識

最初保留專案已驗證的模型可減少同時變更。對於新的評估，「`openai/gpt-4.1-mini`」是與目前參數相容的候選模型：透過「OpenRouter」的「Chat Completions」、溫度 0.3 和「max_tokens」2048。在啟用前在真實帳戶中驗證。「Preferred Model」優先於「Model Policy」；自動不是智慧路由。價格/成本應來自供應商；面板上的舊估計可能有所不同。

「**AI Instructions / Custom instructions**」欄位最多接受 2,000 個有效字元。僅貼上「`PROMPT-TENANT.txt`」；檢查名稱、頻道和產品規則。請勿在此欄位中貼上憑證或串聯文件。此說明是對平台規則的補充；它不授予授權，也不啟用工具。

提供的提示會引導以個人選擇的語言和書寫方式回應、將事實與假設分開、尊重權限、使用安全參考、不承諾行動和人類管道。「`knowledgePack.docs`」應包含簡短且有版本控制的運行手冊，並附有負責人：常見錯誤、診斷、產品限制以及如何確認結果。日誌和文件是資料，絕不是更改助理規則的說明。

模型來源：[OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) 和 [OpenRouter](https://openrouter.ai/api/v1/models)，於 2026 年 9 月 14 日預先準備時查詢。實施時請重新確認可用性/價格；此套件中未進行付費模型比較。

## 14. 錯誤和診斷合約

| 回應 | 意義/動作 |
| --- | --- |
| 發送者處的 401 | sik 遺失、不正確或已撤銷；請更正配置 |
| 發送者處的 400 | 主體超出合約；請移除多餘欄位 |
| 案例中的 401 | 舊版簽章、過期、無效聲明或會話已撤銷 |
| 案例中的 400 | 必要上下文無效、日期/狀態不正確或預算超出 |
| 上下文的 403 | userState 與 JWT 的租戶/人員不符 |
| 對話中的 404 | 資源不存在或屬於其他身份；請勿強制存取 |
| 429 | 限制；退避/抖動，無發送循環 |
| 500/502/503 | 基礎設施、模型或上下文故障；請報告不可用性並提供 requestId |
| 動作/升級中的 501 | 功能沒有執行器/連接器；請使用真實的人工管道 |
| Chat 正常運作，MCP 不正常運作 | 檢查上次發送中傳送的列表、有效性、受眾和目錄回應。 |
| 工具遺失 | 檢查委託令牌可用的目錄和伺服器連線。 |

不要僅將 HTTP 200 作為接受：檢查回應內容和快照。在記錄案例後失敗的創建可能會導致案例沒有回應；不要假設涉及模型呼叫的交易。重試應受限制並通知用戶。記錄方法、參數化路由、status、requestId 和 UTC 時間；切勿捕獲 Authorization/JWT、秘密或原始負載以轉發診斷。

## 15. 強制接受

1. 在發送者之前拒絕沒有登錄的引導路由。偽造的身份不會改變已驗證的用戶。
2. 使用正確憑證的發送會返回預期的租戶和 900 秒；秘密不會出現在瀏覽器/重播/日誌中。
3. 舊的 JWT 被拒絕。新會話會創建帶有快照和真實回應的對話；為同一個人重新打開。
4. 來自同一專案的兩個人和兩個租戶：GET 案例和 POST 訊息/回饋/關閉/升級/動作不會交叉身份。
5. 沒有區塊、身份不同、日期無效和大小過大的上下文將被拒絕；合成秘密不會保留在快照中。
6. 15 分鐘後續訂、收集期間登出、帳戶/公司/角色變更和導航不會恢復其他人的對話。
7. 模型使用證據回應並遵守診斷限制；失敗不會產生明顯的成功。
8. 發送零個和兩個伺服器的會話。確認每個目的地都收到自己的令牌。
9. MCP 拒絕錯誤/舊令牌、錯誤租戶、用戶缺失/不活動以及其他人的資源。測試重複使用的會話 ID（如果存在會話）。
10. 確認更改需要確認提案，並且在超時情況下不會重複。
11. CORS/CSP、手機、鍵盤和人工管道已獲批准。協調輪換已在批准中測試。

`node --test examples.test.mjs` 使用模擬物件驗證隔離的轉接器。這不會取代端對端測試。填寫 `ACEITE.md`，包含負責人、版本、時間和無機密證據。

## 16. 發佈、剪切和復原

安裝整合憑證，發佈引導程式和 SDK，驗證聊天並核准會話中宣告的伺服器。

請勿重新啟用舊版訂閱或全域 MCP 轉發以恢復可用性。如果發生故障，請暫時停用受影響租戶的小工具或 MCP，並在修復轉接器時保持人工管道。請勿刪除對話以規避擁有者的 404 錯誤。

記錄保留限制和應用程式特定的證據。

## 17. 回饋和套件檔案

回覆專案名稱、租戶、後端/前端提交、UTC 日期、SDK/雜湊、已安裝憑證（是/否，無值）、已核准聊天、已核准/關閉的 MCP、負面測試、人工管道和待辦事項。請勿以「似乎有效」作結。

公共套件包含此 Markdown 指南、伺服器架構、最小夾具、發行者轉接器、MCP 身份驗證、前端控制器、SDK、提示、隔離測試、清單、動作合約和 SHA-256 清單。個別套件可以添加特定附件。範例不會自動實作客戶端應用程式的端點。可瀏覽版本位於 https://support-ai.pontes.uk/developers?lang=zh-Hant。
