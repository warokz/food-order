# Form Pemesanan Makanan WhatsApp + Admin v9

Versi ini sudah dibuat responsif untuk PC, tablet, dan HP dengan tampilan order food modern. Fitur utamanya:

- Halaman order pelanggan seperti aplikasi GoFood/Gojek Food.
- Keranjang belanja.
- Struk otomatis.
- Checkout langsung ke WhatsApp admin untuk pembayaran tunai.
- Jika pembayaran QRIS atau Transfer Bank, pelanggan diarahkan ke halaman `payment.html` terlebih dahulu.
- Halaman pembayaran khusus berisi QRIS, rekening transfer, ringkasan pesanan, dan form upload bukti pembayaran.
- Setelah pelanggan upload bukti, sistem membuka chat WhatsApp admin nomor `088211399973`.
- Dashboard admin dengan login.
- Menu admin untuk mengganti password.
- Menu admin untuk tambah item/menu, ubah harga, aktif/nonaktif menu, dan upload icon/foto menu sendiri.
- Menu admin untuk mengatur QRIS, nomor rekening, nama toko, dan nomor WhatsApp admin.
- Rekap pesanan, total item, total omzet, status pesanan, dan bukti pembayaran.

## Isi File

1. `index.html`  
   Form pelanggan dan halaman order makanan.

2. `payment.html`  
   Landing page pembayaran QRIS/transfer dan upload bukti pembayaran.

3. `admin.html`  
   Dashboard admin, login, rekap pesanan, manajemen menu, upload icon, dan pengaturan pembayaran.

4. `apps_script.gs`  
   Backend Google Sheets untuk menyimpan pesanan, menu, settings pembayaran, dan bukti pembayaran.

## Cara Pakai Cepat Tanpa Google Sheets

File tetap bisa dibuka langsung di browser. Namun, fitur data lintas perangkat belum aktif. Fitur yang berjalan lokal:

- Keranjang.
- Struk.
- Login admin lokal.
- Simpan password lokal.
- Simpan settings lokal di browser yang sama.
- Bukti pembayaran lokal hanya terlihat di browser yang sama.

Untuk toko sungguhan, sangat disarankan menghubungkan Google Sheets.

## Cara Menghubungkan Google Sheets

1. Buat Google Spreadsheet baru.
2. Klik menu **Extensions / Ekstensi > Apps Script**.
3. Hapus kode bawaan.
4. Tempel isi file `apps_script.gs`.
5. Di bagian atas kode, ganti:

```js
const ADMIN_KEY = 'ganti-key-admin';
```

Contoh:

```js
const ADMIN_KEY = 'admin-tunas-rasa-2026';
```

6. Klik **Deploy > New deployment**.
7. Pilih type **Web app**.
8. Setting:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
9. Klik **Deploy**.
10. Salin URL Web App.
11. Buka file `index.html`, `payment.html`, dan `admin.html`.
12. Ganti bagian berikut dengan URL Web App tadi:

```js
appsScriptUrl:"PASTE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

atau di `admin.html`:

```js
const APPS_SCRIPT_URL="PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

13. Di `admin.html`, samakan ADMIN_KEY dengan yang ada di `apps_script.gs`:

```js
const ADMIN_KEY="admin-tunas-rasa-2026";
```

## Mengubah Nomor WhatsApp Admin

Default nomor admin adalah:

```text
088211399973
```

Sistem memakai format internasional:

```text
6288211399973
```

Nomor ini bisa diganti dari `admin.html` pada menu **Pengaturan Admin > Pengaturan QRIS & Transfer**.

## Upload Icon / Foto Menu

Masuk ke `admin.html`, lalu:

1. Login dengan ID dan password admin.
2. Buka tab **Manajemen Menu**.
3. Klik **Tambah Baru** atau **Edit** pada menu.
4. Isi nama, harga, kategori, dan deskripsi.
5. Pada bagian **Upload Icon / Foto Menu**, pilih gambar dari perangkat.
6. Klik **Simpan Menu**.

Icon akan muncul otomatis di `index.html` pada halaman order pelanggan.

## Alur QRIS / Transfer

1. Pelanggan memilih menu.
2. Pelanggan memilih pembayaran **QRIS** atau **Transfer Bank**.
3. Pelanggan klik **Fix Pesanan**.
4. Pelanggan diarahkan ke `payment.html`.
5. Pelanggan melihat QRIS/rekening dan total pembayaran.
6. Pelanggan upload bukti pembayaran.
7. Sistem membuka WhatsApp admin dengan format pesan otomatis.
8. Jika Google Sheets sudah terhubung, bukti pembayaran juga masuk ke dashboard admin.

## Catatan Penting Tentang Bukti Pembayaran WhatsApp

WhatsApp Web/wa.me tidak mengizinkan website menempelkan file gambar otomatis ke chat karena pembatasan keamanan browser. Sistem ini melakukan dua hal:

1. Menyimpan bukti pembayaran ke Google Sheets/dashboard admin jika Apps Script sudah disambungkan.
2. Membuka chat WhatsApp admin dengan pesan otomatis bahwa bukti sudah dikirim melalui form.

Jika ingin bukti juga muncul sebagai lampiran langsung di WhatsApp, pelanggan dapat melampirkannya manual setelah chat terbuka.

## Mengganti Password Admin

1. Buka `admin.html`.
2. Login menggunakan akun admin.
3. Buka tab **Pengaturan Admin**.
4. Isi ID admin, password lama, password baru, dan konfirmasi password.
5. Klik **Simpan Password**.

Password ini tersimpan di browser admin. Jika dibuka dari perangkat lain, gunakan default lagi atau atur ulang di browser tersebut.

## Batas Ukuran Gambar

Agar aman masuk Google Sheets, sistem otomatis mengecilkan gambar icon, QRIS, dan bukti pembayaran. Gunakan gambar yang jelas tetapi tidak terlalu besar.

Jika muncul pesan ukuran terlalu besar, gunakan screenshot atau foto yang lebih kecil.


## Update v8
- Tombol download struk sekarang menghasilkan file PDF (`.pdf`), bukan HTML.
- Form login admin dibuat kosong tanpa placeholder ID/password default.
- Tulisan default ID/password di halaman login dihapus agar tidak terlihat oleh pengunjung.
- Catatan keamanan: setelah berhasil login, segera ganti ID/password melalui menu Pengaturan Admin. Untuk keamanan penuh pada hosting publik, gunakan proteksi tambahan dari server/auth karena template statis masih berjalan di sisi browser.


## Update v9
- Tombol/link **Admin** di halaman pelanggan (`index.html`) sudah dihapus.
- Pelanggan tidak lagi melihat pintasan menuju dashboard admin dari halaman order.
- Dashboard admin tetap dapat dibuka manual oleh pemilik melalui URL `admin.html`.
