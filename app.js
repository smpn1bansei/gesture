/**
 * ============================================================================
 * CAMERA QUIZ BATTLE: HAND GESTURE (1-vs-1 IFP Educational Game)
 * ============================================================================
 * Fitur:
 * - MediaPipe Hands via CDN (max 2 tangan, split X < 0.5 Tim 1, X >= 0.5 Tim 2)
 * - Deteksi gestur 5 jari terbuka (jarak ujung jari 4,8,12,16,20 ke pergelangan 0)
 * - LERP smoothing koordinat tangan untuk menghindari jittering
 * - Bola Kuning Energi (~40px) pada landmark 9 telapak tangan
 * - Fisika bola jatuh & tabrakan lingkaran (Circle-Circle collision)
 * - Area jatuh bola menyisakan 20% area bawah layar agar tidak menyentuh dasar
 * - Sistem penguncian tim parsial: Jika 1 tim salah, layarnya terkunci dan tim lawan tetap berkesempatan
 * - Tombol Fullscreen di halaman awal & di HUD bawah
 * - Web Audio API sintetis murni (nada kemenangan, buzzer salah, dorongan)
 * - Siklus ronde otomatis (banner 2.5 detik, transisi soal, game over)
 * - Siap deploy ke GitHub Pages murni Client-Side HTML5/JS
 */

// ============================================================================
// 1. SOUND SYNTHESIS ENGINE (Pure Web Audio API - Zero External Audio Files)
// ============================================================================
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Nada Kemenangan: Arpeggio ceria nada tinggi gembira (C5 - E5 - G5 - C6)
  playCorrect() {
    if (this.isMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  // Buzzer Salah: Nada rendah distorsi / discordant saw waves
  playWrong() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(110, now); // A2
    osc2.frequency.setValueAtTime(116.54, now); // Disonansi detuned

    osc1.frequency.exponentialRampToValueAtTime(60, now + 0.45);
    osc2.frequency.exponentialRampToValueAtTime(65, now + 0.45);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.52);
    osc2.stop(now + 0.52);
  }

  // Efek dorongan bola (pop / whoosh pelan)
  playBounce() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Fanfare Game Over
  playGameOver() {
    if (this.isMuted) return;
    this.init();
    const notes = [440, 554.37, 659.25, 880];
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.3, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.65);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

// ============================================================================
// 2. PARTICLE & VISUAL EFFECTS SYSTEM
// ============================================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Ledakan partikel hijau saat jawaban benar
  explodeCorrect(x, y) {
    const count = 35;
    const colors = ['#00ff88', '#00f0ff', '#ffffff', '#76ff03'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.02 + Math.random() * 0.02
      });
    }
  }

  // Percikan getaran merah saat jawaban salah
  explodeWrong(x, y) {
    const count = 28;
    const colors = ['#ff3344', '#ff0077', '#ff7700', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.03 + Math.random() * 0.03
      });
    }
  }

  // Jejak aura kuning bola tangan
  addHandTrail(x, y) {
    if (Math.random() > 0.4) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: 3 + Math.random() * 4,
      color: '#ffea00',
      alpha: 0.8,
      life: 0.05
    });
  }

  updateAndDraw(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha -= p.life;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================================
// 3. ANSWER BALL CLASS (Physics & Rendering)
// ============================================================================
class AnswerBall {
  constructor(team, optionIndex, label, text, isCorrect, arenaWidth, canvasHeight, startX, startY) {
    this.team = team; // 1 (Left) atau 2 (Right)
    this.optionIndex = optionIndex; // 0=A, 1=B, 2=C, 3=D
    this.label = label; // "A", "B", "C", "D"
    this.text = text; // teks opsi
    this.isCorrect = isCorrect;

    this.radius = 48;
    this.x = startX;
    this.y = startY;

    // Batas horizontal arena tim
    this.minX = team === 1 ? this.radius + 15 : arenaWidth / 2 + this.radius + 15;
    this.maxX = team === 1 ? arenaWidth / 2 - this.radius - 15 : arenaWidth - this.radius - 15;

    // Batas bawah: Sisakan 20% area bawah layar (bola maksimal di 80% tinggi canvas)
    this.maxY = canvasHeight * 0.80 - this.radius;

    // Kecepatan jatuh perlahan
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = 1.1 + Math.random() * 0.5;
    this.gravity = 0.012;

    // Status visual
    this.isShaking = false;
    this.shakeTimer = 0;
    this.isLocked = false; // Jika tim salah, bola di sisi tim meredup
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(arenaWidth, canvasHeight) {
    this.pulsePhase += 0.04;
    this.minX = this.team === 1 ? this.radius + 15 : arenaWidth / 2 + this.radius + 15;
    this.maxX = this.team === 1 ? arenaWidth / 2 - this.radius - 15 : arenaWidth - this.radius - 15;

    // Batas bawah: Sisakan 20% area bawah layar
    this.maxY = canvasHeight * 0.80 - this.radius;

    // Penambahan gravitasi lembut
    this.vy += this.gravity;
    // Redaman gesekan horizontal
    this.vx *= 0.98;

    this.x += this.vx;
    this.y += this.vy;

    // Efek getar jika salah tersentuh
    if (this.isShaking) {
      this.shakeTimer--;
      if (this.shakeTimer <= 0) {
        this.isShaking = false;
      }
    }

    // Pantulan batas kiri/kanan arena masing-masing
    if (this.x < this.minX) {
      this.x = this.minX;
      this.vx = Math.abs(this.vx) * 0.7;
    } else if (this.x > this.maxX) {
      this.x = this.maxX;
      this.vx = -Math.abs(this.vx) * 0.7;
    }

    // Pantulan lembut di area 80% layar agar tidak menyentuh dasar 20% bawah
    if (this.y > this.maxY) {
      this.y = this.maxY;
      this.vy = -Math.abs(this.vy) * 0.7;
      if (Math.abs(this.vy) < 0.9) {
        this.vy = -1.9; // Beri daya angkat naik lembut ke area atas
      }
    }

    // Batas atas layar
    if (this.y < this.radius + 10 && this.vy < 0) {
      this.vy = 1.0;
    }
  }

  draw(ctx) {
    let drawX = this.x;
    let drawY = this.y;

    if (this.isShaking) {
      drawX += (Math.random() - 0.5) * 10;
      drawY += (Math.random() - 0.5) * 10;
    }

    ctx.save();

    // Jika tim sedang terkunci, redupkan bola di sisi tersebut
    if (this.isLocked) {
      ctx.globalAlpha = 0.28;
    }

    // Pemilihan skema warna berdasarkan Tim & status
    let primaryColor, secondaryColor, glowColor;
    if (this.isShaking) {
      primaryColor = '#ff3344';
      secondaryColor = '#990011';
      glowColor = 'rgba(255, 51, 68, 0.9)';
    } else if (this.team === 1) {
      primaryColor = '#00f0ff';
      secondaryColor = '#0055ff';
      glowColor = 'rgba(0, 240, 255, 0.7)';
    } else {
      primaryColor = '#ff0077';
      secondaryColor = '#ff7700';
      glowColor = 'rgba(255, 0, 119, 0.7)';
    }

    // Outer Ring Glow (Ringan & Cepat, Bebas Gaussian Blur Lag)
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(drawX, drawY, this.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Body Bola (Radial Gradient 3D Glass Sphere)
    const radGrad = ctx.createRadialGradient(
      drawX - this.radius * 0.3,
      drawY - this.radius * 0.3,
      this.radius * 0.1,
      drawX,
      drawY,
      this.radius
    );
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.3, primaryColor);
    radGrad.addColorStop(0.8, secondaryColor);
    radGrad.addColorStop(1, '#050c18');

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Cincin Neon Tipis Luar
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = primaryColor;
    ctx.stroke();

    // Reset shadow untuk teks tajam
    ctx.shadowBlur = 0;

    // Lingkaran Badge Huruf Opsi (A, B, C, D)
    const badgeR = 15;
    const badgeY = drawY - this.radius * 0.35;
    ctx.fillStyle = '#070d1a';
    ctx.beginPath();
    ctx.arc(drawX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Huruf Opsi (A, B, C, D)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, drawX, badgeY);

    // Teks Opsi Jawaban (Ringkas & Mudah Dibaca di IFP)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pemotongan / Wrap Teks agar rapi di dalam bola
    this.renderWrappedText(ctx, this.text, drawX, drawY + 14, this.radius * 1.6, 14);

    ctx.restore();
  }

  // Helper pemotong kata agar muat rapi di dalam bola
  renderWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (ctx.measureText(testLine).width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
        if (lines.length >= 2) break; // Maksimal 2 baris teks dalam bola
      }
    }
    lines.push(currentLine);

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      // Stroke teks untuk kontras tinggi di layar IFP
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.strokeText(line, x, startY + index * lineHeight);
      ctx.fillText(line, x, startY + index * lineHeight);
    });
  }
}

// ============================================================================
// 4. MAIN GAME CONTROLLER & MEDIAPIPE LOGIC
// ============================================================================
class CameraQuizBattle {
  constructor() {
    // Canvas & Context
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.video = document.getElementById('webcam-video');

    // Sub-sistem
    this.sound = new SoundEffects();
    this.particles = new ParticleSystem();

    // Data Bank Soal
    this.questions = window.quizQuestions || [];
    this.currentQuestionIndex = 0;

    // Status Skor
    this.scoreP1 = 0;
    this.scoreP2 = 0;

    // State Mesin Game & Penguncian Tim Parsial
    this.isPlaying = false;
    this.roundEnded = false;
    this.teamLocked = { 1: false, 2: false };
    this.balls = []; // Array of AnswerBall
    this.lastBounceSoundTime = 0;

    // Status Pemain & Gestur Tangan
    this.player1 = {
      team: 1,
      isActive: false, // 5 jari terbuka aktif
      rawX: 0,
      rawY: 0,
      smoothX: 0,
      smoothY: 0,
      prevX: 0,
      prevY: 0,
      radius: 40,
      pulse: 0
    };

    this.player2 = {
      team: 2,
      isActive: false,
      rawX: 0,
      rawY: 0,
      smoothX: 0,
      smoothY: 0,
      prevX: 0,
      prevY: 0,
      radius: 40,
      pulse: 0
    };

    // MediaPipe Hands & Camera instance
    this.hands = null;
    this.cameraUtils = null;
    this.isCameraReady = false;
    this.isLoopRunning = false;

    // Inisialisasi DOM & Event
    this.initDOM();
    this.bindEvents();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  // Cache elemen UI
  initDOM() {
    this.ui = {
      scoreP1: document.getElementById('score-p1'),
      scoreP2: document.getElementById('score-p2'),
      statusP1: document.getElementById('status-p1'),
      statusP2: document.getElementById('status-p2'),
      roundBadge: document.getElementById('round-badge'),
      questionText: document.getElementById('question-text'),
      cameraStatus: document.getElementById('camera-status'),
      btnSound: document.getElementById('btn-sound'),
      btnFullscreen: document.getElementById('btn-fullscreen'),
      btnStartFullscreen: document.getElementById('btn-start-fullscreen'),
      btnReset: document.getElementById('btn-reset'),
      resetModal: document.getElementById('reset-modal'),
      btnCancelReset: document.getElementById('btn-cancel-reset'),
      btnConfirmReset: document.getElementById('btn-confirm-reset'),
      btnStart: document.getElementById('btn-start'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      btnRetryCamera: document.getElementById('btn-retry-camera'),
      startModal: document.getElementById('start-modal'),
      gameoverModal: document.getElementById('gameover-modal'),
      errorModal: document.getElementById('error-modal'),
      lockOverlayP1: document.getElementById('lock-overlay-p1'),
      lockOverlayP2: document.getElementById('lock-overlay-p2'),
      roundBanner: document.getElementById('round-banner'),
      bannerCard: this.canvas.parentElement.querySelector('.banner-card'),
      bannerBadge: document.getElementById('banner-badge'),
      bannerTitle: document.getElementById('banner-title'),
      bannerDetail: document.getElementById('banner-detail'),
      bannerAnswer: document.getElementById('banner-answer'),
      bannerBar: document.getElementById('banner-bar'),
      loadingOverlay: document.getElementById('loading-overlay'),
      loaderStatus: document.getElementById('loader-status'),
      winnerAnnouncement: document.getElementById('winner-announcement'),
      finalScoreP1: document.getElementById('final-score-p1'),
      finalScoreP2: document.getElementById('final-score-p2')
    };
  }

  // Hubungkan event click & interaksi
  bindEvents() {
    // Tombol Mulai Permainan
    this.ui.btnStart.addEventListener('click', () => {
      this.sound.init();
      this.ui.startModal.classList.add('hidden');
      this.startCameraAndGame();
    });

    // Tombol Layar Penuh di Halaman Awal
    if (this.ui.btnStartFullscreen) {
      this.ui.btnStartFullscreen.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // Tombol Main Lagi setelah Game Over
    this.ui.btnPlayAgain.addEventListener('click', () => {
      this.ui.gameoverModal.classList.add('hidden');
      this.resetGame();
    });

    // Tombol Coba Lagi jika kamera gagal
    this.ui.btnRetryCamera.addEventListener('click', () => {
      this.ui.errorModal.classList.add('hidden');
      this.startCameraAndGame();
    });

    // Tombol Layar Penuh IFP di HUD bawah
    this.ui.btnFullscreen.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Tombol Toggle Audio
    this.ui.btnSound.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.ui.btnSound.querySelector('.btn-icon').textContent = isMuted ? '🔇' : '🔊';
      this.ui.btnSound.querySelector('.btn-label').textContent = isMuted ? 'BISU' : 'SUARA';
    });

    // Tombol Buka Modal Reset Game
    this.ui.btnReset.addEventListener('click', () => {
      this.ui.resetModal.classList.remove('hidden');
    });

    // Tombol Batal Reset (Lanjut Main)
    if (this.ui.btnCancelReset) {
      this.ui.btnCancelReset.addEventListener('click', () => {
        this.ui.resetModal.classList.add('hidden');
      });
    }

    // Tombol Konfirmasi Reset (Kembali ke Halaman Depan / Awal)
    if (this.ui.btnConfirmReset) {
      this.ui.btnConfirmReset.addEventListener('click', () => {
        this.ui.resetModal.classList.add('hidden');
        this.returnToHome();
      });
    }
  }

  // Ukur ulang canvas dengan batas resolusi aman untuk IFP (Full HD max)
  handleResize() {
    const maxW = 1920;
    const maxH = 1080;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const aspect = winW / winH;

    let targetW = winW;
    let targetH = winH;

    // Jika layar IFP beresolusi 4K (3840x2160), batasi buffer canvas ke 1080p
    // agar beban fill-rate GPU turun 75% tanpa mengurangi keterbacaan
    if (targetW > maxW || targetH > maxH) {
      if (aspect >= maxW / maxH) {
        targetW = maxW;
        targetH = Math.round(maxW / aspect);
      } else {
        targetH = maxH;
        targetW = Math.round(maxH * aspect);
      }
    }

    this.canvas.width = targetW;
    this.canvas.height = targetH;
  }

  // Menghitung bounding box aktual dari video dengan object-fit: cover
  getVideoRenderBounds() {
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const videoAspect = vw / vh;
    const canvasAspect = cw / ch;

    let renderW, renderH, offsetX, offsetY;
    if (canvasAspect > videoAspect) {
      renderW = cw;
      renderH = cw / videoAspect;
      offsetX = 0;
      offsetY = (ch - renderH) / 2;
    } else {
      renderH = ch;
      renderW = ch * videoAspect;
      offsetX = (cw - renderW) / 2;
      offsetY = 0;
    }
    return { renderW, renderH, offsetX, offsetY };
  }

  // Toggle mode fullscreen IFP
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Gagal masuk mode fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // ============================================================================
  // 5. MEDIAPIPE HANDS SETUP & WEBCAM STREAM
  // ============================================================================
  // Hentikan dan matikan perangkat keras webcam (hardware LED webcam mati)
  stopCamera() {
    if (this.cameraUtils) {
      try {
        if (typeof this.cameraUtils.stop === 'function') {
          this.cameraUtils.stop();
        }
      } catch (e) {
        console.warn('Gagal menghentikan cameraUtils:', e);
      }
      this.cameraUtils = null;
    }

    // Matikan seluruh hardware stream tracks
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject;
      if (typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      this.video.srcObject = null;
    }

    this.isCameraReady = false;
    this.updateCameraStatus('KAMERA: NONAKTIF', false);
  }

  // Nyalakan kamera & hubungkan MediaPipe Hands saat user klik Mulai Permainan
  async startCameraAndGame() {
    this.showLoading(true, 'Menghubungkan Kamera & Memuat AI MediaPipe...');

    try {
      // Inisialisasi MediaPipe Hands jika belum ada (gunakan modelComplexity: 0 Lite untuk IFP)
      if (!this.hands) {
        this.hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // Model Lite: jauh lebih ringan & cepat pada IFP/Mini PC
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onHandResults(results));
      }

      // Pastikan stream sebelumnya dihentikan sebelum membuat instance Camera baru
      this.stopCamera();

      // Inisialisasi Camera Utils baru dengan throttling & resolusi optimal untuk AI
      let isInferencing = false;
      this.cameraUtils = new Camera(this.video, {
        onFrame: async () => {
          // Lewati frame jika inferensi AI MediaPipe sebelumnya masih berjalan
          // Ini mencegah antrean frame yang menyebabkan lag/stutter pada layar IFP
          if (!this.isCameraReady || this.video.readyState < 2 || !this.hands || isInferencing) {
            return;
          }
          isInferencing = true;
          try {
            await this.hands.send({ image: this.video });
          } catch (err) {
            console.warn('MediaPipe frame skip:', err);
          } finally {
            isInferencing = false;
          }
        },
        width: 640,
        height: 360 // 360p sangat ideal untuk AI gestur tangan dan hemat resource GPU/CPU
      });

      await this.cameraUtils.start();
      this.isCameraReady = true;
      this.showLoading(false);
      this.updateCameraStatus('KAMERA: AKTIF', false);

      // Mulai Permainan
      this.resetGame();

      // Mulai Game Loop jika belum berjalan
      if (!this.isLoopRunning) {
        this.isLoopRunning = true;
        requestAnimationFrame(() => this.gameLoop());
      }
    } catch (err) {
      console.error('Error inisialisasi kamera / MediaPipe:', err);
      this.showLoading(false);
      this.updateCameraStatus('KAMERA: GAGAL', true);
      this.ui.errorModal.classList.remove('hidden');

      this.resetGame();
      if (!this.isLoopRunning) {
        this.isLoopRunning = true;
        requestAnimationFrame(() => this.gameLoop());
      }
    }
  }

  updateCameraStatus(text, isError) {
    const chip = this.ui.cameraStatus;
    const led = chip.querySelector('.indicator-led');
    const label = chip.querySelector('.indicator-label');
    label.textContent = text;
    if (isError) {
      led.className = 'indicator-led error';
    } else if (text.includes('NONAKTIF')) {
      led.className = 'indicator-led off';
    } else {
      led.className = 'indicator-led';
    }
  }

  showLoading(show, message = '') {
    if (show) {
      this.ui.loaderStatus.textContent = message;
      this.ui.loadingOverlay.classList.remove('hidden');
    } else {
      this.ui.loadingOverlay.classList.add('hidden');
    }
  }

  // ============================================================================
  // 6. GESTURE DETECTION (5 JARI TERBUKA & PEMBAGIAN SPLIT SCREEN)
  // ============================================================================
  /**
   * Menghitung jarak kelima ujung jari ke pergelangan tangan (landmark 0).
   * Ujung jari:
   *  - Jempol   : Landmark 4
   *  - Telunjuk : Landmark 8
   *  - Tengah   : Landmark 12
   *  - Manis    : Landmark 16
   *  - Kelingking : Landmark 20
   * 
   * Landmark 0: Pergelangan tangan (WRIST)
   * Landmark 9: Pangkal jari tengah (MIDDLE_FINGER_MCP)
   */
  isOpenHandGesture(landmarks) {
    const wrist = landmarks[0];
    const palmBase = landmarks[9];

    // Jarak acuan telapak tangan (skala independen)
    const palmDist = Math.hypot(palmBase.x - wrist.x, palmBase.y - wrist.y);
    if (palmDist < 0.01) return false;

    // Hitung jarak kelima ujung jari ke pergelangan tangan (landmark 0)
    const dist4 = Math.hypot(landmarks[4].x - wrist.x, landmarks[4].y - wrist.y);
    const dist8 = Math.hypot(landmarks[8].x - wrist.x, landmarks[8].y - wrist.y);
    const dist12 = Math.hypot(landmarks[12].x - wrist.x, landmarks[12].y - wrist.y);
    const dist16 = Math.hypot(landmarks[16].x - wrist.x, landmarks[16].y - wrist.y);
    const dist20 = Math.hypot(landmarks[20].x - wrist.x, landmarks[20].y - wrist.y);

    // Jarak sendi PIP (atau MCP jempol) ke pergelangan
    const distMcp2 = Math.hypot(landmarks[2].x - wrist.x, landmarks[2].y - wrist.y);
    const distPip6 = Math.hypot(landmarks[6].x - wrist.x, landmarks[6].y - wrist.y);
    const distPip10 = Math.hypot(landmarks[10].x - wrist.x, landmarks[10].y - wrist.y);
    const distPip14 = Math.hypot(landmarks[14].x - wrist.x, landmarks[14].y - wrist.y);
    const distPip18 = Math.hypot(landmarks[18].x - wrist.x, landmarks[18].y - wrist.y);

    // Kriteria: Ujung jari meregang terbuka melebihi sendi PIP dan pangkal telapak
    const isThumbOpen = dist4 > distMcp2 * 1.12 && dist4 > palmDist * 1.05;
    const isIndexOpen = dist8 > distPip6 * 1.08 && dist8 > palmDist * 1.25;
    const isMiddleOpen = dist12 > distPip10 * 1.08 && dist12 > palmDist * 1.3;
    const isRingOpen = dist16 > distPip14 * 1.08 && dist16 > palmDist * 1.25;
    const isPinkyOpen = dist20 > distPip18 * 1.08 && dist20 > palmDist * 1.1;

    let openFingersCount = 0;
    if (isThumbOpen) openFingersCount++;
    if (isIndexOpen) openFingersCount++;
    if (isMiddleOpen) openFingersCount++;
    if (isRingOpen) openFingersCount++;
    if (isPinkyOpen) openFingersCount++;

    // Validasi jika semua (minimal 4 dari 5 dengan margin toleransi jempol) jari terbuka
    return openFingersCount >= 4;
  }

  /**
   * Callback MediaPipe Hands Results:
   * - Memetakan koordinat mirror layar (1.0 - landmark.x)
   * - Memisahkan tangan di X < 0.5 (Tim Kiri) dan X >= 0.5 (Tim Kanan)
   */
  onHandResults(results) {
    let p1Found = false;
    let p2Found = false;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const bounds = this.getVideoRenderBounds();

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];

        // Koordinat landmark 9 (Pusat telapak tangan)
        const palmCenter = landmarks[9];

        // MIRROR FEED KOORDINAT:
        // Karena webcam dimirror dengan CSS transform: scaleX(-1), posisi layar adalah (1.0 - x)
        const screenNormX = 1.0 - palmCenter.x;
        const screenPixelX = bounds.offsetX + screenNormX * bounds.renderW;
        const screenPixelY = bounds.offsetY + palmCenter.y * bounds.renderH;

        const isOpen = this.isOpenHandGesture(landmarks);

        // Pembagian Sumbu X Layar:
        // Kiri (< 0.5 lebar canvas) mengendalikan Tim 1
        // Kanan (>= 0.5 lebar canvas) mengendalikan Tim 2
        if (screenPixelX < this.canvas.width / 2) {
          if (!p1Found) {
            p1Found = true;
            this.player1.isActive = isOpen && !this.teamLocked[1];
            this.player1.rawX = screenPixelX;
            this.player1.rawY = screenPixelY;
          }
        } else {
          if (!p2Found) {
            p2Found = true;
            this.player2.isActive = isOpen && !this.teamLocked[2];
            this.player2.rawX = screenPixelX;
            this.player2.rawY = screenPixelY;
          }
        }
      }
    }

    if (!p1Found) this.player1.isActive = false;
    if (!p2Found) this.player2.isActive = false;

    this.updateHUDStatus();
  }

  // Update status badge di HUD (BUKA 5 JARI vs SIAP vs TERKUNCI)
  updateHUDStatus() {
    // Tim 1
    if (this.teamLocked[1]) {
      this.ui.statusP1.className = 'hand-status status-locked';
      this.ui.statusP1.innerHTML = '<span class="status-icon">🔒</span><span class="status-text">TERKUNCI (SALAH)</span>';
    } else if (this.player1.isActive) {
      this.ui.statusP1.className = 'hand-status status-ready';
      this.ui.statusP1.innerHTML = '<span class="status-icon">⚡</span><span class="status-text">SIAP (5 Jari)</span>';
    } else {
      this.ui.statusP1.className = 'hand-status status-waiting';
      this.ui.statusP1.innerHTML = '<span class="status-icon">✋</span><span class="status-text">BUKA 5 JARI</span>';
    }

    // Tim 2
    if (this.teamLocked[2]) {
      this.ui.statusP2.className = 'hand-status status-locked';
      this.ui.statusP2.innerHTML = '<span class="status-icon">🔒</span><span class="status-text">TERKUNCI (SALAH)</span>';
    } else if (this.player2.isActive) {
      this.ui.statusP2.className = 'hand-status status-ready';
      this.ui.statusP2.innerHTML = '<span class="status-icon">⚡</span><span class="status-text">SIAP (5 Jari)</span>';
    } else {
      this.ui.statusP2.className = 'hand-status status-waiting';
      this.ui.statusP2.innerHTML = '<span class="status-icon">✋</span><span class="status-text">BUKA 5 JARI</span>';
    }
  }

  // ============================================================================
  // 7. SIKLUS PERMAINAN & BANK SOAL
  // ============================================================================
  resetGame() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentQuestionIndex = 0;
    this.isPlaying = true;
    this.roundEnded = false;
    this.teamLocked = { 1: false, 2: false };

    // Sembunyikan lock overlay & modal reset
    this.ui.lockOverlayP1.classList.add('hidden');
    this.ui.lockOverlayP2.classList.add('hidden');
    if (this.ui.resetModal) this.ui.resetModal.classList.add('hidden');

    this.updateScoreUI();
    this.loadQuestion(this.currentQuestionIndex);
  }

  // Kembali ke Halaman Depan / Awal (Welcome Screen)
  returnToHome() {
    this.isPlaying = false;
    this.roundEnded = false;
    this.teamLocked = { 1: false, 2: false };
    this.balls = [];

    // Matikan hardware kamera webcam (lampu LED kamera laptop/webcam padam)
    this.stopCamera();

    // Matikan status aktif tangan
    this.player1.isActive = false;
    this.player2.isActive = false;

    // Reset data skor & soal
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentQuestionIndex = 0;
    this.updateScoreUI();

    // Sembunyikan semua modal & overlay permainan
    this.ui.lockOverlayP1.classList.add('hidden');
    this.ui.lockOverlayP2.classList.add('hidden');
    this.hideRoundBanner();
    this.ui.gameoverModal.classList.add('hidden');
    if (this.ui.resetModal) this.ui.resetModal.classList.add('hidden');

    // Tampilkan kembali modal halaman awal (Welcome Screen)
    this.ui.startModal.classList.remove('hidden');

    // Reset teks soal & status HUD
    this.ui.roundBadge.textContent = 'SIAP BERTANDING';
    this.ui.questionText.textContent = 'Klik "Mulai Permainan" untuk memulai kuis.';
    this.updateHUDStatus();

    // Bersihkan canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  updateScoreUI() {
    this.ui.scoreP1.textContent = this.scoreP1;
    this.ui.scoreP2.textContent = this.scoreP2;
  }

  loadQuestion(index) {
    if (index >= this.questions.length) {
      this.endGame();
      return;
    }

    const currentQ = this.questions[index];
    this.roundEnded = false;
    this.teamLocked = { 1: false, 2: false };

    // Buka kembali lock overlay kedua tim
    this.ui.lockOverlayP1.classList.add('hidden');
    this.ui.lockOverlayP2.classList.add('hidden');

    // Perbarui HUD Soal
    this.ui.roundBadge.textContent = `SOAL ${index + 1} / ${this.questions.length}`;
    this.ui.questionText.textContent = currentQ.question;
    this.updateHUDStatus();

    // Spawn 4 Bola Jawaban untuk Tim 1 (Kiri) dan 4 Bola untuk Tim 2 (Kanan)
    this.spawnAnswerBalls(currentQ);
  }

  spawnAnswerBalls(questionData) {
    this.balls = [];
    const labels = ['A', 'B', 'C', 'D'];
    const halfWidth = this.canvas.width / 2;

    // 4 Bola untuk Tim 1 (Arena Kiri)
    for (let i = 0; i < 4; i++) {
      const startX = 70 + (i * (halfWidth - 140)) / 3;
      const startY = -60 - i * 65; // Staggered vertikal agar turun bertahap
      const isCorrect = i === questionData.correctIndex;
      this.balls.push(
        new AnswerBall(1, i, labels[i], questionData.options[i], isCorrect, this.canvas.width, this.canvas.height, startX, startY)
      );
    }

    // 4 Bola untuk Tim 2 (Arena Kanan)
    for (let i = 0; i < 4; i++) {
      const startX = halfWidth + 70 + (i * (halfWidth - 140)) / 3;
      const startY = -60 - i * 65;
      const isCorrect = i === questionData.correctIndex;
      this.balls.push(
        new AnswerBall(2, i, labels[i], questionData.options[i], isCorrect, this.canvas.width, this.canvas.height, startX, startY)
      );
    }
  }

  // ============================================================================
  // 8. LOGIKA BENTURAN (CIRCLE-CIRCLE COLLISION) & PENGUNCIAN TIM
  // ============================================================================
  // Repulsi elastis antar bola agar tidak saling bertumpuk
  resolveBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const b1 = this.balls[i];
        const b2 = this.balls[j];
        if (b1.team !== b2.team) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius + 6;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) * 0.5;

          b1.x -= nx * overlap;
          b1.y -= ny * overlap;
          b2.x += nx * overlap;
          b2.y += ny * overlap;

          // Tukar sedikit impuls
          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = (nx * kx + ny * ky) * 0.5;

          b1.vx -= p * nx;
          b1.vy -= p * ny;
          b2.vx += p * nx;
          b2.vy += p * ny;
        }
      }
    }
  }

  checkPlayerCollisions() {
    if (this.roundEnded || !this.isPlaying) return;

    const players = [this.player1, this.player2];

    for (const player of players) {
      // Lewati jika tim sedang terkunci, gestur 5 jari tidak aktif, atau tidak terdeteksi
      if (this.teamLocked[player.team] || !player.isActive) continue;

      for (let i = 0; i < this.balls.length; i++) {
        const ball = this.balls[i];

        // Pastikan pemain hanya berinteraksi dengan bola di arena timnya
        if (ball.team !== player.team) continue;

        const dx = ball.x - player.smoothX;
        const dy = ball.y - player.smoothY;
        const dist = Math.hypot(dx, dy);
        const minDist = player.radius + ball.radius;

        // Terjadi kontak / benturan lingkaran
        if (dist < minDist && dist > 0.001) {
          // Physics impulse dorongan
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          ball.x += nx * overlap;
          ball.y += ny * overlap;

          // Berikan impuls kecepatan dorong
          ball.vx += nx * 6.5;
          ball.vy += ny * 6.5;

          // Suara dorongan pop (throttled)
          const now = Date.now();
          if (now - this.lastBounceSoundTime > 120) {
            this.sound.playBounce();
            this.lastBounceSoundTime = now;
          }

          // Validasi Jawaban
          this.handleAnswerHit(player.team, ball);
          break;
        }
      }

      if (this.roundEnded) break;
    }
  }

  // Kunci hanya tim yang salah menjawab
  lockTeam(team) {
    this.teamLocked[team] = true;

    if (team === 1) {
      this.player1.isActive = false;
      this.ui.lockOverlayP1.classList.remove('hidden');
    } else {
      this.player2.isActive = false;
      this.ui.lockOverlayP2.classList.remove('hidden');
    }

    // Redupkan bola di sisi tim yang terkunci
    for (let i = 0; i < this.balls.length; i++) {
      if (this.balls[i].team === team) {
        this.balls[i].isLocked = true;
      }
    }

    this.updateHUDStatus();
  }

  handleAnswerHit(team, ball) {
    const currentQ = this.questions[this.currentQuestionIndex];
    const correctAnswerText = currentQ.options[currentQ.correctIndex];

    if (ball.isCorrect) {
      // JAWABAN BENAR!
      this.roundEnded = true;
      this.teamLocked[1] = true;
      this.teamLocked[2] = true;

      this.sound.playCorrect();
      this.particles.explodeCorrect(ball.x, ball.y);

      // Efek Confetti di sisi tim pemenang
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: {
            x: team === 1 ? 0.25 : 0.75,
            y: 0.5
          }
        });
      }

      // Tambahkan Skor (+10)
      if (team === 1) this.scoreP1 += 10;
      else this.scoreP2 += 10;
      this.updateScoreUI();

      // Tampilkan Banner Kemenangan Ronde
      const teamName = team === 1 ? 'TIM 1 (BIRU)' : 'TIM 2 (ORANYE)';
      this.showRoundBanner(
        team,
        `${teamName} BENAR!`,
        `Hebat! +10 Poin berhasil diraih!`,
        `Kunci Jawaban: ${correctAnswerText}`
      );

      // Auto-advance setelah 2.5 detik
      setTimeout(() => {
        this.hideRoundBanner();
        this.balls = []; // Bersihkan semua bola tersisa
        this.currentQuestionIndex++;
        this.loadQuestion(this.currentQuestionIndex);
      }, 2500);
    } else {
      // JAWABAN SALAH! Kunci HANYA tim ini!
      this.sound.playWrong();
      ball.isShaking = true;
      ball.shakeTimer = 35;
      this.particles.explodeWrong(ball.x, ball.y);

      // Kunci layar tim yang salah
      this.lockTeam(team);

      const opponentTeam = team === 1 ? 2 : 1;
      const opponentName = opponentTeam === 1 ? 'Tim 1 (Biru)' : 'Tim 2 (Oranye)';

      // Cek apakah kedua tim sekarang sudah terkunci (gagal semua)
      if (this.teamLocked[opponentTeam]) {
        // KEDUA TIM SALAH! Ronde selesai tanpa pemenang
        this.roundEnded = true;
        this.showRoundBanner(
          0,
          'KEDUA TIM SALAH!',
          'Kedua tim gagal menjawab benar pada ronde ini.',
          `Kunci Jawaban: ${correctAnswerText}`
        );

        setTimeout(() => {
          this.hideRoundBanner();
          this.balls = [];
          this.currentQuestionIndex++;
          this.loadQuestion(this.currentQuestionIndex);
        }, 2500);
      } else {
        // TIM LAWAN MASIH DAPAT KESEMPATAN!
        // Jangan selesaikan ronde, biarkan tim lawan melanjutkan
        console.log(`Tim ${team} salah. ${opponentName} masih memiliki kesempatan menjawab!`);
      }
    }
  }

  showRoundBanner(winnerTeam, title, detail, answer) {
    this.ui.bannerTitle.textContent = title;
    this.ui.bannerDetail.textContent = detail;
    this.ui.bannerAnswer.textContent = answer;

    if (winnerTeam === 1) {
      this.ui.bannerCard.className = 'banner-card team1-win';
      this.ui.bannerBadge.textContent = 'RONDE SELESAI';
      this.ui.bannerBadge.style.color = '#00f0ff';
    } else if (winnerTeam === 2) {
      this.ui.bannerCard.className = 'banner-card team2-win';
      this.ui.bannerBadge.textContent = 'RONDE SELESAI';
      this.ui.bannerBadge.style.color = '#ff0077';
    } else {
      this.ui.bannerCard.className = 'banner-card both-wrong';
      this.ui.bannerBadge.textContent = 'RONDE BERAKHIR';
      this.ui.bannerBadge.style.color = '#ff3344';
    }

    this.ui.roundBanner.classList.remove('hidden');

    // Animasi Progress Bar 2.5 Detik
    this.ui.bannerBar.style.transition = 'none';
    this.ui.bannerBar.style.width = '100%';
    setTimeout(() => {
      this.ui.bannerBar.style.transition = 'width 2.4s linear';
      this.ui.bannerBar.style.width = '0%';
    }, 30);
  }

  hideRoundBanner() {
    this.ui.roundBanner.classList.add('hidden');
  }

  endGame() {
    this.isPlaying = false;
    this.sound.playGameOver();

    // Ledakan Confetti Grand Final
    if (typeof confetti === 'function') {
      confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.4 } });
    }

    // Tentukan Pemenang
    let winnerText = 'PERTANDINGAN SERI!';
    if (this.scoreP1 > this.scoreP2) {
      winnerText = '🏆 TIM 1 (BIRU) JUARA 1!';
    } else if (this.scoreP2 > this.scoreP1) {
      winnerText = '🏆 TIM 2 (ORANYE) JUARA 1!';
    }

    this.ui.winnerAnnouncement.textContent = winnerText;
    this.ui.finalScoreP1.textContent = this.scoreP1;
    this.ui.finalScoreP2.textContent = this.scoreP2;
    this.ui.gameoverModal.classList.remove('hidden');
  }

  // ============================================================================
  // 9. GAME LOOP & RENDERING
  // ============================================================================
  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    const lerpAlpha = 0.35; // LERP Smoothing Filter anti-jitter

    // Update Smoothing Posisi Tangan P1 (jika tim belum terkunci)
    if (this.player1.isActive && !this.teamLocked[1]) {
      this.player1.prevX = this.player1.smoothX;
      this.player1.prevY = this.player1.smoothY;
      this.player1.smoothX += (this.player1.rawX - this.player1.smoothX) * lerpAlpha;
      this.player1.smoothY += (this.player1.rawY - this.player1.smoothY) * lerpAlpha;
      this.player1.pulse += 0.08;
      this.particles.addHandTrail(this.player1.smoothX, this.player1.smoothY);
    }

    // Update Smoothing Posisi Tangan P2 (jika tim belum terkunci)
    if (this.player2.isActive && !this.teamLocked[2]) {
      this.player2.prevX = this.player2.smoothX;
      this.player2.prevY = this.player2.smoothY;
      this.player2.smoothX += (this.player2.rawX - this.player2.smoothX) * lerpAlpha;
      this.player2.smoothY += (this.player2.rawY - this.player2.smoothY) * lerpAlpha;
      this.player2.pulse += 0.08;
      this.particles.addHandTrail(this.player2.smoothX, this.player2.smoothY);
    }

    // Update Gerakan Bola Jawaban
    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i].update(this.canvas.width, this.canvas.height);
    }

    // Repulsi Antar Bola
    this.resolveBallCollisions();

    // Cek Benturan Lingkaran Pemain vs Bola
    this.checkPlayerCollisions();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Bersihkan canvas transparan (video webcam dan efek tint berjalan di latar belakang)
    this.ctx.clearRect(0, 0, w, h);

    // 1. Gambar Bola Jawaban
    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i].draw(this.ctx);
    }

    // 2. Gambar Bola Kuning Menyala Pemain (Jika 5 jari terbuka aktif & tim belum terkunci)
    if (!this.teamLocked[1]) {
      this.drawPlayerEnergyOrb(this.player1);
    }
    if (!this.teamLocked[2]) {
      this.drawPlayerEnergyOrb(this.player2);
    }

    // 3. Update & Render Efek Partikel
    this.particles.updateAndDraw(this.ctx);
  }

  // Render "Bola Kuning Menyala" (~40px) dengan aura energi radial
  drawPlayerEnergyOrb(player) {
    if (!player.isActive) return;

    const x = player.smoothX;
    const y = player.smoothY;
    const baseRadius = player.radius;
    const pulseOffset = Math.sin(player.pulse) * 4;
    const currentRadius = baseRadius + pulseOffset;

    this.ctx.save();

    // 1. Outer Pulse Aura
    const auraGrad = this.ctx.createRadialGradient(x, y, currentRadius * 0.4, x, y, currentRadius * 1.8);
    auraGrad.addColorStop(0, 'rgba(255, 234, 0, 0.45)');
    auraGrad.addColorStop(0.6, 'rgba(255, 170, 0, 0.2)');
    auraGrad.addColorStop(1, 'rgba(255, 234, 0, 0)');

    this.ctx.fillStyle = auraGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius * 1.8, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Main Glowing Core (Hardware radial gradient tanpa beban shadowBlur)
    this.ctx.shadowBlur = 0;

    const coreGrad = this.ctx.createRadialGradient(
      x - currentRadius * 0.25,
      y - currentRadius * 0.25,
      currentRadius * 0.1,
      x,
      y,
      currentRadius
    );
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, '#ffea00');
    coreGrad.addColorStop(0.85, '#ff9100');
    coreGrad.addColorStop(1, '#ff6d00');

    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // 3. Cincin Putar Energi
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();

    // 4. Ikon / Label Tim di dalam Bola
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#070d1a';
    this.ctx.font = '900 13px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(player.team === 1 ? 'P1' : 'P2', x, y);

    this.ctx.restore();
  }
}

// ============================================================================
// 10. ENTRY POINT AUTO-BOOT
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new CameraQuizBattle();
});
