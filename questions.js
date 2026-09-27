/**
 * Bank Soal Kuis Informatika SMP
 * Format: Array of objects { question, options, correctIndex }
 */
const quizQuestions = [
  {
    question: "Komponen komputer yang berfungsi sebagai otak utama untuk memproses seluruh instruksi adalah...",
    options: [
      "CPU (Processor)",
      "RAM (Memory)",
      "Harddisk / SSD",
      "Power Supply"
    ],
    correctIndex: 0
  },
  {
    question: "Manakah pilar Berpikir Komputasional yang memecah masalah besar menjadi bagian-bagian lebih kecil?",
    options: [
      "Abstraksi",
      "Dekomposisi",
      "Pengenalan Pola",
      "Algoritma"
    ],
    correctIndex: 1
  },
  {
    question: "Jaringan komputer nirkabel berjarak dekat yang biasa digunakan di rumah atau sekolah disebut...",
    options: [
      "MAN",
      "WAN",
      "Wi-Fi (WLAN)",
      "Bluetooth"
    ],
    correctIndex: 2
  },
  {
    question: "Di aplikasi spreadsheet (Excel/Calc), rumus apa yang digunakan untuk menghitung rata-rata nilai?",
    options: [
      "=SUM()",
      "=COUNT()",
      "=MAX()",
      "=AVERAGE()"
    ],
    correctIndex: 3
  },
  {
    question: "Jenis perangkat lunak yang bertugas mengelola hardware dan software di komputer adalah...",
    options: [
      "Sistem Operasi (OS)",
      "Aplikasi Browser",
      "Antivirus",
      "Driver Monitor"
    ],
    correctIndex: 0
  },
  {
    question: "Upaya penipuan online untuk mencuri data pribadi (password/PIN) dengan menyamar sebagai pihak resmi disebut...",
    options: [
      "Cyberbullying",
      "Phishing",
      "Debugging",
      "Defragmentasi"
    ],
    correctIndex: 1
  },
  {
    question: "Kombinasi password berikut yang paling aman dan sulit ditebak oleh peretas adalah...",
    options: [
      "12345678",
      "admin2024",
      "K3n@r1#B!ru29",
      "rahasia123"
    ],
    correctIndex: 2
  },
  {
    question: "Pada diagram alir (flowchart), simbol berbentuk belah ketupat (diamond) melambangkan...",
    options: [
      "Mulai / Selesai (Terminator)",
      "Input / Output data",
      "Proses perhitungan",
      "Keputusan / Percabangan (Decision)"
    ],
    correctIndex: 3
  }
];

// Ekspor untuk browser global
if (typeof window !== "undefined") {
  window.quizQuestions = quizQuestions;
}
