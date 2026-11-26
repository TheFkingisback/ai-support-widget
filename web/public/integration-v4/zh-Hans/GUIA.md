# 支持集成 · 合同 v4

**SDK 0.3.0 · 后端、前端和操作手册**

[TOC]

## 1. 工作原理

您的后端对用户进行身份验证，投射授权上下文，并发出一个 15 分钟的会话。在发出调用时，可以包含该人员可用的 MCP 服务器。浏览器接收小部件的 JWT 和上下文。

## 2. 环境和责任

平台位于 https://support-ai.pontes.uk。使用正确环境的集成凭据。工作区管理员在面板中获取凭据。应用程序团队维护经过身份验证的引导程序、上下文以及每个用户和服务器的委托令牌。

## 3. 凭据

| 凭据 | 目的地 | 用途 |
| --- | --- | --- |
| 集成凭据 sik_ | Support AI | 在后端发出会话 |
| 每个服务器的委托令牌 | 会话中指示的 MCP | 以经过身份验证的人员身份调用工具 |
| 会话的 JWT | 聊天的 API | 在小部件中打开和继续对话 |

将集成凭据存储在应用程序的保险库中。撤销它会在下次请求时禁用使用它发出的 JWTs。在后端生成委托令牌，并将每个令牌限制为一个资源、用户和有效期。

## 4. 身份验证和身份流

```text
应用程序的已验证会话
  → 后端验证活动人员、组织和当前权限
  → POST /api/widget/sessions 与服务器上的 sik_
  ← jwt + tenantKey + expiresIn
  → 后端收集并投射相同身份的上下文
  ← 浏览器接收带有 Cache-Control: no-store 的会话/上下文
  → 小部件使用临时 JWT 调用 /api/cases 和对话路由
```

保留客户的历史标识符 `usr_...` 可避免失去对其自身对话的访问权限。不要使用 email、角色、设备或时间戳作为身份。如果同一用户可以更改公司，则通过绑定或明确的历史记录策略定义稳定的主题；平台通过租户 + 人员授权对话，而不推断客户的组织。

平台验证签名、颁发者 `ai-support`、受众 `ai-support-widget`、目的 `widget`、`sub=userId`、有效期和会话的活动凭据。浏览器不重新签名或更改声明。发送给支持的角色是上下文信息；API/MCP 的授权仍在客户端服务器上进行。

## 5. 颁发者合同

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

200 响应：`{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`。在返回给浏览器之前验证 `tenantKey`。文件 `backend-session.mjs` 实现了严格的主体、超时、重定向阻止、响应限制和租户验证；它不能替代您的身份验证中间件。

| 字段 | 规则 |
| --- | --- |
| mcpServers | 可选列表，最多包含八个具有唯一 id、url 和 accessToken 的对象。参见第 12 节。 |
| userId | 必填，修剪，1-200 个字符 |
| userEmail | 有效的电子邮件，最多 254 个字符或为空；默认为空 |
| userRoles | 最多 30 个字符串，每个 1-80 个字符；默认为空列表 |
| plan | 字符串，1-80 个字符；默认为 standard |

请勿在正文中发送 tenantId、tenantKey、userName、role、purpose、exp 或其他字段。凭据决定租户。身份来自会话/数据库，而非浏览器查询/正文。颁发者不接受用户 JWT、管理密钥或旧密钥来代替 `sik_`。

公共颁发者无需按项目使用配额即可运行。重复使用同一人员、公司和权限的有效会话，并在更改时提前过期和失效。

## 6. 必需的上下文和正确的身份

每个新案例都需要 `context.userState`、`context.userHistory` 和 `context.userLogs`。如果已查询源且没有记录，则发送空列表；**不要将失败的收集转换为看起来成功的空列表**。如果无法提供有效且已授权的上下文，则客户端引导应返回受控错误。

`context.example.json` 是最小示例。`context.schema.json` 是从服务器使用的 Zod 模式导出的，并非独立编写。在部署前在后端验证 JSON。未识别的额外字段将被丢弃；元数据和规则可能包含自己的结构，受限于投影/限制。模式不证明授权，也不消除所有敏感数据。

| 块 | 必需 / 结构 |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours 正数，最大 720，events；时间线从 events 重建 |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | 可选；docs 包含 id、title、content、category |
| businessRules | 可选；已批准的规则对象，序列化为运行手册 |

`userState.userId` 必须与颁发的身份完全一致。**`userState.tenantId` 是平台租户**，绝不是客户端的组织/商店 ID。不一致将返回 403。浏览器中的数据可能被篡改；上下文不授权操作。

## 7. 字段、限制和规范化

| 结构 | 主要字段 / 规则 |
| --- | --- |
| entities | type、status；id/description 可选；metadata 对象；最多 100 个 |
| activeErrors | errorCode、errorClass、retryable、userActionable、resourceId、occurredAt；最多 100 个 |
| activeErrors 的 errorClass | validation、permission、infra 或 business；payment 等类别需要映射 |
| events | ts、event、page；elementId、intent、correlationRequestId 接受 null/省略；最多 1,000 个 |
| recentRequests | ts、route、httpStatus 整数、timingMs、requestId；errorCode/resourceId 可以是 null |
| jobs | jobId、queue、status、createdAt、updatedAt、durationMs 数字或 null；errorCode/lastStage 可以是 null |
| jobs 的 status | queued, running, succeeded, failed, canceled |
| 后端的 errors | ts、errorCode、errorClass 字符串、route、requestId；resourceId 可以是 null |
| docs | 最多 50 个；content 最多 32,000 个字符，其他文本最多 4,096 个字符 |

日期是带时区的 ISO-8601 字符串；在后端序列化 Date。不要凭空捏造 updatedAt、durationMs、retryable 或类别以仅仅通过模式：使用真实来源或省略记录并告知来源不可用。在验收中记录您的项目特定映射。

发送的上下文上限：**262,144 字节 UTF-8 (256 KiB)**。完整的 HTTP 仍然限制在 1,048,576 字节。快照预算为 `min(maxContextBytes, 262144)`。如果连基本部分都无法容纳，请求将失败；请减少后端元数据/文档。建议从 48 KiB、十个实体和简短知识开始。

服务器根据请求和租户之间的较小窗口过滤事件/日志，删除未来日期，并按请求、错误和 jobs（按此顺序）应用组合的 maxLogLines。maxDocs 限制 docs 列表；businessRules 是一个单独的运行手册，也占用总预算。时间线遵循保留的事件。更少的相关数据通常会产生更好的诊断和更低的成本。

## 8. 隐私与持久性

在发送数据之前对其进行设计：切勿转发标头、Cookie、JWTs、凭据、连接字符串、签名 URL、二进制内容、其他用户的数据或原始导出。用支持引用替换秘密。不要将整个 PRD 或完整日志作为知识库发送。

新的快照在写入之前会经过验证、修订、缩减和预算。工具消息和结果会处理已知的秘密模式。此保护是补充性的：它不是万无一失的个人数据分类器，不会追溯纠正历史记录，也不能替代客户的设计。

上下文是对话开始时的快照，而不是实时查询。请提供时间戳和来源。`updateContext()` 适用于下一个案例；对于对话期间的当前数据，请使用经批准的读取工具。

## 9. 前端和 SDK 0.3.0

提供来自包或公共 URL 的固定 SDK。使用 `widget.manifest.json` 检查 SHA-256。避免重复脚本、浮动版本和 JWT 缓存。`widget-controller.mjs` 中的参考控制器在引导后挂载，等待 onOpen，刷新并防止在注销后延迟挂载。

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// 在注销、人员/公司/角色切换和组件清理时：
controller.destroy();
```

上述函数是应用程序的回调，需要使用您常用的 HTTP 客户端实现。引导返回 `{jwt,tenantKey,expiresIn,context}`。getContext 返回上下文对象。在 React 中，使用 useCallback 稳定回调，并在绑定到身份的 useEffect 中挂载。不要将小部件放置在未认证区域之外，也不要为访客提供共享的 userId。

SDK 接受返回新 JWT 的 `onTokenRefresh`；在 401 后，它会重复请求一次。刷新需要使用同一个人。身份更改需要销毁和初始化。如果使用主动计时器，最好选择大约十分钟并带有抖动，并在清理时取消。引导、收集和模型错误不应阻塞主应用程序。

## 10. 注销、权限和历史记录

`destroy()` 中止呼叫并按租户/人员删除本地持久性。它不是服务器上的个人撤销。已复制的 JWT 在客户端注销/锁定后可能保持有效长达 15 分钟。如果需要按人即时撤销，合同需要进一步演进；不要将整个租户轮换用作正常注销。

每次对话读/写都需要相同的拥有者和租户。客户端的角色更改不会删除该人员已在对话中收到的内容。设置历史记录策略以进行权限降级和组织更改。不要放松授权以检索旧的 caseId；验证原始主题或开始新对话。

## 11. CORS、CSP、PWA 和访问

允许每个前端的确切来源在平台上。SDK 需要 connect-src 来支持；提供本地文件允许 script-src self。SDK 将样式注入 Shadow DOM 并且尚未接收 nonce：批准真实的 CSP 策略，这可能需要 SDK 针对外部样式/nonce/哈希进行演进。不要关闭整个策略。

会话和上下文是 no-store。从 PWA 缓存、查询持久性和重放工具中排除支持路由。测试键盘、焦点、屏幕阅读器、缩放和移动设备。在应用程序中提供真实的人工渠道，并确认时间/URL。SDK 不会发明服务提供商。

## 12. 会话中的 MCP 服务器

应用程序后端使用集成凭据 `sik_` 发送 `POST /api/widget/sessions`。它从登录派生人员及其组织，并且可以在 `mcpServers` 中包含最多八个服务器。省略或空字段会创建具有上下文的聊天。每个新会话都会收到自己的列表。

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

每个 id 都以小写字母开头，并接受小写字母、数字、下划线和连字符，最多 32 个字符。ID、规范化 URL 和令牌在列表中是唯一的。传输是公共 HTTPS 上的 MCP Streamable HTTP，端口 443，URL 不带凭据、查询或片段。服务在连接时验证 DNS 并拒绝重定向。

应用程序为每个目标发出或获取一个短访问令牌，该令牌仅限于该 MCP 的人员、组织、权限和受众。Support AI 向相应的服务器提供 `Authorization: Bearer <accessToken>`。提供商在每次操作中验证签名或自省、颁发者、有效期、受众和资源访问。它仅在目录中发布该身份允许的工具。平台凭据、小部件的 JWT 和 Stripe 等服务密钥具有各自的用途。

委托令牌在服务器上加密长达 900 秒。浏览器收到 `{jwt, tenantKey, expiresIn: 900}`。续订时，后端重新验证身份并发送包含有效令牌的新列表。在续订之前创建的提案需要重新提交。对于组织更改，请使用每个绑定一个稳定标识符并销毁小部件的先前实例。

Support AI 遍历 `tools/list` 页面，按服务器区分同名工具，并在调用 `tools/call` 时使用原始名称。包含超过 32 个工具的目录在聊天中支持搜索和分页。每个服务器的发现限制为 128 页和 4 MB 的描述。一个服务器的发现失败不会影响其他服务器。

带有 `annotations.readOnlyHint: true` 的工具可以直接查询。对于缺少或带有错误注释的工具，聊天会在执行前显示服务器、名称和参数。仅对没有业务影响的操作声明只读。用户在五分钟内回复显示的消息 `confirmar` 或 `confirm`。SDK 发送 `replyToMessageId`。确认适用于这些参数、服务器、会话和对话。新的提议会替换旧的提议。

平台在记录确认后尝试执行，并发送带有提议 ID 的 `Idempotency-Key`。对于支付和具有外部影响的操作，提供商必须原子地保存密钥和结果，并遵守金融服务要求的幂等性密钥。超时或结果不明确后，支持人员会记录未知状态，阻止此对话中的新更改，并保持查询可用。在继续之前，请在源系统中检查操作。

为了进行认证，请测试一个没有服务器的会话、同一用户的两个会话、两个组织、具有同名工具的服务器以及一个分页目录。验证提供商中的令牌范围/过期时间、取消和重复确认。使用合成记录来检查源中的结果。

## 13. 模型、提示和知识

最初保留项目已认证的模型可以减少同时进行的更改。对于新的评估，`openai/gpt-4.1-mini` 是一个与当前参数兼容的候选模型：通过 OpenRouter 的 Chat Completions，温度 0.3 和 max_tokens 2048。在激活前在真实账户中验证。Preferred Model 优先于 Model Policy；自动不是智能路由。价格/成本应来自提供商；旧面板估算可能存在差异。

**AI Instructions / Custom instructions** 字段最多接受 2,000 个有效字符。只粘贴 `PROMPT-TENANT.txt`；检查名称、渠道和产品规则。不要在此字段中粘贴凭据或连接文档。该指令是对平台规则的补充；它不授予授权，也不启用工具。

提供的提示指导助手以用户选择的语言和书写方式进行回复，将事实与假设分开，尊重权限，使用安全参考，不承诺采取行动，并提供人工渠道。`knowledgePack.docs` 应包含简短且版本化的运行手册，并注明负责人：常见错误、诊断、产品限制以及如何确认结果。日志和文档是数据，绝不是修改助手规则的指令。

模型来源：[OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) 和 [OpenRouter 目录OpenRouter](https://openrouter.ai/api/v1/models)，于 2026 年 9 月 14 日预备时查阅。实施时请重新确认可用性/价格；此工具包中未进行有偿模型比较。

## 14. 错误和诊断合同

| 响应 | 含义/操作 |
| --- | --- |
| 发件人处 401 | sik 缺失、不正确或已撤销；请更正配置 |
| 发件人处 400 | 正文超出合同范围；请删除多余字段 |
| 案例处 401 | 旧签名、过期、无效声明或会话已撤销 |
| 案例处 400 | 必需上下文无效、日期/状态不正确或超出预算 |
| 上下文处 403 | userState 与 JWT 的租户/人员不匹配 |
| 对话处 404 | 资源不存在或属于其他身份；请勿强制访问 |
| 429 | 速率限制；退避/抖动，无发出循环 |
| 500/502/503 | 基础设施、模型或上下文故障；请报告不可用性并提供 requestId |
| 操作/升级处 501 | 功能无执行器/连接器；请使用真实人工渠道 |
| Chat 正常工作，MCP 不正常工作 | 检查上次发出时发送的列表、有效性、受众和目录响应。 |
| 工具缺失 | 检查委托令牌的可用目录和服务器连接。 |

不要仅将 HTTP 200 作为接受：检查响应内容和快照。在记录案例后失败的创建可能会留下一个没有响应的案例；不要假设涉及模型调用的事务。重试应受限制并通知用户。记录方法、参数化路由、status、requestId 和 UTC 时间；切勿捕获 Authorization/JWT、秘密或原始负载以转发诊断。

## 15. 强制接受

1. 引导路由在发件人之前拒绝未登录。伪造身份不会更改已认证用户。
2. 使用正确凭据发出返回预期租户和 900 秒；秘密不会出现在浏览器/重放/日志中。
3. 旧 JWT 被拒绝。新会话创建带有快照和真实响应的对话；为同一个人重新打开。
4. 来自同一项目的两个人以及两个租户：GET 案例和 POST 消息/反馈/关闭/升级/操作不会交叉身份。
5. 没有块的上下文、不同身份、无效日期和过大大小的上下文被拒绝；合成秘密不会保留在快照中。
6. 15 分钟后刷新、收集期间注销、更改帐户/公司/角色和导航不会恢复其他人的对话。
7. 模型使用证据进行响应并遵守诊断限制；失败不会产生表面上的成功。
8. 使用零个和两个服务器发出会话。检查每个目标是否收到自己的令牌。
9. MCP 拒绝错误的/旧的令牌、错误的租户、缺失的/不活跃的用户以及其他人的资源。测试重复使用的会话 ID（如果存在会话）。
10. 确认更改需要提案确认，并且在超时情况下不会重复。
11. CORS/CSP、手机、键盘和人工渠道已获批准。协调轮换已在批准中测试。

`node --test examples.test.mjs` 使用模拟对象验证隔离的适配器。它不能替代这些端到端测试。填写 `ACEITE.md`，包括负责人、版本、时间戳和无秘密的证据。

## 16. 发布、剪切和恢复

安装集成凭据，发布引导程序和 SDK，验证聊天并批准会话中声明的服务器。

不要重新激活旧订阅或全局 MCP 转发以恢复可用性。如果发生故障，请暂时禁用受影响租户的 widget 或 MCP，并在修复适配器时保持人工渠道。不要删除对话以规避所有者 404 错误。

记录保留限制和您的应用程序的特定证据。

## 17. 反馈和包文件

返回项目名称、租户、后端/前端提交、UTC 日期、SDK/哈希、已安装的凭据（是/否，无值）、已批准的聊天、已批准/关闭的 MCP、负面测试、人工渠道和待办事项。不要以“似乎有效”结束。

公共工具包包含此 Markdown 指南、服务器模式、最小夹具、发布者适配器、MCP 身份验证、前端控制器、SDK、提示、隔离测试、清单、操作合同和 SHA-256 清单。单个包可以添加特定附件。示例不会自动实现客户端应用程序的端点。可浏览版本位于 https://support-ai.pontes.uk/developers?lang=zh-Hans。
