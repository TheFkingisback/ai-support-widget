# Tích hợp hỗ trợ · hợp đồng v4

**SDK 0.3.0 · Hướng dẫn backend, frontend và vận hành**

[TOC]

## 1. Cách hoạt động

Backend của bạn xác thực người dùng, chiếu ngữ cảnh được ủy quyền và cấp một phiên 15 phút. Trong cuộc gọi cấp, nó có thể bao gồm các máy chủ MCP có sẵn cho người đó. Trình duyệt nhận JWT của tiện ích và ngữ cảnh.

## 2. Môi trường và trách nhiệm

Nền tảng nằm ở https://support-ai.pontes.uk. Sử dụng thông tin xác thực tích hợp của môi trường chính xác. Quản trị viên không gian làm việc lấy thông tin xác thực từ bảng điều khiển. Nhóm ứng dụng duy trì khởi động được xác thực, ngữ cảnh và mã thông báo được ủy quyền cho mỗi người dùng và máy chủ.

## 3. Thông tin xác thực

| Thông tin xác thực | Đích đến | Sử dụng |
| --- | --- | --- |
| Thông tin xác thực tích hợp sik_ | Support AI | Cấp một phiên trong backend |
| Mã thông báo được ủy quyền cho mỗi máy chủ | MCP được chỉ định trong phiên | Gọi các công cụ với tư cách người được xác thực |
| JWT của phiên | API của cuộc trò chuyện | Mở và tiếp tục cuộc trò chuyện trong tiện ích |

Lưu thông tin xác thực tích hợp trong kho ứng dụng. Thu hồi nó sẽ vô hiệu hóa các JWTs được cấp bằng nó trong yêu cầu tiếp theo. Tạo mã thông báo được ủy quyền trong backend và giới hạn mỗi mã thông báo cho một tài nguyên, người dùng và thời hạn hiệu lực.

## 4. Luồng xác thực và nhận dạng

```text
Phiên ứng dụng được xác thực
  → backend xác thực người đang hoạt động, tổ chức và quyền hiện tại
  → POST /api/widget/sessions với sik_ trên máy chủ
  ← jwt + tenantKey + expiresIn
  → backend thu thập và chiếu ngữ cảnh của CÙNG một nhận dạng
  ← trình duyệt nhận phiên/ngữ cảnh với Cache-Control: no-store
  → tiện ích gọi /api/cases và các tuyến hội thoại với JWT tạm thời
```

Bảo toàn định danh lịch sử `usr_...` của khách hàng để tránh mất quyền truy cập vào các cuộc trò chuyện của chính họ. Không sử dụng email, vai trò, thiết bị hoặc dấu thời gian làm nhận dạng. Nếu cùng một người dùng có thể thay đổi công ty, hãy xác định chủ đề ổn định theo liên kết hoặc chính sách lịch sử rõ ràng; nền tảng ủy quyền các cuộc trò chuyện theo tenant + người, không suy ra các tổ chức của khách hàng.

Nền tảng kiểm tra chữ ký, nhà phát hành `ai-support`, đối tượng `ai-support-widget`, mục đích `widget`, `sub=userId`, hiệu lực và thông tin xác thực phiên hoạt động. Trình duyệt không ký lại hoặc thay đổi các yêu cầu. Các vai trò được gửi đến bộ phận hỗ trợ là thông tin ngữ cảnh; ủy quyền API/MCP tiếp tục trên máy chủ khách hàng.

## 5. Hợp đồng của nhà phát hành

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Phản hồi 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Xác thực `tenantKey` trước khi trả về trình duyệt. Tệp `backend-session.mjs` triển khai nội dung nghiêm ngặt, thời gian chờ, chặn chuyển hướng, giới hạn phản hồi và xác thực tenant; nó không thay thế middleware xác thực của bạn.

| Trường | Quy tắc |
| --- | --- |
| mcpServers | Danh sách tùy chọn tối đa tám đối tượng với id, url và accessToken duy nhất. Xem phần 12. |
| userId | Bắt buộc, cắt bỏ khoảng trắng, 1–200 ký tự |
| userEmail | Email hợp lệ tối đa 254 ký tự hoặc trống; mặc định trống |
| userRoles | Tối đa 30 chuỗi 1–80 ký tự; mặc định danh sách trống |
| plan | Chuỗi 1–80 ký tự; mặc định standard |

Không gửi tenantId, tenantKey, userName, role, purpose, exp hoặc các trường khác trong phần thân. Thông tin xác thực sẽ xác định tenant. Danh tính đến từ phiên/cơ sở dữ liệu, không phải từ truy vấn/phần thân của trình duyệt. Nhà phát hành không chấp nhận JWT của người dùng, khóa quản trị hoặc bí mật cũ thay cho `sik_`.

Nhà phát hành công khai hoạt động mà không có hạn mức sử dụng cho mỗi dự án. Tái sử dụng một phiên vẫn còn hiệu lực của cùng một người, công ty và quyền hạn, với thời gian hết hạn sớm và vô hiệu hóa khi có thay đổi.

## 6. Bắt buộc phải có ngữ cảnh và danh tính chính xác

Mỗi trường hợp mới yêu cầu `context.userState`, `context.userHistory` và `context.userLogs`. Gửi danh sách trống khi nguồn đã được truy vấn và không có bản ghi; **không chuyển đổi một bộ sưu tập không thành công thành một danh sách trống có vẻ thành công**. Nếu không thể cung cấp ngữ cảnh hợp lệ và được ủy quyền, quá trình khởi tạo máy khách phải trả về lỗi được kiểm soát.

`context.example.json` là ví dụ tối thiểu. `context.schema.json` đã được xuất từ schema Zod được sử dụng trên máy chủ, không được viết độc lập. Xác thực JSON ở phần phụ trợ trước khi triển khai. Các trường bổ sung không được nhận dạng sẽ bị loại bỏ; siêu dữ liệu và quy tắc có thể chứa các cấu trúc riêng, tùy thuộc vào phép chiếu/giới hạn. Schema không chứng minh quyền ủy quyền cũng như không loại bỏ tất cả dữ liệu nhạy cảm.

| Khối | Bắt buộc / cấu trúc |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours dương đến 720, events; dòng thời gian được xây dựng lại từ events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Tùy chọn; docs với id, title, content, category |
| businessRules | Tùy chọn; đối tượng quy tắc đã được phê duyệt, được tuần tự hóa dưới dạng runbook |

`userState.userId` phải chính xác là danh tính đã được phát hành. **`userState.tenantId` là tenant của nền tảng**, không bao giờ là ID của tổ chức/cửa hàng trong máy khách. Sự khác biệt sẽ trả về 403. Dữ liệu trong trình duyệt có thể bị giả mạo; ngữ cảnh không ủy quyền các hoạt động.

## 7. Các trường, giới hạn và chuẩn hóa

| Cấu trúc | Các trường chính / quy tắc |
| --- | --- |
| entities | type, status; id/description tùy chọn; metadata đối tượng; tối đa 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; tối đa 100 |
| errorClass của activeErrors | validation, permission, infra hoặc business; các danh mục như payment yêu cầu ánh xạ |
| events | ts, event, page; elementId, intent, correlationRequestId aceitam null/omissão; até 1.000 |
| recentRequests | ts, route, httpStatus số nguyên, timingMs, requestId; errorCode/resourceId có thể là null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs số hoặc null; errorCode/lastStage có thể là null |
| status của jobs | queued, running, succeeded, failed, canceled |
| errors từ phần phụ trợ | ts, errorCode, errorClass chuỗi, route, requestId; resourceId có thể là null |
| docs | Tối đa 50; content tối đa 32.000 ký tự, các văn bản khác tối đa 4.096 |

Ngày là chuỗi ISO-8601 có múi giờ; tuần tự hóa Date ở phần phụ trợ. Không tạo ra updatedAt, durationMs, retryable hoặc các danh mục chỉ để vượt qua schema: sử dụng nguồn thực tế hoặc bỏ qua bản ghi và thông báo về việc không có sẵn nguồn. Ghi lại các ánh xạ cụ thể của dự án của bạn trong phần chấp nhận.

Contexto enviado: **262.144 bytes UTF-8 (256 KiB)**. O HTTP completo continua limitado a 1.048.576 bytes. O orçamento do snapshot é `min(maxContextBytes, 262144)`. Se nem a parte essencial couber, a solicitação falha; reduzir metadados/documentos no backend. Sugerimos começar com 48 KiB, dez entidades e conhecimento curto.

O servidor filtra eventos/logs pela menor janela entre a solicitada e a do tenant, remove datas futuras e aplica maxLogLines combinado a requests, erros e jobs (nesta ordem). maxDocs limita a lista docs; businessRules é um runbook separado e também ocupa o orçamento total. A timeline segue os eventos mantidos. Menos dados relevantes costuma produzir diagnóstico melhor e custo menor.

## 8. Privacidade e persistência

Projetar os dados antes de enviá-los: nunca encaminhar headers, cookies, JWTs, credenciais, strings de conexão, URLs assinadas, conteúdo binário, dados de outros usuários ou exportações brutas. Substituir segredos por referências de suporte. Não enviar o PRD inteiro ou logs completos como base de conhecimento.

Novos snapshots passam por validação, redação, redução e orçamento antes da gravação. Mensagens e resultados de ferramentas têm tratamento de padrões conhecidos de segredos. Essa proteção é complementar: não é um classificador infalível de dados pessoais, não corrige retroativamente registros históricos nem substitui a projeção do cliente.

O contexto é um snapshot do início da conversa, não uma consulta em tempo real. Informar timestamps e fontes. `updateContext()` vale para o próximo caso; para dados atuais durante uma conversa, usar ferramenta de leitura homologada.

## 9. Frontend e SDK 0.3.0

Servir o SDK fixado do pacote ou da URL pública. Conferir SHA-256 com `widget.manifest.json`. Evitar script duplicado, versão flutuante e cache de JWT. O controlador de referência em `widget-controller.mjs` monta após bootstrap, aguarda onOpen, renovar e impede montagem tardia após logout.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// No logout, troca de pessoa/empresa/papel e cleanup do componente:
controller.destroy();
```

As funções acima são callbacks do aplicativo, a implementar com seu cliente HTTP habitual. Bootstrap retorna `{jwt,tenantKey,expiresIn,context}`. getContext retorna o objeto de contexto. Em React, estabilizar callbacks com useCallback e montar em useEffect vinculado à identidade. Não colocar o widget fora da área autenticada nem oferecer visitantes com um userId compartilhado.

O SDK aceita `onTokenRefresh` que retorna o novo JWT; após 401, repete a requisição uma vez. Renovação precisa usar a mesma pessoa. Mudança de identidade exige destroy e init. Se usar timer proativo, preferir cerca de dez minutos com jitter e cancelar no cleanup. Erros de bootstrap, coleta e modelo não devem bloquear o aplicativo principal.

## 10. Logout, permissões e histórico

`destroy()` aborta chamadas e remove persistência local por tenant/pessoa. Não é revogação individual no servidor. Um JWT já copiado pode permanecer válido por até 15 minutos após logout/bloqueio no cliente. Se precisar de revogação imediata por pessoa, o contrato requer evolução adicional; não usar rotação de todo o tenant como logout normal.

Cada leitura/escrita de conversa exige o mesmo proprietário e tenant. Mudança de papel no cliente não apaga conteúdo que a pessoa já recebeu na conversa. Definir política de histórico para rebaixamento de permissões e mudanças de organização. Não relaxar autorização para recuperar um caseId antigo; verificar o subject original ou iniciar nova conversa.

## 11. CORS, CSP, PWA e acesso

Permitir na plataforma a origem exata de cada frontend. O SDK precisa de connect-src para o suporte; servir o arquivo local permite script-src self. O SDK injeta estilo no Shadow DOM e ainda não recebe nonce: homologar a política CSP real, podendo exigir evolução do SDK para estilos externos/nonce/hash. Não desligar a política inteira.

Sessões e contexto são no-store. Excluir rotas de suporte dos caches da PWA, persistência de queries e ferramentas de replay. Testar teclado, foco, leitor de tela, zoom e celular. Apresentar canal humano verdadeiro no aplicativo, com horário/URL confirmados. O SDK não inventa um provedor de atendimento.

## 12. Servidores MCP na sessão

O backend do aplicativo envia `POST /api/widget/sessions` com a credencial de integração `sik_`. Ele deriva a pessoa e sua organização do login e pode incluir até oito servidores em `mcpServers`. O campo omitido ou vazio cria um chat com contexto. Cada nova sessão recebe sua própria lista.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Cada id começa com uma letra minúscula e aceita letras minúsculas, dígitos, sublinhado e hífen, até 32 caracteres. IDs, URLs normalizadas e tokens são exclusivos na lista. O transporte é MCP Streamable HTTP em HTTPS público, porta 443, com URL sem credenciais, query ou fragmento. O serviço verifica o DNS ao conectar e rejeita redirecionamentos.

O aplicativo emite ou obtém um token de acesso curto para cada destino, restrito à pessoa, organização, permissões e audiência daquele MCP. O Support AI apresenta `Authorization: Bearer <accessToken>` ao servidor correspondente. O provedor verifica assinatura ou introspecção, emissor, validade, audiência e acesso ao recurso em cada operação. Ele publica no catálogo somente as ferramentas permitidas para essa identidade. A credencial da plataforma, o JWT do widget e as chaves de serviços como Stripe têm finalidades próprias.

O token delegado fica cifrado no servidor por até 900 segundos. O navegador recebe `{jwt, tenantKey, expiresIn: 900}`. Ao renovar, o backend revalida a identidade e envia uma nova lista com tokens válidos. Uma proposta criada antes da renovação precisa ser apresentada novamente. Para mudança de organização, use um identificador estável por vínculo e destrua a instância anterior do widget.

O Support AI percorre as páginas de `tools/list`, distingue nomes iguais por servidor e usa o nome original ao chamar `tools/call`. Catálogos com mais de 32 ferramentas têm busca e paginação dentro do chat. Os limites de descoberta por servidor são 128 páginas e 4 MB de descrições. Uma falha de descoberta de um servidor preserva os demais.

Ferramentas com `annotations.readOnlyHint: true` podem ser consultadas diretamente. Para toda ferramenta com a anotação ausente ou falsa, o chat mostra servidor, nome e argumentos antes de executar. Declare leitura somente para operações sem efeitos de negócio. O usuário responde `confirmar` ou `confirm` à mensagem exibida em até cinco minutos. O SDK envia `replyToMessageId`. A confirmação vale para aqueles argumentos, servidor, sessão e conversa. Uma proposta nova substitui a anterior.

A plataforma faz uma tentativa de execução após registrar a confirmação e envia `Idempotency-Key` com o ID da proposta. Para pagamentos e operações com efeitos externos, o provedor deve guardar a chave e o resultado atomicamente e respeitar as chaves de idempotência exigidas pelo serviço financeiro. Após timeout ou resultado ambíguo, o suporte registra estado desconhecido, bloqueia novas alterações nessa conversa e mantém consultas disponíveis. Confira a operação no sistema de origem antes de prosseguir.

Para homologar, teste uma sessão sem servidores, duas sessões do mesmo usuário, duas organizações, servidores com ferramentas homônimas e um catálogo paginado. Verifique escopo/expiração dos tokens no provedor, cancelamento e confirmação duplicada. Use registros sintéticos para conferir o resultado na origem.

## 13. Modelo, prompt e conhecimento

Preservar inicialmente o modelo já homologado pelo projeto reduz mudanças simultâneas. Para uma nova avaliação, `openai/gpt-4.1-mini` é um candidato compatível com os parâmetros atuais: Chat Completions via OpenRouter, temperature 0.3 e max_tokens 2048. Validar na conta real antes de ativar. Preferred Model prevalece sobre Model Policy; auto não é roteamento inteligente. Preços/custos devem vir do provedor; estimativas antigas do painel podem divergir.

O campo **AI Instructions / Custom instructions** aceita até 2.000 caracteres efetivos. Cole apenas `PROMPT-TENANT.txt`; revise nomes, canal e regras do produto. Não colar credenciais ou concatenar documentos nesse campo. A instrução é complementar às regras da plataforma; não concede autorização nem habilita ferramentas.

O prompt fornecido orienta respostas no idioma e na escrita escolhidos pela pessoa, fatos separados de hipóteses, respeito a permissões, uso de referências seguras, ausência de promessas de ações e canal humano. `knowledgePack.docs` deve conter runbooks curtos e versionados com responsável: erros frequentes, diagnóstico, limites do produto e como confirmar resultado. Logs e documentos são dados, nunca instruções para alterar as regras do assistente.

Nguồn mô hình: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) và [danh mục OpenRouter](https://openrouter.ai/api/v1/models), được tham khảo trong quá trình chuẩn bị trước ngày 14/09/2026. Xác nhận lại tính khả dụng/giá khi triển khai; không có so sánh mô hình trả phí nào trong bộ công cụ này.

## 14. Hợp đồng lỗi và chẩn đoán

| Phản hồi | Ý nghĩa / hành động |
| --- | --- |
| 401 trên trình phát hành | sik bị thiếu, không chính xác hoặc đã bị thu hồi; sửa cấu hình |
| 400 trên trình phát hành | Nội dung không đúng hợp đồng; loại bỏ các trường thừa |
| 401 trong các trường hợp | Chữ ký cũ, hết hạn, yêu cầu không hợp lệ hoặc phiên đã bị thu hồi |
| 400 trong các trường hợp | Ngữ cảnh bắt buộc không hợp lệ, ngày/trạng thái không chính xác hoặc vượt quá ngân sách |
| 403 từ ngữ cảnh | userState không khớp với người thuê/người của JWT |
| 404 trong cuộc trò chuyện | Tài nguyên không tồn tại hoặc thuộc về một danh tính khác; không ép buộc truy cập |
| 429 | Giới hạn; backoff/jitter, không lặp lại phát hành |
| 500/502/503 | Lỗi cơ sở hạ tầng, mô hình hoặc ngữ cảnh; thông báo không khả dụng và requestId |
| 501 trong các hành động/leo thang | Chức năng không có trình thực thi/kết nối; sử dụng kênh con người thực |
| Chat hoạt động, MCP không | Kiểm tra danh sách đã gửi trong lần phát hành cuối cùng, tính hợp lệ, đối tượng và phản hồi từ danh mục. |
| Thiếu công cụ | Kiểm tra danh mục có sẵn cho mã thông báo được ủy quyền và kết nối máy chủ. |

Không chỉ sử dụng HTTP 200 làm chấp nhận: kiểm tra nội dung phản hồi và ảnh chụp nhanh. Việc tạo không thành công sau khi ghi trường hợp có thể để lại trường hợp không có phản hồi; không giả định giao dịch liên quan đến cuộc gọi đến mô hình. Các lần thử lại phải được giới hạn và thông báo cho người dùng. Ghi lại phương thức, tuyến đường được tham số hóa, status, requestId và thời gian UTC; không bao giờ chụp Authorization/JWT, bí mật hoặc tải trọng thô để chuyển tiếp chẩn đoán.

## 15. Chấp nhận bắt buộc

1. Tuyến đường bootstrap không đăng nhập bị từ chối trước trình phát hành. Các danh tính giả mạo không thay đổi người dùng đã xác thực.
2. Phát hành với thông tin xác thực chính xác trả về người thuê dự kiến và 900 giây; bí mật không xuất hiện trong trình duyệt/phát lại/nhật ký.
3. JWT cũ bị từ chối. Phiên mới tạo cuộc trò chuyện với ảnh chụp nhanh và phản hồi thực; mở lại cho cùng một người.
4. Hai người trong cùng một dự án và hai người thuê: GET trường hợp và POST tin nhắn/phản hồi/đóng/leo thang/hành động không giao nhau các danh tính.
5. Ngữ cảnh không có khối, danh tính khác, ngày không hợp lệ và kích thước quá lớn bị từ chối; bí mật tổng hợp không tồn tại trong ảnh chụp nhanh.
6. Gia hạn sau 15 phút, đăng xuất trong quá trình thu thập, thay đổi tài khoản/công ty/vai trò và điều hướng không khôi phục cuộc trò chuyện của người khác.
7. Mô hình phản hồi bằng cách sử dụng bằng chứng và tôn trọng giới hạn chẩn đoán; lỗi không tạo ra thành công rõ ràng.
8. Phát hành các phiên với không và hai máy chủ. Xác nhận rằng mỗi đích nhận được mã thông báo riêng của nó.
9. MCP từ chối mã thông báo sai/cũ, người thuê sai, người dùng vắng mặt/không hoạt động và tài nguyên của người khác. Kiểm tra ID phiên được sử dụng lại, nếu có phiên.
10. Xác nhận rằng các thay đổi yêu cầu xác nhận đề xuất và không lặp lại trong trường hợp hết thời gian chờ.
11. CORS/CSP, điện thoại di động, bàn phím và kênh con người được phê duyệt. Xoay vòng phối hợp được kiểm tra trong quá trình phê duyệt.

`node --test examples.test.mjs` xác thực các bộ điều hợp bị cô lập bằng mock. Nó không thay thế các bài kiểm tra end-to-end này. Điền `ACEITE.md` với người chịu trách nhiệm, phiên bản, thời gian và bằng chứng không bí mật.

## 16. Xuất bản, cắt và khôi phục

Cài đặt thông tin xác thực tích hợp, xuất bản bootstrap và SDK, xác thực trò chuyện và phê duyệt các máy chủ được khai báo trong các phiên.

Không kích hoạt lại các đăng ký cũ hoặc chuyển tiếp MCP toàn cầu để khôi phục tính khả dụng. Nếu có lỗi, tạm thời tắt tiện ích hoặc MCP của tenant bị ảnh hưởng và duy trì kênh con người trong khi sửa bộ điều hợp. Không xóa các cuộc hội thoại để khắc phục lỗi 404 của chủ sở hữu.

Ghi lại giới hạn lưu giữ và bằng chứng cụ thể của ứng dụng của bạn.

## 17. Phản hồi và tệp gói

Trả về tên dự án, tenant, commit backend/frontend, ngày UTC, SDK/hash, thông tin xác thực đã cài đặt (có/không, không có giá trị), trò chuyện đã phê duyệt, MCP đã phê duyệt/tắt, kiểm tra tiêu cực, kênh con người và các mục tồn đọng. Không kết luận bằng “có vẻ hoạt động”.

Bộ công cụ công khai chứa hướng dẫn này trong Markdown, schema máy chủ, fixture tối thiểu, bộ điều hợp trình phát hành, xác thực MCP, bộ điều khiển frontend, SDK, lời nhắc, kiểm tra cô lập, danh sách kiểm tra, hợp đồng hành động và manifest SHA-256. Các gói riêng lẻ có thể thêm các tệp đính kèm cụ thể. Các ví dụ không tự động triển khai các điểm cuối của ứng dụng khách. Phiên bản có thể duyệt được có tại https://support-ai.pontes.uk/developers?lang=vi.
