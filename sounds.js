/**
 * ═══════════════════════════════════════════════════════════════════
 *  sounds.js  —  „Die zwei Gesichter von 1936"
 *  Version 3.0
 * ═══════════════════════════════════════════════════════════════════
 *
 *  KONZEPT
 *  ───────
 *  Drei Ebenen:
 *
 *  1. INTERAKTIONS-SOUNDS (on click/hover)
 *     Zeitungsblättern, Schreibmaschine, Stempel, Nadelklick …
 *
 *  2. ATMOSPHÄRISCHER AMBIENT
 *     Leise Hintergrundklänge, die sich mit dem Scroll-Fortschritt
 *     verändern:
 *     • Kapitel I   (Fassade)  → leichtes Gemurmel, ferne Fanfare
 *     • Kapitel II  (Realität) → tiefes Grollen, Stille
 *     • Kapitel III (Opfer)    → langsame Drone, leise Dissonanz
 *     • Kapitel VI  (Quiz)     → neutrales Ticken (Uhr)
 *     • Kapitel VIII (Namen)   → sehr stille Drone, fast Stille
 *
 *  3. EIGENE IDEEN
 *     • Beim Erscheinen der Chronologie: leises Telegraphen-Morsen
 *     • IOC-Vote „Ja": kurzes triumphales Motiv (dann sofort leiser)
 *     • IOC-Vote „Nein": melancholisches Motiv
 *     • Quiz richtig: gedämpfte Glocke
 *     • Quiz falsch: tiefer Thud
 *     • Namen-Wand: wenn sichtbar → sehr leise Streicherdrone beginnt
 *     • Scroll über Marzahn-Abschnitt: kurzer Windhauch
 *
 *  EINBINDUNG
 *  ──────────
 *  Am Ende von <body>, nach dem bestehenden <script>-Block:
 *      <script src="sounds.js"></script>
 *
 *  BARRIEREFREIHEIT
 *  ────────────────
 *  • prefers-reduced-motion → alles deaktiviert
 *  • 🔔 / 🔕 Button oben rechts — nur Mute-Toggle, kein Panel
 *  • Lautstärke ist fest auf einem sehr leisen, angenehmen Niveau
 *
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     KONFIGURATION — hier alle Lautstärken zentral
  ═══════════════════════════════════════════════════════════════ */

  var CFG = {
    master:      0.30,   // Gesamt-Lautstärke (niedrig gehalten)
    interaction: 0.80,   // Interaktions-Sounds relativ zu master
    ambient:     0.18,   // Ambient-Schicht (sehr leise)
    hover:       0.30,   // Hover-Ticks (fast unhörbar)
    atmosphere:  0.12,   // Atmosphärische Drone
    fadeTime:    2.8,    // Sekunden zum Überblenden zwischen Ambient-Zuständen
  };

  /* ═══════════════════════════════════════════════════════════════
     KERN
  ═══════════════════════════════════════════════════════════════ */

  var ctx        = null;
  var masterGain = null;
  var muted      = false;

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = CFG.master;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function play(fn, gainMult) {
    if (muted || prefersReducedMotion) return;
    gainMult = gainMult !== undefined ? gainMult : 1.0;
    try {
      var c  = getCtx();
      var g  = c.createGain();
      g.gain.value = gainMult;
      g.connect(masterGain);
      fn(c, g);
    } catch (_) {}
  }

  function throttle(fn, ms) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, arguments); }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     HILFSFUNKTIONEN
  ═══════════════════════════════════════════════════════════════ */

  function makeNoise(c, duration, amplitude) {
    amplitude = amplitude !== undefined ? amplitude : 1.0;
    var len = Math.ceil(c.sampleRate * duration);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d   = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * amplitude;
    }
    return buf;
  }

  function makePinkNoise(c, duration) {
    // Pink Noise (rauscharm, wärmer als White Noise)
    var len = Math.ceil(c.sampleRate * duration);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d   = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return buf;
  }

  function makeFilter(c, type, freq, Q) {
    Q = Q !== undefined ? Q : 1.0;
    var f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  }

  /* Einfacher Reverb-Convolver (synthetischer IR) */
  function makeReverb(c, duration, decay) {
    duration = duration || 1.2;
    decay    = decay    || 2.0;
    var rate = c.sampleRate;
    var len  = Math.ceil(rate * duration);
    var buf  = c.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    var conv = c.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  /* ═══════════════════════════════════════════════════════════════
     ① INTERAKTIONS-SOUNDS
  ═══════════════════════════════════════════════════════════════ */

  function paperRustle(c, out) {
    var now = c.currentTime;
    var n1  = makeNoise(c, 0.08);
    var s1  = c.createBufferSource(); s1.buffer = n1;
    var bp1 = makeFilter(c, "bandpass", 3200, 0.7);
    var e1  = c.createGain();
    e1.gain.setValueAtTime(0, now);
    e1.gain.linearRampToValueAtTime(1.0, now + 0.006);
    e1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    s1.connect(bp1); bp1.connect(e1); e1.connect(out);
    s1.start(now); s1.stop(now + 0.09);

    var n2  = makeNoise(c, 0.22, 0.5);
    var s2  = c.createBufferSource(); s2.buffer = n2;
    var bp2 = makeFilter(c, "bandpass", 1800, 0.5);
    var lp2 = makeFilter(c, "lowpass", 4000);
    var e2  = c.createGain();
    e2.gain.setValueAtTime(0, now + 0.04);
    e2.gain.linearRampToValueAtTime(0.5, now + 0.07);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    s2.connect(bp2); bp2.connect(lp2); lp2.connect(e2); e2.connect(out);
    s2.start(now + 0.04); s2.stop(now + 0.29);
  }

  function typewriterKey(c, out) {
    var now   = c.currentTime;
    var noise = makeNoise(c, 0.03);
    var src   = c.createBufferSource(); src.buffer = noise;
    var hp    = makeFilter(c, "highpass", 800, 0.5);
    var lp    = makeFilter(c, "lowpass", 5000);
    var eN    = c.createGain();
    eN.gain.setValueAtTime(0.9, now);
    eN.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    src.connect(hp); hp.connect(lp); lp.connect(eN); eN.connect(out);
    src.start(now); src.stop(now + 0.035);

    var osc = c.createOscillator();
    var eO  = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
    eO.gain.setValueAtTime(0, now);
    eO.gain.linearRampToValueAtTime(0.18, now + 0.003);
    eO.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(eO); eO.connect(out);
    osc.start(now); osc.stop(now + 0.08);
  }

  function stamp(c, out) {
    var now = c.currentTime;
    var osc = c.createOscillator();
    var e1  = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
    var lp = makeFilter(c, "lowpass", 700, 0.6);
    e1.gain.setValueAtTime(0, now);
    e1.gain.linearRampToValueAtTime(0.85, now + 0.004);
    e1.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(lp); lp.connect(e1); e1.connect(out);
    osc.start(now); osc.stop(now + 0.12);

    var noise = makeNoise(c, 0.015, 0.7);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 4500, 1.5);
    var e2    = c.createGain();
    e2.gain.setValueAtTime(1, now);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    src.connect(bp); bp.connect(e2); e2.connect(out);
    src.start(now); src.stop(now + 0.02);
  }

  function pinClick(c, out) {
    var now = c.currentTime;
    [[1400, 0, 0.45], [2100, 0.004, 0.18], [700, 0.008, 0.18]].forEach(function (p) {
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p[0], now + p[1]);
      osc.frequency.exponentialRampToValueAtTime(p[0] * 0.55, now + p[1] + 0.18);
      env.gain.setValueAtTime(0, now + p[1]);
      env.gain.linearRampToValueAtTime(p[2], now + p[1] + 0.006);
      env.gain.exponentialRampToValueAtTime(0.001, now + p[1] + 0.22);
      osc.connect(env); env.connect(out);
      osc.start(now + p[1]); osc.stop(now + p[1] + 0.23);
    });
    var noise = makeNoise(c, 0.01, 0.4);
    var src   = c.createBufferSource(); src.buffer = noise;
    var hp    = makeFilter(c, "highpass", 3000);
    var eN    = c.createGain();
    eN.gain.setValueAtTime(0.6, now);
    eN.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    src.connect(hp); hp.connect(eN); eN.connect(out);
    src.start(now); src.stop(now + 0.012);
  }

  function penScratch(c, out) {
    var now  = c.currentTime;
    var dur  = 0.11;
    var noise = makeNoise(c, dur, 0.6);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp1   = makeFilter(c, "bandpass", 3800, 1.8);
    var bp2   = makeFilter(c, "bandpass", 5200, 2.2);
    var mix   = c.createGain(); mix.gain.value = 0.5;
    var env   = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.7, now + 0.015);
    env.gain.linearRampToValueAtTime(0.5, now + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    var lfo     = c.createOscillator();
    var lfoGain = c.createGain();
    lfo.frequency.value = 28;
    lfoGain.gain.value  = 400;
    lfo.connect(lfoGain); lfoGain.connect(bp1.frequency);
    lfo.start(now); lfo.stop(now + dur + 0.01);
    src.connect(bp1); src.connect(bp2);
    bp1.connect(mix); bp2.connect(mix);
    mix.connect(env); env.connect(out);
    src.start(now); src.stop(now + dur + 0.01);
  }

  function reveal(c, out) {
    var now  = c.currentTime;
    var dur  = 0.18;
    var noise = makeNoise(c, dur, 0.55);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = c.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(3500, now + dur * 0.6);
    bp.frequency.exponentialRampToValueAtTime(1800, now + dur);
    var env = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.65, now + 0.025);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + dur + 0.03);
  }

  function correctBell(c, out) {
    var reverb = makeReverb(c, 0.8, 3.0);
    reverb.connect(out);
    [[262, 0, 0.22], [330, 0.06, 0.19], [392, 0.12, 0.16]].forEach(function (p) {
      var t   = c.currentTime + p[1];
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p[0] * 1.003, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(p[2], t + 0.007);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      var osc2 = c.createOscillator();
      var e2   = c.createGain();
      osc2.type = "sine";
      osc2.frequency.value = p[0] * 2.756;
      e2.gain.setValueAtTime(0, t);
      e2.gain.linearRampToValueAtTime(p[2] * 0.12, t + 0.005);
      e2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc2.connect(e2); e2.connect(reverb);
      osc2.start(t); osc2.stop(t + 0.19);
      osc.connect(env); env.connect(reverb);
      osc.start(t); osc.stop(t + 0.56);
    });
  }

  function wrongBass(c, out) {
    var now = c.currentTime;
    var osc = c.createOscillator();
    var e1  = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.2);
    var lp = makeFilter(c, "lowpass", 500, 0.8);
    e1.gain.setValueAtTime(0, now);
    e1.gain.linearRampToValueAtTime(0.55, now + 0.008);
    e1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(lp); lp.connect(e1); e1.connect(out);
    osc.start(now); osc.stop(now + 0.29);
    var osc2 = c.createOscillator();
    var e2   = c.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.14);
    e2.gain.setValueAtTime(0, now);
    e2.gain.linearRampToValueAtTime(0.22, now + 0.006);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(e2); e2.connect(out);
    osc2.start(now); osc2.stop(now + 0.17);
  }

  function drawerOpen(c, out) {
    var now   = c.currentTime;
    var noise = makeNoise(c, 0.07, 0.35);
    var src   = c.createBufferSource(); src.buffer = noise;
    var lp    = makeFilter(c, "lowpass", 1200, 0.6);
    var e1    = c.createGain();
    e1.gain.setValueAtTime(0, now);
    e1.gain.linearRampToValueAtTime(0.7, now + 0.01);
    e1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    src.connect(lp); lp.connect(e1); e1.connect(out);
    src.start(now); src.stop(now + 0.075);
    var osc = c.createOscillator();
    var e2  = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.1);
    e2.gain.setValueAtTime(0, now + 0.04);
    e2.gain.linearRampToValueAtTime(0.16, now + 0.047);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(e2); e2.connect(out);
    osc.start(now + 0.04); osc.stop(now + 0.13);
  }

  function drawerClose(c, out) {
    var now = c.currentTime;
    var osc = c.createOscillator();
    var e1  = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.06);
    e1.gain.setValueAtTime(0, now);
    e1.gain.linearRampToValueAtTime(0.14, now + 0.005);
    e1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(e1); e1.connect(out);
    osc.start(now); osc.stop(now + 0.09);
    var noise = makeNoise(c, 0.05, 0.28);
    var src   = c.createBufferSource(); src.buffer = noise;
    var lp    = makeFilter(c, "lowpass", 900);
    var e2    = c.createGain();
    e2.gain.setValueAtTime(0, now + 0.02);
    e2.gain.linearRampToValueAtTime(0.45, now + 0.035);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    src.connect(lp); lp.connect(e2); e2.connect(out);
    src.start(now + 0.02); src.stop(now + 0.075);
  }

  function hoverTick(c, out) {
    var now   = c.currentTime;
    var noise = makeNoise(c, 0.012, 0.3);
    var src   = c.createBufferSource(); src.buffer = noise;
    var hp    = makeFilter(c, "highpass", 4000);
    var env   = c.createGain();
    env.gain.setValueAtTime(0.35, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    src.connect(hp); hp.connect(env); env.connect(out);
    src.start(now); src.stop(now + 0.014);
  }

  function backToTop(c, out) {
    var now   = c.currentTime;
    var noise = makeNoise(c, 0.1, 0.4);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = c.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 0.5;
    bp.frequency.setValueAtTime(800, now);
    bp.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
    var env = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.55, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + 0.13);
  }

  function quizComplete(c, out) {
    var now   = c.currentTime;
    var rev   = makeReverb(c, 1.5, 2.5);
    rev.connect(out);
    var noise = makeNoise(c, 0.2, 0.45);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 2400, 0.6);
    var env   = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src.connect(bp); bp.connect(env); env.connect(rev);
    src.start(now); src.stop(now + 0.23);
    [[392, 0.18, 0.16], [523, 0.30, 0.13], [659, 0.42, 0.10]].forEach(function (p) {
      var t   = now + p[1];
      var osc = c.createOscillator();
      var g   = c.createGain();
      osc.type = "sine";
      osc.frequency.value = p[0];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p[2], t + 0.009);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(rev);
      osc.start(t); osc.stop(t + 0.51);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     ② EIGENE IDEEN — spezielle Momente
  ═══════════════════════════════════════════════════════════════ */

  /**
   * IOC-Vote „Ja" — kurzes triumphales Motiv
   * Drei aufsteigende Töne, wie ein kleines Fanfaren-Fragment.
   * Klingt fast zynisch angesichts des historischen Kontexts.
   */
  function iocYesFanfare(c, out) {
    var rev = makeReverb(c, 1.2, 2.0);
    rev.connect(out);
    [[392, 0,    0.22],
     [494, 0.12, 0.20],
     [587, 0.24, 0.24]].forEach(function (p) {
      var t   = c.currentTime + p[1];
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "square";
      // Leicht gedämpft — keine echte Fanfare, eher die Erinnerung daran
      var lp = makeFilter(c, "lowpass", 800, 0.7);
      osc.frequency.value = p[0];
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(p[2] * 0.5, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(lp); lp.connect(env); env.connect(rev);
      osc.start(t); osc.stop(t + 0.29);
    });
  }

  /**
   * IOC-Vote „Nein" — melancholisches Motiv
   * Zwei absteigende Töne, wie ein Seufzen.
   */
  function iocNoElegy(c, out) {
    var rev = makeReverb(c, 1.5, 3.0);
    rev.connect(out);
    [[330, 0,    0.18],
     [277, 0.18, 0.16]].forEach(function (p) {
      var t   = c.currentTime + p[1];
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p[0], t);
      osc.frequency.linearRampToValueAtTime(p[0] * 0.96, t + 0.25);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(p[2], t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(env); env.connect(rev);
      osc.start(t); osc.stop(t + 0.41);
    });
  }

  /**
   * Telegraphen-Morsecode
   * Spielt „SOS" in leisen Klick-Tönen.
   * Einmalig beim ersten Sichtbarwerden der Chronologie.
   */
  function morseSOSTelegraph(c, out) {
    // SOS: ... --- ...
    var pattern = [
      80, 0, 80, 0, 80, 0,        // S (drie kurze)
      240, 0, 240, 0, 240, 0,     // O (drei lange)
      80, 0, 80, 0, 80            // S (drie kurze)
    ];
    var now     = c.currentTime + 0.3;
    var cursor  = 0;
    var unitMs  = 0.09; // Sekunden pro Einheit

    pattern.forEach(function (dur, idx) {
      if (idx % 2 === 0) {
        // Ton
        var t      = now + cursor;
        var durSec = dur / 1000 * (unitMs / 0.08);
        var osc    = c.createOscillator();
        var env    = c.createGain();
        osc.type = "sine";
        osc.frequency.value = 680; // Typischer Telegraphen-Ton
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.35, t + 0.006);
        env.gain.linearRampToValueAtTime(0.35, t + durSec - 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, t + durSec);
        osc.connect(env); env.connect(out);
        osc.start(t); osc.stop(t + durSec + 0.01);
        cursor += durSec + 0.055; // Pause nach Ton
      }
    });
  }

  /**
   * Windhauch
   * Kurzes, fast unhörbares Rauschen — wie Wind über ein Feld.
   * Beim Scroll über den Marzahn-Abschnitt.
   */
  function windGust(c, out) {
    var now  = c.currentTime;
    var dur  = 2.8;
    var buf  = makePinkNoise(c, dur);
    var src  = c.createBufferSource(); src.buffer = buf;
    var lp   = makeFilter(c, "lowpass", 400, 0.4);
    var env  = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.55, now + 0.6);
    env.gain.linearRampToValueAtTime(0.7, now + 1.2);
    env.gain.linearRampToValueAtTime(0.3, now + 2.2);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp); lp.connect(env); env.connect(out);
    src.start(now); src.stop(now + dur + 0.05);
  }

  /**
   * Namenswand-Drone
   * Eine sehr leise, warme Drone — wie Stille, die klingt.
   * Startet wenn die Namen-Wand sichtbar wird, läuft 12 Sekunden.
   */
  function namesWallDrone(c, out) {
    var now = c.currentTime;
    var dur = 12.0;

    // Grundton D2 (sehr tief, kaum hörbar)
    [73.4, 110.0, 146.8].forEach(function (freq, idx) {
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Leichte Verstimmung für Lebendigkeit
      osc.detune.value = (idx - 1) * 4;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.12 - idx * 0.03, now + 2.5);
      env.gain.linearRampToValueAtTime(0.10 - idx * 0.02, now + dur - 2.5);
      env.gain.linearRampToValueAtTime(0, now + dur);
      var lp = makeFilter(c, "lowpass", 300, 0.5);
      osc.connect(lp); lp.connect(env); env.connect(out);
      osc.start(now); osc.stop(now + dur + 0.1);
    });

    // Oberton: sehr leise hohe Streicher-Imitation
    var osc2 = c.createOscillator();
    var e2   = c.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.value = 220;
    var lp2 = makeFilter(c, "lowpass", 600, 2.0);
    e2.gain.setValueAtTime(0, now);
    e2.gain.linearRampToValueAtTime(0.025, now + 3.5);
    e2.gain.linearRampToValueAtTime(0.018, now + dur - 3.0);
    e2.gain.linearRampToValueAtTime(0, now + dur);
    osc2.connect(lp2); lp2.connect(e2); e2.connect(out);
    osc2.start(now); osc2.stop(now + dur + 0.1);
  }

  /* ═══════════════════════════════════════════════════════════════
     ③ ATMOSPHÄRISCHER AMBIENT
     Kontinuierlicher Hintergrund, der mit dem Kapitel wechselt.
  ═══════════════════════════════════════════════════════════════ */

  var ambientNodes = []; // Aktuell laufende Ambient-Nodes
  var ambientGain  = null;
  var currentZone  = null;

  /**
   * Alle aktuellen Ambient-Nodes sanft ausblenden und stoppen.
   */
  function stopAmbient() {
    if (!ambientGain) return;
    var now = getCtx().currentTime;
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(0, now + CFG.fadeTime);
    var nodesToStop = ambientNodes.slice();
    setTimeout(function () {
      nodesToStop.forEach(function (n) {
        try { n.stop(); n.disconnect(); } catch (_) {}
      });
    }, (CFG.fadeTime + 0.3) * 1000);
    ambientNodes = [];
    ambientGain  = null;
  }

  /**
   * Neuen Ambient-Zustand starten.
   * fn(c, ambientOut) baut die Nodes und gibt sie in ambientNodes.
   */
  function startAmbient(fn) {
    if (muted || prefersReducedMotion) return;
    stopAmbient();
    var c   = getCtx();
    var now = c.currentTime;

    ambientGain = c.createGain();
    ambientGain.gain.setValueAtTime(0, now);
    ambientGain.gain.linearRampToValueAtTime(CFG.atmosphere, now + CFG.fadeTime);
    ambientGain.connect(masterGain);

    fn(c, ambientGain);
  }

  /**
   * ZONE A: „Die Fassade" (Kapitel I)
   * Sehr leises, warmes Surren + gelegentliches fernes Gemurmel.
   * Klingt wie eine Menschenmenge hinter dicken Wänden.
   */
  function ambientFassade(c, out) {
    // Warmes Grundrauschen
    var dur  = 20.0;
    var buf  = makePinkNoise(c, dur);
    var src  = c.createBufferSource();
    src.buffer = buf;
    src.loop   = true;
    var lp = makeFilter(c, "lowpass", 320, 0.4);
    src.connect(lp); lp.connect(out);
    src.start();
    ambientNodes.push(src);

    // Leise Sinusdrone auf A2 — warm, neutral
    [110, 165, 220].forEach(function (freq, i) {
      var osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = i * 3;
      var g = c.createGain(); g.gain.value = 0.06 - i * 0.015;
      osc.connect(g); g.connect(out);
      osc.start();
      ambientNodes.push(osc);
    });
  }

  /**
   * ZONE B: „Die Realität" (Kapitel II–III, Marzahn, Bergmann)
   * Tiefes Grollen + leise Dissonanz.
   * Die Fröhlichkeit ist weg. Nur noch Stille und Unbehagen.
   */
  function ambientRealitaet(c, out) {
    // Tiefes Pink-Rauschen, sehr abgedämpft
    var dur = 30.0;
    var buf = makePinkNoise(c, dur);
    var src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    var lp = makeFilter(c, "lowpass", 180, 0.3);
    var g  = c.createGain(); g.gain.value = 0.5;
    src.connect(lp); lp.connect(g); g.connect(out);
    src.start();
    ambientNodes.push(src);

    // Dissonante Drone: E und F gleichzeitig (kleiner Halbton-Abstand)
    // Das ist musikalisch unbequem — beabsichtigt.
    [[82.4, 0.07], [87.3, 0.05], [65.4, 0.04]].forEach(function (p) {
      var osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = p[0];
      // Langsames Vibrato
      var lfo     = c.createOscillator();
      var lfoGain = c.createGain();
      lfo.frequency.value = 0.18;
      lfoGain.gain.value  = 0.8;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      lfo.start(); ambientNodes.push(lfo);
      var g2 = c.createGain(); g2.gain.value = p[1];
      osc.connect(g2); g2.connect(out);
      osc.start(); ambientNodes.push(osc);
    });
  }

  /**
   * ZONE C: „Gedenken / Namen" (Kapitel V, VIII)
   * Äußerste Stille. Nur ein ganz leiser tiefer Ton.
   * Respektvolle Stille.
   */
  function ambientGedenken(c, out) {
    // Fast nur Stille. Ein einziger, sehr leiser tiefer Ton.
    var osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 55; // A1 — sehr tief, kaum hörbar
    var g = c.createGain(); g.gain.value = 0.04;
    osc.connect(g); g.connect(out);
    osc.start();
    ambientNodes.push(osc);

    // Ganz leises Rauschen — wie Stille in einem Archivraum
    var dur = 30.0;
    var buf = makePinkNoise(c, dur);
    var src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    var lp = makeFilter(c, "lowpass", 120, 0.2);
    var gN = c.createGain(); gN.gain.value = 0.3;
    src.connect(lp); lp.connect(gN); gN.connect(out);
    src.start();
    ambientNodes.push(src);
  }

  /**
   * ZONE D: „Quiz" (Kapitel VI)
   * Neutrales leises Ticken — eine Uhr.
   * Zählt die Zeit, während man antwortet.
   */
  function ambientQuiz(c, out) {
    // Uhr-Ticken: alle 0.8 Sekunden ein kurzer Klick
    var tickInterval = 0.8;
    var totalTicks   = 40; // Läuft ~32 Sekunden
    var now          = c.currentTime;

    for (var i = 0; i < totalTicks; i++) {
      (function (idx) {
        var t     = now + idx * tickInterval;
        var noise = makeNoise(c, 0.008, 0.2);
        var src   = c.createBufferSource(); src.buffer = noise;
        var hp    = makeFilter(c, "highpass", 3500);
        var env   = c.createGain();
        env.gain.setValueAtTime(0.5, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
        src.connect(hp); hp.connect(env); env.connect(out);
        src.start(t); src.stop(t + 0.01);
        ambientNodes.push(src);
      })(i);
    }
  }

  /**
   * ZONE E: „Sportswashing / Reflexion" (Kapitel VII)
   * Leise moderne Drone — kein Vintage mehr.
   * Die Geschichte ist heute. Nüchterner, klarer Ton.
   */
  function ambientHeute(c, out) {
    var osc1 = c.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 120;
    var g1 = c.createGain(); g1.gain.value = 0.06;
    osc1.connect(g1); g1.connect(out);
    osc1.start(); ambientNodes.push(osc1);

    var osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 180;
    osc2.detune.value = 7; // Leichte Verstimmung
    var g2 = c.createGain(); g2.gain.value = 0.04;
    osc2.connect(g2); g2.connect(out);
    osc2.start(); ambientNodes.push(osc2);

    // Sehr leises Hochton-Flirren
    var osc3 = c.createOscillator();
    osc3.type = "sine";
    osc3.frequency.value = 3400;
    var lfo3 = c.createOscillator();
    var lg3  = c.createGain(); lg3.gain.value = 3;
    lfo3.frequency.value = 0.4;
    lfo3.connect(lg3); lg3.connect(osc3.frequency);
    lfo3.start(); ambientNodes.push(lfo3);
    var g3 = c.createGain(); g3.gain.value = 0.008;
    osc3.connect(g3); g3.connect(out);
    osc3.start(); ambientNodes.push(osc3);
  }

  /* ═══════════════════════════════════════════════════════════════
     SCROLL-BASIERTE AMBIENT-STEUERUNG
  ═══════════════════════════════════════════════════════════════ */

  // Welche Zone ist aktiv basierend auf Scroll-Position?
  var ZONE_MAP = [
    { id: "s-fassade",       zone: "fassade"   },
    { id: "s-riefen",        zone: "fassade"   },
    { id: "s-brief",         zone: "realitaet" },
    { id: "s-slider",        zone: "realitaet" },
    { id: "zone-chron",      zone: "realitaet" },
    { id: "zone-map",        zone: "realitaet" },
    { id: "s-bergmann",      zone: "realitaet" },
    { id: "s-kartei",        zone: "realitaet" },
    { id: "zone-owens",      zone: "realitaet" },
    { id: "s-marzahn",       zone: "realitaet" },
    { id: "s-boykott",       zone: "realitaet" },
    { id: "s-int-stimmen",   zone: "realitaet" },
    { id: "s-plakate",       zone: "fassade"   },
    { id: "s-taeter",        zone: "realitaet" },
    { id: "zone-quotes",     zone: "gedenken"  },
    { id: "zone-memorial",   zone: "gedenken"  },
    { id: "zone-flatow",     zone: "gedenken"  },
    { id: "zone-dilemmas",   zone: "realitaet" },
    { id: "quiz-sec",        zone: "quiz"      },
    { id: "zone-ref",        zone: "heute"     },
    { id: "zone-sportswashing", zone: "heute"  },
    { id: "zone-epilog-tl",  zone: "gedenken"  },
    { id: "wall-names",      zone: "gedenken"  },
    { id: "zone-links",      zone: "heute"     },
  ];

  var AMBIENT_FNS = {
    fassade:   ambientFassade,
    realitaet: ambientRealitaet,
    gedenken:  ambientGedenken,
    quiz:      ambientQuiz,
    heute:     ambientHeute,
  };

  function updateAmbientZone() {
    var scrollMid = window.scrollY + window.innerHeight * 0.55;
    var best = null;
    var bestTop = -Infinity;

    ZONE_MAP.forEach(function (entry) {
      var el = document.getElementById(entry.id);
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= scrollMid && top > bestTop) {
        bestTop = top;
        best = entry.zone;
      }
    });

    // Hero / Anfang der Seite
    if (window.scrollY < 200) best = null;

    if (best !== currentZone) {
      currentZone = best;
      if (best && AMBIENT_FNS[best]) {
        startAmbient(AMBIENT_FNS[best]);
      } else {
        stopAmbient();
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     EINMALIGE SPEZIAL-TRIGGER (IntersectionObserver)
  ═══════════════════════════════════════════════════════════════ */

  var specialFired = {}; // Verhindert Mehrfach-Auslösung

  function setupSpecialTriggers() {
    var triggers = [
      // Telegraphen-Morse beim ersten Erscheinen der Chronologie
      {
        id: "zone-chron",
        key: "morse",
        fn: function () {
          setTimeout(function () {
            play(morseSOSTelegraph, CFG.ambient * 1.5);
          }, 800);
        }
      },
      // Windhauch beim Marzahn-Abschnitt
      {
        id: "s-marzahn",
        key: "wind",
        fn: function () {
          setTimeout(function () {
            play(windGust, CFG.ambient * 2.0);
          }, 400);
        }
      },
      // Namen-Wand: leise Drone + einmaliges Gedenk-Klang
      {
        id: "wall-names",
        key: "names",
        fn: function () {
          setTimeout(function () {
            play(namesWallDrone, CFG.ambient * 1.8);
          }, 200);
        }
      },
    ];

    triggers.forEach(function (trigger) {
      var el = document.getElementById(trigger.id);
      if (!el) return;

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !specialFired[trigger.key]) {
            specialFired[trigger.key] = true;
            trigger.fn();
            obs.disconnect();
          }
        });
      }, { threshold: 0.25 });

      obs.observe(el);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     MUTE-BUTTON (einfach, kein Panel)
  ═══════════════════════════════════════════════════════════════ */

  function createMuteButton() {
    var btn = document.createElement("button");
    btn.id = "sound-mute-btn";
    btn.setAttribute("aria-label", "Sounds ausschalten");
    btn.setAttribute("title",      "Sounds ein / aus");
    btn.textContent = "🔔";
    btn.style.cssText = [
      "position:fixed",
      "top:14px",
      "right:118px",
      "z-index:9502",
      "width:36px",
      "height:36px",
      "border-radius:50%",
      "background:rgba(11,37,69,.88)",
      "border:1px solid var(--gold,#C8A96E)",
      "color:var(--gold,#C8A96E)",
      "font-size:.9rem",
      "cursor:pointer",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "backdrop-filter:blur(8px)",
      "-webkit-backdrop-filter:blur(8px)",
      "transition:background .3s,opacity .3s",
      "line-height:1",
    ].join(";");

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      muted = !muted;

      if (muted) {
        btn.textContent = "🔕";
        btn.setAttribute("aria-label", "Sounds einschalten");
        btn.style.opacity = "0.52";
        // Ambient sanft ausblenden
        if (ambientGain && ctx) {
          var now = ctx.currentTime;
          ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
          ambientGain.gain.linearRampToValueAtTime(0, now + 1.2);
        }
      } else {
        btn.textContent = "🔔";
        btn.setAttribute("aria-label", "Sounds ausschalten");
        btn.style.opacity = "1";
        // Ambient wieder einblenden
        if (ambientGain && ctx) {
          var now2 = ctx.currentTime;
          ambientGain.gain.setValueAtTime(0, now2);
          ambientGain.gain.linearRampToValueAtTime(CFG.atmosphere, now2 + 1.5);
        }
        play(hoverTick, CFG.hover);
      }
    });

    document.body.appendChild(btn);
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENT-BINDINGS
  ═══════════════════════════════════════════════════════════════ */

  function bind() {

    /* ── CLICK-DELEGATION ── */
    document.addEventListener("click", function (e) {
      var t = e.target;

      if (t.closest && t.closest(".flip-w")) {
        play(paperRustle, CFG.interaction); return;
      }
      if (t.classList.contains("protocol-btn")) {
        play(paperRustle, CFG.interaction); return;
      }
      if (t.classList.contains("persp-btn")) {
        play(typewriterKey, CFG.interaction); return;
      }
      if (t.classList.contains("qbtn") && !t.disabled) {
        play(penScratch, CFG.interaction); return;
      }
      if (t.classList.contains("dilemma-btn")) {
        play(stamp, CFG.interaction); return;
      }
      if (t.classList.contains("ioc-btn")) {
        // Spezieller Sound je nach Wahl
        if (t.classList.contains("yes")) {
          play(stamp, CFG.interaction);
          setTimeout(function () {
            play(iocYesFanfare, CFG.ambient * 2.2);
          }, 120);
        } else {
          play(stamp, CFG.interaction);
          setTimeout(function () {
            play(iocNoElegy, CFG.ambient * 2.5);
          }, 120);
        }
        return;
      }
      if (t.closest && t.closest(".poster-card")) {
        play(reveal, CFG.interaction); return;
      }
      if (t.closest && t.closest(".map-pin")) {
        play(pinClick, CFG.interaction); return;
      }
      if (t.classList.contains("q-filter-btn")) {
        play(typewriterKey, CFG.interaction); return;
      }
      if (t.id === "pill" || (t.closest && t.closest("#pill"))) {
        var cm = document.getElementById("chapter-menu");
        play(cm && cm.classList.contains("show") ? drawerClose : drawerOpen, CFG.interaction);
        return;
      }
      if (t.id === "glossary-btn" || (t.closest && t.closest("#glossary-btn"))) {
        var gp = document.getElementById("glossary-panel");
        play(gp && gp.classList.contains("show") ? drawerClose : drawerOpen, CFG.interaction);
        return;
      }
      if (t.id === "back-to-top" || (t.closest && t.closest("#back-to-top"))) {
        play(backToTop, CFG.interaction); return;
      }
      if (t.classList.contains("xbtn") || (t.closest && t.closest(".xbtn"))) {
        play(reveal, CFG.interaction); return;
      }
      if (t.classList.contains("read-more") || (t.closest && t.closest(".read-more"))) {
        play(typewriterKey, CFG.interaction); return;
      }
      if ((t.closest && t.closest(".foot-nav a")) ||
          (t.closest && t.closest("#chapter-menu a"))) {
        play(typewriterKey, CFG.interaction); return;
      }
      if (t.id === "qreset") {
        play(paperRustle, CFG.interaction); return;
      }
      if (t.classList.contains("print-btn") || (t.closest && t.closest(".print-btn"))) {
        play(paperRustle, CFG.interaction); return;
      }
    });

    /* ── QUIZ: Richtig / Falsch ── */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.classList.contains("qbtn")) return;
      setTimeout(function () {
        if (t.classList.contains("correct"))    play(correctBell, CFG.interaction);
        else if (t.classList.contains("wrong")) play(wrongBass, CFG.interaction);
      }, 35);
    });

    /* ── QUIZ: Abschluss ── */
    var qres = document.getElementById("qres");
    if (qres) {
      var qObs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].attributeName === "style" &&
              qres.style.display !== "none" &&
              qres.style.display !== "") {
            setTimeout(function () { play(quizComplete, CFG.interaction); }, 200);
            qObs.disconnect();
            break;
          }
        }
      });
      qObs.observe(qres, { attributes: true });
    }

    /* ── HOVER (nur Desktop) ── */
    if (window.matchMedia("(hover: hover)").matches) {
      var hTh = throttle(function () { play(hoverTick, CFG.hover); }, 420);
      var nTh = throttle(function () { play(hoverTick, CFG.hover * 0.6); }, 650);
      var mTh = throttle(function () { play(hoverTick, CFG.hover); }, 520);

      document.addEventListener("mouseover", function (e) {
        var t = e.target;
        if (t.classList.contains("dilemma-btn") ||
            t.classList.contains("ioc-btn") ||
            (t.classList.contains("qbtn") && !t.disabled)) {
          hTh();
        }
        if (t.closest && t.closest(".names-scroll span")) nTh();
        if (t.closest && t.closest(".mem-tile"))          mTh();
      });
    }

    /* ── GLOSSAR-SUCHE: Tippen ── */
    var gs = document.getElementById("glossary-search");
    if (gs) {
      gs.addEventListener("input", throttle(function () {
        play(typewriterKey, CFG.interaction * 0.5);
      }, 130));
    }

    /* ── TASTATUR ── */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target;
      if (t.closest && t.closest(".flip-w"))      { play(paperRustle, CFG.interaction);  return; }
      if (t.closest && t.closest(".poster-card")) { play(reveal, CFG.interaction);        return; }
      if (t.closest && t.closest(".map-pin"))     { play(pinClick, CFG.interaction);      return; }
      if (t.classList.contains("persp-btn"))      { play(typewriterKey, CFG.interaction); return; }
    });

    /* ── SCROLL: Ambient-Zone updaten (throttled) ── */
    window.addEventListener("scroll", throttle(updateAmbientZone, 400), { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════ */

  function init() {
    if (prefersReducedMotion) {
      console.info("[sounds.js] prefers-reduced-motion — alles deaktiviert.");
      return;
    }

    createMuteButton();
    bind();
    setupSpecialTriggers();

    console.info(
      "[sounds.js] v3.0 bereit.\n" +
      "  Interaktions-Sounds: 13\n" +
      "  Ambient-Zonen: Fassade · Realität · Gedenken · Quiz · Heute\n" +
      "  Spezial-Trigger: Telegraphen-Morse · Windhauch · Namenswand-Drone\n" +
      "  IOC-Vote: Fanfare (Ja) · Elegie (Nein)\n" +
      "  Mute-Button: #sound-mute-btn"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
