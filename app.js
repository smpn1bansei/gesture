const QUESTIONS = window.mathQuestions || [];
const OPTIONS = ['A', 'B', 'C', 'D'];
const VISION_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs';
const VISION_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

class Sound {
  constructor() { this.ctx = null; }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  playCorrect() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.38);
    });
  }
  playWrong() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.44);
  }
}

class AnswerBall {
  constructor(team, index, text, correct, x, y) {
    this.team = team;
    this.index = index;
    this.text = text;
    this.correct = correct;
    this.radius = 52;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 42;
    this.vy = 58 + Math.random() * 22;
    this.locked = false;
    this.popped = false;
    this.cache = new Map();
  }

  update(dt, width, height) {
    const minX = this.team === 1 ? this.radius + 20 : width / 2 + this.radius + 20;
    const maxX = this.team === 1 ? width / 2 - this.radius - 20 : width - this.radius - 20;
    const maxY = height * 0.78 - this.radius;
    this.vy = Math.min(this.vy + 32 * dt, 190);
    this.vx *= Math.pow(0.82, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < minX || this.x > maxX) {
      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.vx *= -0.72;
    }
    if (this.y > maxY) {
      this.y = maxY;
      this.vy = -Math.max(76, Math.abs(this.vy) * 0.66);
    }
  }

  sprite(state) {
    if (this.cache.has(state)) return this.cache.get(state);
    const size = 116;
    const ctx = Object.assign(document.createElement('canvas'), { width: size, height: size }).getContext('2d');
    const x = size / 2;
    const y = size / 2;
    const bad = state === 'bad';
    const colors = bad ? ['#ff6969', '#b31837', 'rgba(255,80,80,.9)'] : this.team === 1
      ? ['#88edff', '#1675d4', 'rgba(45,198,255,.95)']
      : ['#ffd081', '#e85a20', 'rgba(255,133,49,.95)'];
    ctx.beginPath(); ctx.arc(x, y, 54, 0, Math.PI * 2); ctx.strokeStyle = colors[2]; ctx.lineWidth = 3; ctx.stroke();
    const fill = ctx.createRadialGradient(x - 17, y - 19, 5, x, y, 51);
    fill.addColorStop(0, '#fff'); fill.addColorStop(.24, colors[0]); fill.addColorStop(.78, colors[1]); fill.addColorStop(1, '#07111f');
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, 51, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#07111f'; ctx.beginPath(); ctx.arc(x, y - 18, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 15px Oxanium,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(OPTIONS[this.index], x, y - 18);
    ctx.font = '900 13px Nunito,sans-serif';
    const lines = this.wrap(ctx, this.text, 84);
    const base = y + 15 - ((lines.length - 1) * 7);
    lines.forEach((line, i) => { ctx.strokeStyle = 'rgba(0,0,0,.68)'; ctx.lineWidth = 3; ctx.strokeText(line, x, base + i * 14); ctx.fillStyle = '#fff'; ctx.fillText(line, x, base + i * 14); });
    const canvas = ctx.canvas;
    this.cache.set(state, canvas);
    return canvas;
  }

  wrap(ctx, text, maxWidth) {
    const words = text.split(' '); const lines = []; let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; if (lines.length === 2) break; }
      else line = candidate;
    }
    if (line && lines.length < 3) lines.push(line);
    return lines.slice(0, 2);
  }

  draw(ctx, bad = false) {
    if (this.popped) return;
    ctx.save();
    if (this.locked) ctx.globalAlpha = 0.25;
    const sprite = this.sprite(bad ? 'bad' : 'normal');
    ctx.drawImage(sprite, this.x - sprite.width / 2, this.y - sprite.height / 2);
    ctx.restore();
  }
}

class MathMotionBattle {
  constructor() {
    this.canvas = document.querySelector('#arena');
    this.ctx = this.canvas.getContext('2d');
    this.video = document.querySelector('#camera');
    this.questions = QUESTIONS;
    this.questionIndex = 0;
    this.scores = [0, 0];
    this.balls = [];
    this.roundEnded = false;
    this.locked = [false, false];
    this.lastTime = performance.now();
    this.trackerReady = false;
    this.trackerBusy = false;
    this.tracker = null;
    this.mainThreadDetector = null;
    this.workerTimeout = null;
    this.sound = new Sound();
    this.isCameraPaused = false;
    this.wasPaused = false;
    this.effects = [];
    this.aiCanvas = document.createElement('canvas');
    this.aiCanvas.width = 384;
    this.aiCanvas.height = 216;
    this.aiCtx = this.aiCanvas.getContext('2d', { willReadFrequently: true });
    this.players = [this.createPlayer(1), this.createPlayer(2)];
    this.ui = {
      start: document.querySelector('#start'), startButton: document.querySelector('#start-button'),
      question: document.querySelector('#question'), round: document.querySelector('#round'),
      scores: [document.querySelector('#score-1'), document.querySelector('#score-2')],
      states: [document.querySelector('#state-1'), document.querySelector('#state-2')],
      locks: [document.querySelector('#lock-1'), document.querySelector('#lock-2')],
      status: document.querySelector('#camera-status'), message: document.querySelector('#message'),
      messageKicker: document.querySelector('#message-kicker'), messageTitle: document.querySelector('#message-title'),
      messageDetail: document.querySelector('#message-detail'), messageButton: document.querySelector('#message-button'),
      resetButton: document.querySelector('#reset-button'), resetModal: document.querySelector('#reset-modal'),
      cancelReset: document.querySelector('#cancel-reset'), confirmReset: document.querySelector('#confirm-reset')
    };
    this.resize();
    addEventListener('resize', () => this.resize());
    document.querySelector('#fullscreen').addEventListener('click', () => this.fullscreen());
    if (this.ui.resetButton) {
      this.ui.resetButton.addEventListener('click', () => {
        this.pauseCamera();
        this.ui.resetModal.classList.remove('hidden');
      });
    }
    if (this.ui.cancelReset) {
      this.ui.cancelReset.addEventListener('click', () => {
        this.ui.resetModal.classList.add('hidden');
        this.resumeCamera();
      });
    }
    if (this.ui.confirmReset) {
      this.ui.confirmReset.addEventListener('click', () => {
        this.ui.resetModal.classList.add('hidden');
        this.ui.message.classList.add('hidden');
        this.resumeCamera();
        this.scores = [0, 0];
        this.startRound(0);
      });
    }
    this.ui.startButton.addEventListener('click', () => this.start());
    this.ui.messageButton.addEventListener('click', () => {
      this.scores = [0, 0];
      this.ui.message.classList.add('hidden');
      // Restart capture setelah finishGame menghentikannya
      if (!this.captureTimer && this.trackerReady) {
        this.captureTimer = setInterval(() => this.captureFrame(), 40);
      }
      this.startRound(0);
    });
    requestAnimationFrame((time) => this.loop(time));
    addEventListener('beforeunload', () => this.cleanup());
  }

  cleanup() {
    if (this.captureTimer) { clearInterval(this.captureTimer); this.captureTimer = null; }
    if (this.workerTimeout) { clearTimeout(this.workerTimeout); this.workerTimeout = null; }
    if (this.tracker) { this.tracker.terminate(); this.tracker = null; }
    this.effects = [];
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }
  }

  createPlayer(team) { return { team, x: 0, y: 0, targetX: 0, targetY: 0, radius: 37, active: false, controlled: false, lastSeen: 0, lastGesture: 0, homeX: 0, homeY: 0 }; }

  resize() {
    const ratio = innerWidth / innerHeight;
    let w = innerWidth; let h = innerHeight;
    if (w > 1600 || h > 900) { if (ratio >= 16 / 9) { w = 1600; h = Math.round(w / ratio); } else { h = 900; w = Math.round(h * ratio); } }
    this.canvas.width = Math.max(1, w); this.canvas.height = Math.max(1, h);
    this.players.forEach((player) => {
      player.homeX = w * (player.team === 1 ? .25 : .75); player.homeY = h * .89;
      if (!player.x) { player.x = player.homeX; player.y = player.homeY; }
    });
  }

  pauseCamera() {
    this.isCameraPaused = true;
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      this.video.pause();
    }
    this.video.classList.add('camera-off');
    this.setStatus('● KAMERA DINONAKTIFKAN SEMENTARA');
  }

  resumeCamera() {
    this.isCameraPaused = false;
    this.wasPaused = true;
    this.video.classList.remove('camera-off');
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
      this.video.play().catch(() => {});
    }
    this.setStatus(`● KAMERA ${this.video.videoWidth || 1280}×${this.video.videoHeight || 720} • AI AKTIF`, false, true);
  }

  async start() {
    this.ui.startButton.disabled = true;
    this.ui.startButton.textContent = 'MENYIAPKAN…';
    try {
      this.isCameraPaused = false;
      this.video.classList.remove('camera-off');
      await this.startCamera();
      this.ui.start.classList.add('hidden');
      this.startRound(0);
      if (this.captureTimer) clearInterval(this.captureTimer);
      this.captureTimer = setInterval(() => this.captureFrame(), 40);
      this.startTrackingWithFallback();
    } catch (error) {
      this.setStatus(error.message || 'KAMERA GAGAL — periksa izin kamera', true);
      this.ui.startButton.disabled = false;
      this.ui.startButton.textContent = 'COBA LAGI';
    }
  }

  async startTrackingWithFallback() {
    if (this.trackerReady) {
      this.setStatus(`● KAMERA ${this.video.videoWidth || 1280}×${this.video.videoHeight || 720} • AI AKTIF`, false, true);
      return;
    }
    try {
      await this.startTracker();
      this.setStatus(`● KAMERA ${this.video.videoWidth}×${this.video.videoHeight} • AI AKTIF`, false, true);
    } catch (workerError) {
      console.warn('Worker pelacak tidak tersedia; beralih ke mode kompatibilitas.', workerError);
      this.setStatus('● MODE KOMPATIBILITAS AI', false, true);
      try {
        await this.startMainThreadTracker();
        this.setStatus(`● KAMERA ${this.video.videoWidth}×${this.video.videoHeight} • AI KOMPATIBEL`, false, true);
      } catch (fallbackError) {
        console.error('Pelacak tangan gagal dimuat.', fallbackError);
        this.setStatus('● AI GAGAL — PERIKSA KONEKSI INTERNET', true);
      }
    }
  }

  async startCamera() {
    this.setStatus('● MENYAMBUNGKAN KAMERA');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } } });
    this.video.srcObject = stream;
    await new Promise((resolve) => this.video.addEventListener('loadedmetadata', resolve, { once: true }));
    await this.video.play();
    this.setStatus(`● KAMERA ${this.video.videoWidth}×${this.video.videoHeight}`, false, true);
  }

  startTracker() {
    return new Promise((resolve, reject) => {
      this.tracker = new Worker('hand-worker.js', { type: 'module' });
      this.tracker.onmessage = ({ data }) => {
        if (data.type === 'ready') { this.trackerReady = true; resolve(); }
        if (data.type === 'result') { if (this.workerTimeout) { clearTimeout(this.workerTimeout); this.workerTimeout = null; } this.trackerBusy = false; this.readHands(data.landmarks); }
        if (data.type === 'error') { if (this.workerTimeout) { clearTimeout(this.workerTimeout); this.workerTimeout = null; } this.trackerBusy = false; reject(new Error(data.message)); }
      };
      this.tracker.onerror = () => reject(new Error('Browser IFP tidak mendukung pelacak tangan modern.'));
      this.tracker.postMessage({ type: 'init' });
    });
  }

  async startMainThreadTracker() {
    const { FilesetResolver, HandLandmarker } = await import(VISION_BUNDLE);
    const vision = await FilesetResolver.forVisionTasks(VISION_WASM);
    this.mainThreadDetector = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.40,
      minHandPresenceConfidence: 0.40,
      minTrackingConfidence: 0.45
    });
    this.trackerReady = true;
  }

  async captureFrame() {
    if (this.isCameraPaused || !this.trackerReady || this.trackerBusy || this.video.readyState < 2 || document.hidden) return;
    this.trackerBusy = true;
    try {
      if (this.mainThreadDetector) {
        this.aiCtx.drawImage(this.video, 0, 0, this.aiCanvas.width, this.aiCanvas.height);
        const result = this.mainThreadDetector.detectForVideo(this.aiCanvas, performance.now());
        this.readHands(result.landmarks || []);
        this.trackerBusy = false;
        return;
      }
      const frame = await createImageBitmap(this.video, { resizeWidth: 384, resizeHeight: 216, resizeQuality: 'medium' });
      this.tracker.postMessage({ type: 'frame', frame, timestamp: performance.now() }, [frame]);
      // Safety net: jika worker tidak merespons dalam 5 detik, paksa reset
      if (this.workerTimeout) clearTimeout(this.workerTimeout);
      this.workerTimeout = setTimeout(() => {
        if (this.trackerBusy) {
          console.warn('Worker tidak merespons dalam 5 detik — mereset trackerBusy.');
          this.trackerBusy = false;
        }
      }, 5000);
    } catch (error) {
      console.warn('Frame pelacak dilewati.', error);
      this.trackerBusy = false;
    }
  }

  readHands(hands) {
    const found = [false, false]; const bounds = this.videoBounds();
    const now = performance.now();
    for (const landmarks of hands) {
      const palm = landmarks[9];
      const team = (1 - palm.x) < .5 ? 0 : 1;
      if (found[team]) continue;
      found[team] = true;
      const player = this.players[team];
      const palmGesture = this.isOpenPalm(landmarks);
      if (palmGesture && !this.locked[team]) {
        player.active = true;
        player.lastGesture = now;
      } else if (now - player.lastGesture > 240) {
        player.active = false;
      }
      player.lastSeen = now;
      player.targetX = bounds.x + (1 - palm.x) * bounds.w;
      player.targetY = bounds.y + palm.y * bounds.h;
    }
    // Pertahankan kontrol maksimal 240 ms saat tangan bergerak cepat
    found.forEach((seen, index) => {
      const player = this.players[index];
      if (!seen && now - player.lastGesture > 240) player.active = false;
    });
  }

  isOpenPalm(points) {
    const wrist = points[0];
    // Jarak 3D Euclidean terhadap pergelangan tangan
    const dist3D = (i) => Math.hypot(
      points[i].x - wrist.x,
      points[i].y - wrist.y,
      (points[i].z || 0) - (wrist.z || 0)
    );
    const scale = dist3D(9); // Skala telapak (wrist ke pangkal jari tengah)
    if (scale < .01) return false;

    // Periksa jari yang terentang menjauhi sendi PIP dan telapak
    const indexOpen = dist3D(8) > dist3D(6) * 1.05 && dist3D(8) > scale * 1.05;
    const middleOpen = dist3D(12) > dist3D(10) * 1.05 && dist3D(12) > scale * 1.05;
    const ringOpen = dist3D(16) > dist3D(14) * 1.05 && dist3D(16) > scale * 1.05;
    const pinkyOpen = dist3D(20) > dist3D(18) * 1.05 && dist3D(20) > scale * 0.95;

    let openFingers = 0;
    if (indexOpen) openFingers++;
    if (middleOpen) openFingers++;
    if (ringOpen) openFingers++;
    if (pinkyOpen) openFingers++;

    // Telapak tangan aktif jika minimal 3 jari terentang terbuka
    return openFingers >= 3;
  }

  videoBounds() {
    const w = this.canvas.width, h = this.canvas.height;
    const sourceRatio = (this.video.videoWidth || 16) / (this.video.videoHeight || 9);
    const targetRatio = w / h;
    if (targetRatio > sourceRatio) { const rh = w / sourceRatio; return { x: 0, y: (h - rh) / 2, w, h: rh }; }
    const rw = h * sourceRatio; return { x: (w - rw) / 2, y: 0, w: rw, h };
  }

  startRound(index) {
    if (index >= this.questions.length) return this.finishGame();
    this.questionIndex = index; this.roundEnded = false; this.locked = [false, false]; this.balls = []; this.effects = [];
    this.players.forEach((player, i) => { player.active = false; player.controlled = false; player.x = player.homeX; player.y = player.homeY; this.ui.locks[i].classList.add('hidden'); });
    const q = this.questions[index]; this.ui.question.textContent = q.question; this.ui.round.textContent = `SOAL ${index + 1} / ${this.questions.length}`;
    const half = this.canvas.width / 2;
    for (let team = 1; team <= 2; team++) for (let i = 0; i < 4; i++) {
      const x = (team === 1 ? 0 : half) + 88 + i * ((half - 176) / 3);
      this.balls.push(new AnswerBall(team, i, q.options[i], i === q.answer, x, -70 - i * 120));
    }
    this.updateHud();
  }

  loop(now) {
    let dt = Math.min(.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    // Setelah unpause, buang dt besar agar bola tidak lompat
    if (this.wasPaused) { dt = 0; this.wasPaused = false; }
    if (!this.isCameraPaused && this.ui.start.classList.contains('hidden')) {
      this.update(dt);
    }
    this.draw();
    requestAnimationFrame((time) => this.loop(time));
  }

  update(dt) {
    this.players.forEach((player, i) => {
      const controlled = player.active && !this.locked[i] && performance.now() - player.lastGesture < 260;
      player.controlled = controlled;
      if (controlled) {
        const blend = 1 - Math.exp(-dt * 36);
        player.x += (player.targetX - player.x) * blend;
        player.y += (player.targetY - player.y) * blend;
      }
      // Jika kehilangan tracking, bola kuning tetap diam di posisinya (tidak kembali ke home)
      const minX = i === 0 ? player.radius + 16 : this.canvas.width / 2 + player.radius + 16;
      const maxX = i === 0 ? this.canvas.width / 2 - player.radius - 16 : this.canvas.width - player.radius - 16;
      const minY = player.radius + 14;
      const maxY = this.canvas.height - player.radius - 14;
      player.x = Math.max(minX, Math.min(maxX, player.x));
      player.y = Math.max(minY, Math.min(maxY, player.y));
    });
    this.balls.forEach((ball) => ball.update(dt, this.canvas.width, this.canvas.height));
    this.resolveBallCollisions();
    if (!this.roundEnded) this.checkHits();
    this.updateEffects(dt);
    this.updateHud();
  }

  resolveBallCollisions() {
    for (let a = 0; a < this.balls.length; a++) for (let b = a + 1; b < this.balls.length; b++) {
      const first = this.balls[a], second = this.balls[b]; if (first.team !== second.team) continue;
      const dx = second.x - first.x, dy = second.y - first.y, dist = Math.hypot(dx, dy), limit = first.radius + second.radius + 5;
      if (dist && dist < limit) { const nx = dx / dist, ny = dy / dist, push = (limit - dist) / 2; first.x -= nx * push; first.y -= ny * push; second.x += nx * push; second.y += ny * push; first.vx -= nx * 18; second.vx += nx * 18; }
    }
  }

  checkHits() {
    for (const player of this.players) {
      const teamIndex = player.team - 1;
      // Jangan tabrak jika tim terkunci, sedang kehilangan tracking (!player.controlled), atau di batas bawah
      if (this.locked[teamIndex] || !player.controlled || player.y >= this.canvas.height * .8) continue;
      const hit = this.balls.find((ball) => !ball.popped && ball.team === player.team && Math.hypot(ball.x - player.x, ball.y - player.y) < ball.radius + player.radius);
      if (hit) {
        if (hit.correct) this.correct(teamIndex, hit);
        else this.wrong(teamIndex, hit);
        return;
      }
    }
  }

  correct(team, ball) {
    this.roundEnded = true;
    this.scores[team] += 10;
    if (ball) ball.popped = true;
    const hitX = ball ? ball.x : this.players[team].x;
    const hitY = ball ? ball.y : this.players[team].y;
    this.spawnBurst(hitX, hitY, true, team);
    this.sound.playCorrect();
    setTimeout(() => {
      this.showMessage('RONDE SELESAI', `TIM ${team + 1} BENAR!`, '+10 Poin berhasil diraih! Soal berikutnya segera dimulai.');
    }, 550);
    setTimeout(() => {
      this.ui.message.classList.add('hidden');
      this.startRound(this.questionIndex + 1);
    }, 2200);
  }

  wrong(team, ball) {
    ball.locked = true;
    this.locked[team] = true;
    this.balls.filter((item) => item.team === team + 1).forEach((item) => { item.locked = true; });
    this.ui.locks[team].classList.remove('hidden');
    this.spawnBurst(ball.x, ball.y, false, team);
    this.sound.playWrong();
    if (this.locked[0] && this.locked[1]) {
      this.roundEnded = true;
      const q = this.questions[this.questionIndex];
      setTimeout(() => {
        this.showMessage('RONDE BERAKHIR', 'KEDUA TIM SALAH', `Jawaban yang benar: ${OPTIONS[q.answer]} — ${q.options[q.answer]}`);
      }, 550);
      setTimeout(() => {
        this.ui.message.classList.add('hidden');
        this.startRound(this.questionIndex + 1);
      }, 2500);
    }
  }

  finishGame() {
    if (this.captureTimer) { clearInterval(this.captureTimer); this.captureTimer = null; }
    const winner = this.scores[0] === this.scores[1] ? 'PERTANDINGAN SERI!' : this.scores[0] > this.scores[1] ? '🏆 TIM BIRU MENANG!' : '🏆 TIM ORANYE MENANG!';
    this.showMessage('PERMAINAN SELESAI', winner, `Skor akhir: Biru ${this.scores[0]} — ${this.scores[1]} Oranye`, true);
  }

  showMessage(kicker, title, detail, final = false) {
    this.ui.messageKicker.textContent = kicker;
    this.ui.messageTitle.textContent = title;
    this.ui.messageDetail.textContent = detail;
    this.ui.message.classList.remove('hidden');
    this.ui.messageButton.classList.toggle('hidden', !final);
  }
  updateHud() {
    this.players.forEach((player, i) => {
      this.ui.scores[i].textContent = this.scores[i];
      this.ui.states[i].textContent = this.locked[i]
        ? '🔒 TERKUNCI'
        : player.controlled
          ? '⚡ MENGGERAKKAN BOLA'
          : '✋ BUKA TELAPAK TANGAN';
    });
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.balls.forEach((ball) => ball.draw(ctx));
    this.drawEffects(ctx);
    this.players.forEach((player, i) => this.drawPlayer(player, this.locked[i]));
  }

  drawPlayer(player, locked) {
    const { ctx } = this, r = player.radius, x = player.x, y = player.y;
    ctx.save();
    ctx.globalAlpha = locked ? .26 : 1;

    // Halo bercahaya di sekitar bola
    const halo = ctx.createRadialGradient(x, y, r * .25, x, y, r * 1.8);
    halo.addColorStop(0, player.controlled ? 'rgba(255,239,80,.72)' : 'rgba(255,227,75,.35)');
    halo.addColorStop(1, 'rgba(255,227,75,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Inti bola kuning berkilau
    const core = ctx.createRadialGradient(x - r * .3, y - r * .3, 2, x, y, r);
    core.addColorStop(0, '#fff');
    core.addColorStop(.3, '#fff79b');
    core.addColorStop(.8, '#ffc21c');
    core.addColorStop(1, '#d86b00');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ikon / Label
    ctx.fillStyle = '#18202b';
    ctx.font = '800 12px Oxanium,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(locked ? '🔒' : `P${player.team}`, x, y);

    // Status visual di bawah bola saat tidak terkunci
    if (!locked) {
      ctx.fillStyle = player.controlled ? '#ffe600' : 'rgba(255,255,255,0.72)';
      ctx.font = '700 11px Oxanium,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(player.controlled ? '⚡ AKTIF' : '✋ DIAM (CARI TANGAN)', x, y + r + 6);
    }
    ctx.restore();
  }

  spawnBurst(x, y, isCorrect, team) {
    // 1. Central radiant flash
    this.effects.push({
      x, y, age: 0, duration: 0.45,
      draw(ctx) {
        const p = this.age / this.duration;
        const radius = 35 + p * 115;
        const alpha = Math.max(0, (1 - p) * 0.85);
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        const rgb = isCorrect ? '255,230,80' : '255,50,60';
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.35, `rgba(${rgb},${alpha * 0.75})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // 2. Expanding shockwave ring 1
    this.effects.push({
      x, y, age: 0, duration: 0.58,
      draw(ctx) {
        const p = this.age / this.duration;
        const radius = 25 + p * 155;
        const alpha = Math.max(0, (1 - p) * 0.95);
        ctx.save();
        ctx.strokeStyle = isCorrect ? `rgba(255,245,110,${alpha})` : `rgba(255,65,75,${alpha})`;
        ctx.lineWidth = Math.max(1, 9 * (1 - p));
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // 3. Expanding shockwave ring 2 (delayed slightly, cyan/accent)
    this.effects.push({
      x, y, age: -0.07, duration: 0.52,
      draw(ctx) {
        if (this.age < 0) return;
        const p = this.age / this.duration;
        const radius = 18 + p * 195;
        const alpha = Math.max(0, (1 - p) * 0.65);
        ctx.save();
        ctx.strokeStyle = isCorrect ? `rgba(50,225,255,${alpha})` : `rgba(255,140,50,${alpha})`;
        ctx.lineWidth = Math.max(1, 4.5 * (1 - p));
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // 4. Spark particles (26 untuk benar, 18 untuk salah)
    const particleCount = isCorrect ? 26 : 18;
    const colorPalette = isCorrect
      ? ['255,255,255', '255,235,90', '255,200,30', '50,220,255', '90,255,160']
      : ['255,255,255', '255,70,80', '255,30,50', '255,120,40', '255,170,60'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i / particleCount) + (Math.random() - 0.5) * 0.45;
      const speed = 140 + Math.random() * 320;
      const size = 3 + Math.random() * 5;
      const rgb = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const duration = 0.5 + Math.random() * 0.4;

      this.effects.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size, rgb, age: 0, duration,
        update(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          const drag = Math.pow(0.92, dt * 60);
          this.vx *= drag;
          this.vy = this.vy * drag + 45 * dt;
        },
        draw(ctx) {
          const p = this.age / this.duration;
          const alpha = Math.max(0, 1 - p);
          const currentSize = Math.max(0.5, this.size * (1 - p * 0.5));
          ctx.save();
          // Glow layer luar
          ctx.fillStyle = `rgba(${this.rgb},${alpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, currentSize * 2.2, 0, Math.PI * 2);
          ctx.fill();
          // Inti partikel
          ctx.fillStyle = `rgba(${this.rgb},${alpha})`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // 5. Floating text popup (+10 atau ✕ SALAH)
    const popupText = isCorrect ? '+10' : '✕ SALAH';
    const popupColor = isCorrect ? '#ffea3b' : '#ff4d64';
    this.effects.push({
      x, y: y - 10,
      age: 0, duration: 0.95,
      draw(ctx) {
        const p = this.age / this.duration;
        const currentY = this.y - p * 55;
        const scale = p < 0.18 ? 0.6 + (p / 0.18) * 0.6 : 1.2 - ((p - 0.18) / 0.82) * 0.2;
        const alpha = p > 0.65 ? Math.max(0, (1 - p) / 0.35) : 1;
        ctx.save();
        ctx.translate(this.x, currentY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.font = '900 32px Oxanium,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#050c17';
        ctx.lineWidth = 6;
        ctx.strokeText(popupText, 0, 0);
        ctx.fillStyle = popupColor;
        ctx.fillText(popupText, 0, 0);
        ctx.restore();
      }
    });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.age += dt;
      if (fx.age >= fx.duration) {
        this.effects.splice(i, 1);
        continue;
      }
      if (fx.update) fx.update(dt);
    }
  }

  drawEffects(ctx) {
    if (!this.effects.length) return;
    for (const fx of this.effects) {
      fx.draw(ctx);
    }
  }

  setStatus(text, error = false, ready = false) { this.ui.status.textContent = text; this.ui.status.className = `camera-status${error ? ' error' : ready ? ' ready' : ''}`; }
  fullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
}

new MathMotionBattle();
