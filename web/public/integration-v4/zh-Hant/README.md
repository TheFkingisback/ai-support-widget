# AI Support Widget 入門工具

解壓縮 ZIP 檔案，並使用 Node.js 22 或更高版本執行 `node server.mjs`。開啟終端機中顯示的迴路 URL。開啟支援聊天並詢問匯入失敗的原因。回覆會識別第 42 行並顯示合成匯入和錯誤參考。重設範例以開始新的對話。

`server.mjs` 在您的電腦上提供範例。`starter/sample.js` 在瀏覽器中執行並使用本地固定資料回應。`widget.v0.3.0.js` 是固定的小工具版本。將其 SHA-256 與 `widget.manifest.json` 進行比較。

下載的範例會以本套件的語言開啟。附加 `?lang=sr-Latn`、`?lang=sr-Cyrl` 或 `?lang=ar` 以檢查其他可用的地區設定。在您的應用程式中掛載 SDK 時傳遞使用者選定的地區設定。

要整合您自己的應用程式，請移除固定指令碼並將 `createBootstrapHandler` 從 `bootstrap.mjs` 掛載到您的應用程式伺服器上，例如 `/api/support/bootstrap`。從您現有的會話中介軟體提供 `authenticate(request)`，並從您的資料層提供 `collectContext(user, tenantKey, signal)`。在 `backend.env.example` 中設定私有環境變數。使用該路由返回的令牌和上下文初始化小工具。將可選的 `handoffUrl` 設定為您的 HTTPS 人工支援頁面。遵循 [開發者中心快速入門](https://support-ai.pontes.uk/developers/quick-start?lang=zh-Hant) 以了解會話生命週期。

您的後端可以向引導處理程序提供 `getMcpServers(user, signal)`。為此已驗證的成員資格返回一個 `{id, url, accessToken}` 陣列。為每個伺服器鑄造一個短期、受眾範圍的令牌。對於僅包含上下文的聊天，請省略回調。瀏覽器僅接收小工具會話和上下文。
