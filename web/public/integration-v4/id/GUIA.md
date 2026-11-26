# Integração do suporte · contrato v4

**SDK 0.3.0 · Manual de backend, frontend e operação**

[TOC]

## 1. Como funciona

Seu backend autentica o usuário, projeta o contexto autorizado e emite uma sessão de 15 minutos. Na chamada de emissão, pode incluir os servidores MCP disponíveis para aquela pessoa. O navegador recebe o JWT do widget e o contexto.

## 2. Ambientes e responsáveis

A plataforma está em https://support-ai.pontes.uk. Use a credencial de integração do ambiente correto. O administrador do workspace obtém a credencial no painel. O time do aplicativo mantém o bootstrap autenticado, o contexto e os tokens delegados por usuário e servidor.

## 3. Credenciais

| Credencial | Destino | Uso |
| --- | --- | --- |
| Credencial de integração sik_ | Support AI | Emitir uma sessão no backend |
| Token delegado por servidor | MCP indicado na sessão | Chamar ferramentas como a pessoa autenticada |
| JWT da sessão | API do chat | Abrir e continuar conversas no widget |

Guarde a credencial de integração no cofre do aplicativo. Revogá-la desativa os JWTs emitidos com ela na próxima requisição. Gere os tokens delegados no backend e limite cada um a um recurso, usuário e prazo de validade.

## 4. Fluxo de autenticação e identidade

```text
Sessão autenticada do aplicativo
  → backend valida pessoa ativa, organização e permissões atuais
  → POST /api/widget/sessions com sik_ no servidor
  ← jwt + tenantKey + expiresIn
  → backend coleta e projeta contexto da MESMA identidade
  ← browser recebe sessão/contexto com Cache-Control: no-store
  → widget chama /api/cases e rotas da conversa com o JWT temporário
```

Preservar o identificador histórico `usr_...` do cliente evita perder acesso às próprias conversas. Não usar email, papel, aparelho ou timestamp como identidade. Caso o mesmo usuário possa mudar de empresa, definir subject estável por vínculo ou política explícita de histórico; a plataforma autoriza conversas por tenant + pessoa, sem inferir organizações do cliente.

A plataforma verifica assinatura, emissor `ai-support`, audiência `ai-support-widget`, propósito `widget`, `sub=userId`, validade e a credencial ativa da sessão. O browser não re-assina nem altera claims. Papéis enviados ao suporte são informação de contexto; autorização de APIs/MCP continua no servidor cliente.

## 5. Contrato do emissor

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Resposta 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validar `tenantKey` antes de devolver ao browser. O arquivo `backend-session.mjs` implementa corpo estrito, timeout, bloqueio de redirects, limite de resposta e validação do tenant; não substitui seu middleware de autenticação.

| Campo | Regra |
| --- | --- |
| mcpServers | Lista opcional de até oito objetos com id, url e accessToken exclusivos. Ver seção 12. |
| userId | Obrigatório, trim, 1–200 caracteres |
| userEmail | Email válido até 254 caracteres ou vazio; default vazio |
| userRoles | Até 30 strings de 1–80 caracteres; default lista vazia |
| plan | String de 1–80 caracteres; default standard |

Jangan kirim tenantId, tenantKey, userName, role, purpose, exp, atau bidang lainnya di body. Kredensial menentukan tenant. Identitas berasal dari sesi/database, bukan dari query/body browser. Penerbit tidak menerima JWT pengguna, kunci administratif, atau rahasia lama sebagai pengganti `sik_`.

Penerbit publik berfungsi tanpa kuota penggunaan per proyek. Gunakan kembali sesi yang masih valid dari orang, perusahaan, dan izin yang sama, dengan kedaluwarsa lebih awal dan pembatalan saat ada perubahan.

## 6. Konteks wajib dan identitas yang benar

Setiap kasus baru memerlukan `context.userState`, `context.userHistory`, dan `context.userLogs`. Kirim daftar kosong ketika sumber telah dikueri dan tidak ada catatan; **jangan mengubah koleksi yang gagal menjadi daftar kosong yang tampak berhasil**. Jika Anda tidak dapat memberikan konteks yang valid dan sah, bootstrap klien harus mengembalikan kesalahan yang terkontrol.

`context.example.json` adalah contoh minimal. `context.schema.json` diekspor dari skema Zod yang digunakan di server, tidak ditulis secara independen. Validasi JSON di backend sebelum deployment. Bidang tambahan yang tidak dikenali akan dibuang; metadata dan aturan dapat berisi struktur sendiri, tunduk pada proyeksi/batas. Skema tidak membuktikan otorisasi atau menghilangkan semua data sensitif.

| Blok | Wajib / struktur |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positif hingga 720, events; timeline dibangun kembali dari events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Opsional; docs dengan id, title, content, category |
| businessRules | Opsional; objek aturan yang disetujui, diserialisasi sebagai runbook |

`userState.userId` harus persis dengan identitas yang diterbitkan. **`userState.tenantId` adalah tenant platform**, bukan ID organisasi/toko di klien. Perbedaan akan mengembalikan 403. Data di browser dapat diubah; konteks tidak mengotorisasi operasi.

## 7. Bidang, batas, dan normalisasi

| Struktur | Bidang utama / aturan |
| --- | --- |
| entities | type, status; id/description opsional; metadata objek; hingga 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; hingga 100 |
| errorClass dari activeErrors | validation, permission, infra atau business; kategori seperti payment memerlukan pemetaan |
| events | ts, event, page; elementId, intent, correlationRequestId menerima null/default; hingga 1.000 |
| recentRequests | ts, route, httpStatus integer, timingMs, requestId; errorCode/resourceId bisa null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs angka atau null; errorCode/lastStage bisa null |
| status dari jobs | queued, running, succeeded, failed, canceled |
| errors dari backend | ts, errorCode, errorClass string, route, requestId; resourceId bisa null |
| docs | Hingga 50; content hingga 32.000 karakter, teks lainnya hingga 4.096 |

Tanggal adalah string ISO-8601 dengan zona waktu; serialisasi Date di backend. Jangan mengarang updatedAt, durationMs, retryable atau kategori hanya untuk melewati skema: gunakan sumber asli atau hilangkan catatan dan informasikan ketidaktersediaan sumber. Catat pemetaan spesifik proyek Anda dalam penerimaan.

Teto do contexto enviado: **262.144 bytes UTF-8 (256 KiB)**. O HTTP completo continua limitado a 1.048.576 bytes. O orçamento do snapshot é `min(maxContextBytes, 262144)`. Se nem a parte essencial couber, a solicitação falha; reduzir metadados/documentos no backend. Sugerimos começar com 48 KiB, dez entidades e conhecimento curto.

O servidor filtra eventos/logs pela menor janela entre a solicitada e a do tenant, remove datas futuras e aplica maxLogLines combinado a requests, erros e jobs (nesta ordem). maxDocs limita a lista docs; businessRules é um runbook separado e também ocupa o orçamento total. A timeline segue os eventos mantidos. Menos dados relevantes costuma produzir diagnóstico melhor e custo menor.

## 8. Privacidade e persistência

Projetar os dados antes de enviá-los: nunca encaminhar headers, cookies, JWTs, credenciais, strings de conexão, URLs assinadas, conteúdo binário, dados de outros usuários ou exportações brutas. Substituir segredos por referências de suporte. Não enviar o PRD inteiro ou logs completos como base de conhecimento.

Novos snapshots passam por validação, redação, redução e orçamento antes da gravação. Mensagens e resultados de ferramentas têm tratamento de padrões conhecidos de segredos. Essa proteção é complementar: não é um classificador infalível de dados pessoais, não corrige retroativamente registros históricos nem substitui a projeção do cliente.

O contexto é um snapshot do início da conversa, não uma consulta em tempo real. Informar timestamps e fontes. `updateContext()` vale para o próximo caso; para dados atuais durante uma conversa, usar ferramenta de leitura homologada.

## 9. Frontend e SDK 0.3.0

Servir o SDK fixado do pacote ou da URL pública. Conferir SHA-256 com `widget.manifest.json`. Evitar script duplicado, versão flutuante e cache de JWT. O controlador de referência em `widget-controller.mjs` monta após bootstrap, aguarda onOpen, renova e impede montagem tardia após logout.

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

`destroy()` membatalkan panggilan dan menghapus persistensi lokal per penyewa/orang. Ini bukan pencabutan individu di server. Sebuah JWT yang sudah disalin dapat tetap berlaku hingga 15 menit setelah logout/penguncian di klien. Jika diperlukan pencabutan segera per orang, kontrak memerlukan evolusi tambahan; jangan gunakan rotasi seluruh penyewa sebagai logout normal.

Setiap baca/tulis percakapan memerlukan pemilik dan penyewa yang sama. Perubahan peran di klien tidak menghapus konten yang sudah diterima orang dalam percakapan. Tetapkan kebijakan riwayat untuk penurunan izin dan perubahan organisasi. Jangan melonggarkan otorisasi untuk mengambil caseId lama; verifikasi subjek asli atau mulai percakapan baru.

## 11. CORS, CSP, PWA dan akses

Izinkan di platform asal pasti dari setiap frontend. SDK memerlukan connect-src untuk dukungan; menyajikan file lokal memungkinkan script-src self. SDK menyuntikkan gaya ke Shadow DOM dan belum menerima nonce: homologkan kebijakan CSP yang sebenarnya, yang mungkin memerlukan evolusi SDK untuk gaya eksternal/nonce/hash. Jangan matikan seluruh kebijakan.

Sesi dan konteks adalah no-store. Kecualikan rute dukungan dari cache PWA, persistensi kueri, dan alat replay. Uji keyboard, fokus, pembaca layar, zoom, dan seluler. Sajikan saluran manusia yang sebenarnya di aplikasi, dengan waktu/URL yang dikonfirmasi. SDK tidak menciptakan penyedia layanan.

## 12. Server MCP dalam sesi

Backend aplikasi mengirimkan `POST /api/widget/sessions` dengan kredensial integrasi `sik_`. Ini menurunkan orang dan organisasinya dari login dan dapat mencakup hingga delapan server di `mcpServers`. Bidang yang dihilangkan atau kosong membuat obrolan dengan konteks. Setiap sesi baru menerima daftar sendiri.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Setiap id dimulai dengan huruf kecil dan menerima huruf kecil, digit, garis bawah, dan tanda hubung, hingga 32 karakter. ID, URL yang dinormalisasi, dan token bersifat eksklusif dalam daftar. Transportasi adalah MCP Streamable HTTP di HTTPS publik, port 443, dengan URL tanpa kredensial, kueri, atau fragmen. Layanan memverifikasi DNS saat menghubungkan dan menolak pengalihan.

Aplikasi mengeluarkan atau memperoleh token akses singkat untuk setiap tujuan, terbatas pada orang, organisasi, izin, dan audiens dari MCP tersebut. Support AI menyajikan `Authorization: Bearer <accessToken>` ke server yang sesuai. Penyedia memverifikasi tanda tangan atau introspeksi, penerbit, validitas, audiens, dan akses ke sumber daya di setiap operasi. Ini menerbitkan di katalog hanya alat yang diizinkan untuk identitas ini. Kredensial platform, JWT widget, dan kunci layanan seperti Stripe memiliki tujuan sendiri.

Token yang didelegasikan dienkripsi di server hingga 900 detik. Browser menerima `{jwt, tenantKey, expiresIn: 900}`. Saat memperbarui, backend memvalidasi ulang identitas dan mengirimkan daftar baru dengan token yang valid. Proposal yang dibuat sebelum pembaruan perlu disajikan lagi. Untuk perubahan organisasi, gunakan pengidentifikasi stabil per tautan dan hancurkan instans widget sebelumnya.

Support AI menelusuri setiap halaman `tools/list`, membedakan alat bernama sama menurut server, dan menggunakan nama asli saat memanggil `tools/call`. Jika katalog memuat lebih dari 32 alat, pengguna dapat mencari dan berpindah halaman di dalam chat. Penemuan alat dibatasi hingga 128 halaman dan 4 MB deskripsi per server. Jika penemuan gagal di satu server, server lain tetap tersedia.

Alat dengan `annotations.readOnlyHint: true` dapat dipanggil secara langsung. Untuk setiap alat dengan anotasi yang hilang atau salah, obrolan menampilkan server, nama, dan argumen sebelum dieksekusi. Deklarasikan hanya-baca untuk operasi tanpa efek bisnis. Pengguna membalas `confirmar` atau `confirm` ke pesan yang ditampilkan dalam waktu lima menit. SDK mengirimkan `replyToMessageId`. Konfirmasi berlaku untuk argumen, server, sesi, dan percakapan tersebut. Proposal baru menggantikan yang sebelumnya.

Platform melakukan satu upaya eksekusi setelah mendaftarkan konfirmasi dan mengirim `Idempotency-Key` dengan ID proposal. Untuk pembayaran dan operasi dengan efek eksternal, penyedia harus menyimpan kunci dan hasilnya secara atomik dan mematuhi kunci idempoten yang disyaratkan oleh layanan keuangan. Setelah batas waktu atau hasil yang ambigu, dukungan mencatat status tidak diketahui, memblokir perubahan baru dalam percakapan ini, dan menjaga kueri tetap tersedia. Verifikasi operasi dalam sistem sumber sebelum melanjutkan.

Untuk homologasi, uji satu sesi tanpa server, dua sesi dari pengguna yang sama, dua organisasi, server dengan alat homonim, dan katalog berhalaman. Verifikasi cakupan/kedaluwarsa token pada penyedia, pembatalan, dan konfirmasi duplikat. Gunakan catatan sintetis untuk memverifikasi hasil pada sumber.

## 13. Model, prompt, dan pengetahuan

Mempertahankan model yang sudah disetujui oleh proyek pada awalnya mengurangi perubahan simultan. Untuk evaluasi baru, `openai/gpt-4.1-mini` adalah kandidat yang kompatibel dengan parameter saat ini: Chat Completions melalui OpenRouter, suhu 0,3, dan max_tokens 2048. Validasi di akun nyata sebelum mengaktifkan. Preferred Model lebih diutamakan daripada Model Policy; otomatis bukan perutean cerdas. Harga/biaya harus berasal dari penyedia; perkiraan lama dari panel mungkin berbeda.

Bidang **AI Instructions / Custom instructions** menerima hingga 2.000 karakter efektif. Tempel hanya `PROMPT-TENANT.txt`; tinjau nama, saluran, dan aturan produk. Jangan menempelkan kredensial atau menggabungkan dokumen di bidang ini. Instruksi ini melengkapi aturan platform; tidak memberikan otorisasi atau mengaktifkan alat.

Prompt yang diberikan memandu respons dalam bahasa dan tulisan yang dipilih oleh orang tersebut, fakta yang dipisahkan dari hipotesis, penghormatan terhadap izin, penggunaan referensi yang aman, tidak adanya janji tindakan, dan saluran manusia. `knowledgePack.docs` harus berisi runbook singkat dan versi dengan penanggung jawab: kesalahan yang sering terjadi, diagnosis, batasan produk, dan cara mengonfirmasi hasil. Log dan dokumen adalah data, bukan instruksi untuk mengubah aturan asisten.

Sumber model: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) dan [katalog OpenRouter](https://openrouter.ai/api/v1/models), dikonsultasikan dalam persiapan sebelumnya pada 14/09/2026. Konfirmasi ulang ketersediaan/harga saat implementasi; tidak ada perbandingan model berbayar dalam kit ini.

## 14. Kontrak kesalahan dan diagnostik

| Respons | Arti / tindakan |
| --- | --- |
| 401 pada penerbit | sik hilang, salah, atau dicabut; perbaiki konfigurasi |
| 400 pada penerbit | Isi di luar kontrak; hapus bidang tambahan |
| 401 dalam kasus | Tanda tangan lama, kedaluwarsa, klaim tidak valid, atau sesi dicabut |
| 400 dalam kasus | Konteks wajib tidak valid, tanggal/status salah, atau anggaran terlampaui |
| 403 dari konteks | userState tidak cocok dengan tenant/orang dari JWT |
| 404 dalam percakapan | Sumber daya tidak ada atau milik identitas lain; jangan paksa akses |
| 429 | Batas; backoff/jitter, tanpa loop penerbitan |
| 500/502/503 | Kegagalan infrastruktur, model, atau konteks; informasikan ketidaktersediaan dan requestId |
| 501 pada tindakan/eskalasi | Fungsionalitas tanpa eksekutor/konektor; gunakan saluran manusia nyata |
| Chat berfungsi, MCP tidak | Periksa daftar yang dikirim pada penerbitan terakhir, validitas, audiens, dan respons katalog. |
| Alat hilang | Verifikasi katalog yang tersedia untuk token yang didelegasikan dan konektivitas server. |

Jangan hanya menggunakan HTTP 200 sebagai penerimaan: verifikasi konten respons dan snapshot. Pembuatan yang gagal setelah menyimpan kasus dapat meninggalkan kasus tanpa respons; jangan berasumsi transaksi melibatkan panggilan ke model. Percobaan ulang harus dibatasi dan diinformasikan kepada pengguna. Catat metode, rute berparameter, status, requestId, dan waktu UTC; jangan pernah menangkap Authorization/JWT, rahasia, atau payload mentah untuk meneruskan diagnostik.

## 15. Penerimaan wajib

1. Rute bootstrap tanpa login ditolak sebelum penerbit. Identitas palsu tidak mengubah pengguna yang diautentikasi.
2. Penerbitan dengan kredensial yang benar mengembalikan tenant yang diharapkan dan 900 detik; rahasia tidak muncul di browser/replay/log.
3. JWT lama ditolak. Sesi baru membuat percakapan dengan snapshot dan respons nyata; dibuka kembali untuk orang yang sama.
4. Dua orang dari proyek yang sama dan dua tenant: GET kasus dan POST pesan/umpan balik/tutup/eskalasi/tindakan tidak menyilangkan identitas.
5. Konteks tanpa blok, identitas berbeda, tanggal tidak valid, dan ukuran berlebihan ditolak; rahasia sintetis tidak bertahan dalam snapshot.
6. Pembaruan setelah 15 menit, logout selama pengumpulan, perubahan akun/perusahaan/peran, dan navigasi tidak memulihkan percakapan orang lain.
7. Model merespons menggunakan bukti dan menghormati batas diagnostik; kegagalan tidak menghasilkan keberhasilan yang jelas.
8. Terbitkan sesi dengan nol dan dua server. Pastikan setiap tujuan menerima tokennya sendiri.
9. MCP menolak token salah/lama, tenant salah, pengguna tidak ada/tidak aktif, dan sumber daya orang lain. Uji ID sesi yang digunakan kembali, jika ada sesi.
10. Konfirmasikan bahwa perubahan memerlukan konfirmasi proposal dan tidak berulang jika terjadi timeout.
11. CORS/CSP, seluler, keyboard, dan saluran manusia disetujui. Rotasi terkoordinasi diuji dalam homologasi.

`node --test examples.test.mjs` memvalidasi adaptor terisolasi dengan mock. Ini tidak menggantikan pengujian end-to-end tersebut. Isi `ACEITE.md` dengan penanggung jawab, versi, waktu, dan bukti tanpa rahasia.

## 16. Publikasi, Pemotongan, dan Pemulihan

Instal kredensial integrasi, publikasikan bootstrap dan SDK, validasi obrolan, dan setujui server yang dideklarasikan dalam sesi.

Jangan mengaktifkan kembali langganan lama atau penerusan MCP global untuk memulihkan ketersediaan. Jika terjadi kegagalan, nonaktifkan sementara widget atau MCP dari penyewa yang terpengaruh dan pertahankan saluran manusia saat memperbaiki adaptor. Jangan menghapus percakapan untuk mengatasi 404 pemilik.

Catat batas retensi dan bukti spesifik aplikasi Anda.

## 17. Umpan Balik dan File Paket

Kembalikan nama proyek, penyewa, komit backend/frontend, tanggal UTC, SDK/hash, kredensial terinstal (ya/tidak, tanpa nilai), obrolan disetujui, MCP disetujui/dimatikan, pengujian negatif, saluran manusia, dan item yang tertunda. Jangan menyimpulkan dengan "sepertinya berfungsi".

Kit publik berisi panduan ini dalam Markdown, skema server, fixture minimal, adaptor penerbit, autentikasi MCP, pengontrol frontend, SDK, prompt, pengujian terisolasi, daftar periksa, kontrak tindakan, dan manifes SHA-256. Paket individual dapat menambahkan lampiran spesifik. Contoh tidak secara otomatis mengimplementasikan endpoint aplikasi klien. Versi yang dapat dijelajahi ada di https://support-ai.pontes.uk/developers?lang=id.
