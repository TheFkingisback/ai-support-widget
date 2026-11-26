# MCP per sesi

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
