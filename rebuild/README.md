# Math Motion Battle

Versi rebuild untuk Interactive Flat Panel: dua tim menggerakkan bola kuning dengan **satu jari telunjuk** untuk memilih jawaban matematika.

## Menjalankan

Jalankan melalui server lokal (bukan `file://`). Cara paling praktis di Windows:

```bat
start.bat
```

Atau gunakan server lain, misalnya:

```powershell
python -m http.server 8080
```

Lalu buka `http://localhost:8080` melalui Chrome atau Edge dan izinkan kamera.

## Desain performa

- Tampilan kamera meminta kualitas hingga 1080p untuk menjaga gambar tetap jelas pada IFP.
- Pelacakan tangan memakai MediaPipe Tasks Vision di `Web Worker`; UI dan fisika tidak diblokir oleh inferensi AI.
- Jika browser SmartScreen tidak mendukung *module worker*, game otomatis beralih ke mode kompatibilitas. Tampilan permainan tetap dimulai setelah kamera siap.
- Hanya frame 320×180 yang dikirim ke AI, pada maksimum 15 FPS. Tampilan video asli tidak diturunkan.
- Canvas game dibatasi 1600×900 pada layar 4K dan sprite jawaban di-cache.
- Tidak menggunakan TensorFlow.js, `canvas-confetti`, filter video, atau `backdrop-filter` layar penuh.

Koneksi internet diperlukan saat pertama kali memuat MediaPipe Tasks Vision dan model tangan dari CDN. Untuk penggunaan tanpa internet, kedua aset tersebut dapat diunduh lalu alamatnya di `hand-worker.js` diarahkan ke berkas lokal.
