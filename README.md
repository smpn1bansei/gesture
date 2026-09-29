# Camera Quiz Battle: Hand Gesture 🖐️⚡

Aplikasi web game interaktif edukasi 1-vs-1 **"Camera Quiz Battle: Hand Gesture"** berbasis sensor gerakan tangan (*AI Computer Vision*) yang berjalan **100% murni di sisi klien (Client-Side HTML5/JS)** tanpa bundler atau dependensi Node.js. Siap di-deploy langsung ke **GitHub Pages**!

Dirancang khusus untuk layar sentuh besar / **Interactive Flat Panel (IFP)** di ruang kelas maupun proyektor/layar laptop untuk pembelajaran Informatika tingkat SMP.

---

## 🚀 Fitur Unggulan

1. **Pelacakan Tangan Real-Time (MediaPipe Hands AI)**:
   - Mendeteksi hingga 2 tangan secara simultan (`maxNumHands: 2`).
   - Layar terbagi menjadi dua sisi (*Split-Screen Arena*):
     - **Arena Kiri (Tim 1 / Biru)**: Dikendalikan oleh tangan pada sumbu $X < 0.5$.
     - **Arena Kanan (Tim 2 / Oranye-Pink)**: Dikendalikan oleh tangan pada sumbu $X \ge 0.5$.
   - Feed webcam dimirror (`CSS transform: scaleX(-1)`) agar terasa alami seperti bercermin di depan layar IFP.

2. **Deteksi Gestur 1 Jari Telunjuk**:
   - Algoritma mengenali telunjuk yang direntangkan sementara jari tengah, manis, dan kelingking dilipat.
   - Dilengkapi **LERP smoothing filter** untuk meminimalisir getaran (*jittering*).
   - Angkat telunjuk untuk menggerakkan **Bola Kuning Menyala (Glowing Yellow Orb)** secara presisi di ujung jari (landmark 8).
   - Jika telunjuk diturunkan atau tangan tidak terdeteksi, bola kuning turun perlahan ke posisi awal dan tidak dapat berinteraksi.

3. **Fisika Bola Jawaban & Deteksi Benturan (Circle-Circle Collision)**:
   - 4 bola jawaban (A, B, C, D) jatuh perlahan dari atas untuk masing-masing tim.
   - **Batas Bawah 20%**: Bola jawaban mengapung di 80% atas layar dan memantul lembut, menyisakan 20% area bawah layar agar tidak menyentuh dasar.
   - Dilengkapi repulsi elastis antar bola agar tidak saling bertumpuk.
   - Pemain menggunakan bola kuning untuk menabrak/mendorong bola opsi jawaban:
     - **Jawaban Benar**: Memutar nada kemenangan gembira, memicu ledakan partikel hijau & hujan *confetti*, skor bertambah **+10 poin**, dan ronde selesai.
     - **Jawaban Salah (Sistem Penguncian Tim Parsial)**: Suara buzzer salah berbunyi, bola bergetar merah, dan **layar tim tersebut langsung terkunci (overlay 🔒)**. Tim lawan yang belum menjawab **tetap mendapatkan kesempatan** untuk mencari dan memilih jawaban yang benar! Jika kedua tim salah, barulah ronde berakhir tanpa pemenang.

4. **Kontrol Layar Penuh (Fullscreen) di Halaman Awal & HUD**:
   - Tersedia tombol Fullscreen langsung di halaman awal (*Welcome Screen*) maupun di HUD bawah untuk memudahkan persiapan di Interactive Flat Panel (IFP) kelas.

4. **Web Audio API Murni (Procedural Audio Synthesis)**:
   - Nol dependensi file `.mp3` atau `.wav` eksternal. Semua efek suara disintesis langsung menggunakan Web Audio API.

5. **Bank Soal Informatika SMP**:
   - Berisi bank soal kurikulum Informatika SMP (Berpikir Komputasional, Hardware, Jaringan & Internet, Spreadsheet, Sistem Operasi, Keamanan Data, Flowchart).

---

## 📁 Struktur File Proyek

```text
gesture-battle/
├── index.html       # Struktur UI split-screen, HUD, video container, & canvas
├── style.css        # Desain Cyberpunk Edutech, responsif 16:9, glassmorphism
├── questions.js     # Bank soal format array objek JSON
├── app.js           # MediaPipe Hands, Web Audio API, physics & game loop
└── README.md        # Panduan penggunaan & deployment
```

---

## 🎮 Cara Menjalankan Secara Lokal

Karena browser membatasi akses webcam pada protokol `file://`, jalankan aplikasi menggunakan static local server:

### Menggunakan VS Code Live Server:
1. Buka folder `gesture-battle` di VS Code.
2. Klik kanan `index.html` dan pilih **"Open with Live Server"**.

### Menggunakan Node.js (npx serve):
```bash
npx serve .
```

### Menggunakan Python:
```bash
python -m http.server 8080
```
Buka browser di `http://localhost:8080` dan izinkan akses kamera.

---

## 🌐 Cara Deploy ke GitHub Pages

1. Buat repository baru di GitHub (misal: `camera-quiz-battle`).
2. Unggah keempat file (`index.html`, `style.css`, `questions.js`, `app.js`).
3. Buka tab **Settings** di repository GitHub Anda.
4. Pilih menu **Pages** di bilah kiri.
5. Pada bagian **Build and deployment > Source**, pilih branch `main` (atau `master`) dan folder `/ (root)`.
6. Klik **Save**. Dalam beberapa detik, tautan website game kuis Anda akan aktif dan siap dimainkan!

---

## 🎯 Panduan Bermain di Kelas (IFP)

1. Hubungkan webcam ke Interactive Flat Panel (IFP) kelas.
2. Buka web aplikasi di browser dan klik tombol **"Mulai Permainan"**.
3. Klik tombol **"Layar Penuh (Fullscreen)"** di sudut kanan bawah.
4. Dua siswa berdiri di sisi kiri dan kanan kamera.
5. Angkat satu jari telunjuk untuk menggerakkan Bola Energi Kuning.
6. Gerakkan tangan untuk menabrak bola jawaban yang paling tepat!
