# Starter AI Support Widget

Ekstrak ZIP dan jalankan `node server.mjs` menggunakan Node.js 22 atau yang lebih baru. Buka URL loopback yang tercetak di terminal. Buka obrolan dukungan dan tanyakan mengapa impor gagal. Balasan mengidentifikasi baris 42 dan menampilkan referensi impor sintetis dan kesalahan. Atur ulang sampel untuk memulai percakapan baru.

`server.mjs` menyajikan sampel di komputer Anda. `starter/sample.js` berjalan di browser dan menjawab dengan fixture lokal. `widget.v0.3.0.js` adalah rilis widget yang disematkan. Bandingkan SHA-256 dengan `widget.manifest.json`.

Sampel yang diunduh terbuka dalam bahasa kit ini. Tambahkan `?lang=sr-Latn`, `?lang=sr-Cyrl`, atau `?lang=ar` untuk memeriksa lokal lain yang tersedia. Teruskan lokal yang dipilih pengguna saat memasang SDK di aplikasi Anda.

Untuk mengintegrasikan aplikasi Anda sendiri, hapus skrip fixture dan pasang `createBootstrapHandler` dari `bootstrap.mjs` di server aplikasi Anda pada rute seperti `/api/support/bootstrap`. Berikan `authenticate(request)` dari middleware sesi Anda yang ada dan `collectContext(user, tenantKey, signal)` dari lapisan data Anda. Atur variabel lingkungan pribadi di `backend.env.example`. Inisialisasi widget dengan token dan konteks yang dikembalikan oleh rute tersebut. Atur `handoffUrl` opsional ke halaman dukungan manusia HTTPS Anda. Ikuti [Panduan Memulai Pusat Pengembang](https://support-ai.pontes.uk/developers/quick-start?lang=id) untuk siklus hidup sesi.

Backend Anda dapat menyediakan `getMcpServers(user, signal)` ke penangan bootstrap. Kembalikan array `{id, url, accessToken}` untuk keanggotaan terautentikasi ini. Buat token berumur pendek dengan cakupan audiens per server. Hilangkan callback untuk obrolan dengan konteks saja. Browser hanya menerima sesi widget dan konteks.
