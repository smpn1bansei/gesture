# Math Motion Battle

Versi rebuild untuk Interactive Flat Panel: dua tim menggerakkan bola kuning dengan **telapak tangan terbuka** untuk memilih jawaban matematika.

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

- Kamera meminta 720p (1280×720) 30 FPS untuk memangkas beban decoder kamera pada chipset Android IFP.
- Pelacakan tangan memakai MediaPipe Tasks Vision di `Web Worker`; UI dan animasi bola tidak diblokir oleh inferensi AI.
- Jika browser SmartScreen tidak mendukung *module worker*, game otomatis beralih ke mode kompatibilitas.
- Frame 384×216 dikirim ke AI (ringan dan inferensi 2x lebih cepat pada Cortex-A73, latensi ~35-45 ms).
- Deteksi telapak tangan terbuka 3D: langsung aktif saat telapak tangan dibuka ke arah kamera; posisi bola mengikuti pusat telapak tangan dengan sangat stabil dan mulus.
- Jika kehilangan fokus tracking (tangan turun/keluar frame), bola kuning **tetap diam di tempatnya** (tanpa efek pegas/gravitasi ke bawah) dan hanya bergerak kembali saat tracking telapak tangan terdeteksi kembali.
- Animasi partikel burst & shockwave glow saat bola tertabrak: efek kilatan cahaya radial, ring gelombang kejut ganda, partikel percikan berkecepatan tinggi, dan popup teks (`+10` / `✕ SALAH`) dengan akselerasi rendering canvas native yang sangat ringan di GPU IFP.
- Canvas game dibatasi 1600×900 pada layar 4K dan sprite jawaban di-cache.
- Tombol Mulai Ulang (Reset): menampilkan modal konfirmasi kuis ("BATAL" / "YA, MULAI ULANG"), menonaktifkan kamera sementara (*pause track & AI frame capture*), serta membekukan pergerakan bola selama dialog konfirmasi terbuka.
- Efek suara Web Audio API murni tanpa file audio eksternal.
- Tidak menggunakan TensorFlow.js, `canvas-confetti`, filter video, atau `backdrop-filter` layar penuh.

Koneksi internet diperlukan saat pertama kali memuat MediaPipe Tasks Vision dan model tangan dari CDN. Untuk penggunaan tanpa internet, kedua aset tersebut dapat diunduh lalu alamatnya di `hand-worker.js` diarahkan ke berkas lokal.
