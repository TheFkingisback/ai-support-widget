# AI Support Widget 入门

解压 ZIP 文件，并使用 Node.js 22 或更高版本运行 `node server.mjs`。打开终端中打印的环回 URL。打开支持聊天并询问导入失败的原因。回复会识别第 42 行并显示合成导入和错误引用。重置样本以开始新的对话。

`server.mjs` 在您的计算机上提供样本。`starter/sample.js` 在浏览器中运行并使用本地夹具进行应答。`widget.v0.3.0.js` 是固定的小组件版本。将其 SHA-256 与 `widget.manifest.json` 进行比较。

下载的样本以本工具包的语言打开。附加 `?lang=sr-Latn`、`?lang=sr-Cyrl` 或 `?lang=ar` 以检查其他可用区域设置。在您的应用程序中挂载 SDK 时，传递用户选择的区域设置。

要集成您自己的应用程序，请删除夹具脚本，并将 `bootstrap.mjs` 中的 `createBootstrapHandler` 挂载到您的应用程序服务器上，例如 `/api/support/bootstrap` 路由。从您现有的会话中间件提供 `authenticate(request)`，并从您的数据层提供 `collectContext(user, tenantKey, signal)`。在 `backend.env.example` 中设置私有环境变量。使用该路由返回的令牌和上下文初始化小组件。将可选的 `handoffUrl` 设置为您的 HTTPS 人工支持页面。遵循 [开发者中心快速入门](https://support-ai.pontes.uk/developers/quick-start?lang=zh-Hans) 以了解会话生命周期。

您的后端可以向引导处理程序提供 `getMcpServers(user, signal)`。为此经过身份验证的成员资格返回一个 `{id, url, accessToken}` 数组。为每个服务器铸造一个短生命周期、受众范围的令牌。如果仅进行带上下文的聊天，则省略回调。浏览器仅接收小组件会话和上下文。
