/**
 * ═══════════════════════════════════════════════════════════════════
 *  sounds.js  —  „Die zwei Gesichter von 1936"
 *  Version 2.0
 * ═══════════════════════════════════════════════════════════════════
 *
 *  ARCHITEKTUR
 *  ───────────
 *  Alle Sounds sind 100 % synthetisch via Web Audio API.
 *  Keine externen Dateien, kein CORS, kein Ladezeit-Overhead.
 *
 *  EINBINDUNG (GitHub)
 *  ───────────────────
 *  sounds.js ins Root-Verzeichnis legen (neben index.html), dann
 *  am Ende von <body>, NACH dem bestehenden <script>-Block:
 *
 *      <script src="sounds.js"></script>
 *
 *  BARRIEREFREIHEIT
 *  ────────────────
 *  • prefers-reduced-motion → Sounds komplett deaktiviert
 *  • 🔔-Button oben rechts: Klick 1 = Panel öffnen (Lautstärke-Regler)
 *    Klick 2 (Panel offen) = Mute-Toggle
 *  • Tastatur-Bindings: Enter / Space auf Flip-Karten, Poster, Pins
 *  • Alle Interaktionen bleiben ohne Sounds vollständig nutzbar
 *
 *  SOUND-PHILOSOPHIE
 *  ─────────────────
 *  Kein Blockbuster-Design. Stattdessen:
 *  Archiv-Stille, Zeitungsrascheln, Stempel, Schreibmaschine,
 *  gedämpfte Glocke, Nadelklick, Federkratzen.
 *  Die Sounds erinnern an ein Archiv von 1936, nicht an eine App.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     KERN-INFRASTRUKTUR
  ═══════════════════════════════════════════════════════════════ */

  let ctx        = null;
  let masterGain = null;
  let muted      = false;
  let volume     = 0.42; // 0.0 – 1.0

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /** Lazy-init AudioContext (Autoplay-Policy-konform) */
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /** Sound-Generator abspielen */
  function play(fn) {
    if (muted || prefersReducedMotion) return;
    try { fn(getCtx(), masterGain); }
    catch (_) { /* Kein Sound = kein Problem */ }
  }

  /** Lautstärke live anpassen */
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = volume;
  }

  /* ═══════════════════════════════════════════════════════════════
     HILFSFUNKTIONEN
  ═══════════════════════════════════════════════════════════════ */

  /** Weißes Rauschen als AudioBuffer */
  function makeNoise(c, duration, amplitude) {
    amplitude = amplitude !== undefined ? amplitude : 1.0;
    var len = Math.ceil(c.sampleRate * duration);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d   = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * amplitude;
    return buf;
  }

  /** Biquad-Filter anlegen */
  function makeFilter(c, type, freq, Q) {
    Q = Q !== undefined ? Q : 1.0;
    var f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  }

  /** Throttle-Helper */
  function throttle(fn, ms) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, arguments); }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     SOUND-BIBLIOTHEK
     Alle Funktionen: (c, out) => void
  ═══════════════════════════════════════════════════════════════ */

  /**
   * paperRustle — Zeitungsblättern / Seite umdrehen
   * Zweischichtig: scharfer Kracher + weiches Nachrascheln.
   * Einsatz: Flip-Karten, Protokoll-Toggle, Quiz-Reset.
   */
  function paperRustle(c, out) {
    var now = c.currentTime;

    // Schicht 1: harter erster Kontakt
    var n1  = makeNoise(c, 0.08);
    var s1  = c.createBufferSource(); s1.buffer = n1;
    var bp1 = makeFilter(c, "bandpass", 3200, 0.7);
    var e1  = c.createGain();
    e1.gain.setValueAtTime(0, now);
    e1.gain.linearRampToValueAtTime(1.1, now + 0.006);
    e1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    s1.connect(bp1); bp1.connect(e1); e1.connect(out);
    s1.start(now); s1.stop(now + 0.09);

    // Schicht 2: weiches Nachrascheln
    var n2  = makeNoise(c, 0.22, 0.5);
    var s2  = c.createBufferSource(); s2.buffer = n2;
    var bp2 = makeFilter(c, "bandpass", 1800, 0.5);
    var lp2 = makeFilter(c, "lowpass", 4000);
    var e2  = c.createGain();
    e2.gain.setValueAtTime(0, now + 0.04);
    e2.gain.linearRampToValueAtTime(0.55, now + 0.07);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    s2.connect(bp2); bp2.connect(lp2); lp2.connect(e2); e2.connect(out);
    s2.start(now + 0.04); s2.stop(now + 0.29);
  }

  /**
   * typewriterKey — Schreibmaschinen-Taste
   * Harter Rausch-Impuls + kurzes Metall-Ping.
   * Einsatz: Perspektiv-Buttons, Weiterlesen-Links, Nav-Links.
   */
  function typewriterKey(c, out) {
    var now = c.currentTime;

    var noise = makeNoise(c, 0.03);
    var src   = c.createBufferSource(); src.buffer = noise;
    var hp    = makeFilter(c, "highpass", 800, 0.5);
    var lp    = makeFilter(c, "lowpass", 5000);
    var eN    = c.createGain();
    eN.gain.setValueAtTime(0.9, now);
    eN.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    src.connect(hp); hp.connect(lp); lp.connect(eN); eN.connect(out);
    src.start(now); src.stop(now + 0.035);

    // Metall-Ping (Typenhebel trifft Walze)
    var osc  = c.createOscillator();
    var eO   = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
    eO.gain.setValueAtTime(0, now);
    eO.gain.linearRampToValueAtTime(0.18, now + 0.003);
    eO.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(eO); eO.connect(out);
    osc.start(now); osc.stop(now + 0.08);
  }

  /**
   * stamp — Amtlicher Stempel
   * Tiefer Dumpfer + harter Aufschlag-Klick.
   * Einsatz: Dilemma-Buttons, IOC-Vote.
   */
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

    // Aufschlag-Klick
    var noise = makeNoise(c, 0.015, 0.7);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 4500, 1.5);
    var e2    = c.createGain();
    e2.gain.setValueAtTime(1, now);
    e2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    src.connect(bp); bp.connect(e2); e2.connect(out);
    src.start(now); src.stop(now + 0.02);
  }

  /**
   * pinClick — Reißnadel auf Karte
   * Drei harmonische Sine-Töne + kurzer Impuls.
   * Einsatz: Map-Pins auf der Berlin-Karte.
   */
  function pinClick(c, out) {
    var now = c.currentTime;

    [[1400, 0, 0.45], [2100, 0.004, 0.18], [700, 0.008, 0.18]].forEach(function (p) {
      var freq = p[0], delay = p[1], peak = p[2];
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + delay + 0.18);
      env.gain.setValueAtTime(0, now + delay);
      env.gain.linearRampToValueAtTime(peak, now + delay + 0.006);
      env.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
      osc.connect(env); env.connect(out);
      osc.start(now + delay); osc.stop(now + delay + 0.23);
    });

    // Einstich-Impuls
    var noise = makeNoise(c, 0.01, 0.4);
    var src   = c.createBufferSource(); src.buffer = noise;
    var hp    = makeFilter(c, "highpass", 3000);
    var eN    = c.createGain();
    eN.gain.setValueAtTime(0.6, now);
    eN.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    src.connect(hp); hp.connect(eN); eN.connect(out);
    src.start(now); src.stop(now + 0.012);
  }

  /**
   * penScratch — Feder auf rauem Papier
   * Zwei parallele Bandpässe + LFO-Rauigkeit.
   * Einsatz: Quiz-Antwort-Buttons (Auswahl-Moment).
   */
  function penScratch(c, out) {
    var now = c.currentTime;
    var dur = 0.11;

    var noise = makeNoise(c, dur, 0.6);
    var src   = c.createBufferSource(); src.buffer = noise;

    var bp1 = makeFilter(c, "bandpass", 3800, 1.8);
    var bp2 = makeFilter(c, "bandpass", 5200, 2.2);
    var mix = c.createGain(); mix.gain.value = 0.5;

    var env = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.7, now + 0.015);
    env.gain.setValueAtTime(0.7, now + 0.04);
    env.gain.linearRampToValueAtTime(0.5, now + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    // LFO für Pitch-Variation (Schreib-Rauigkeit)
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

  /**
   * reveal — Akte aufschlagen / Enthüllen
   * Rauschen mit Frequenz-Sweep von tief nach hell.
   * Einsatz: Poster-Karten, Expander (.xbtn), Protokoll-Reveal.
   */
  function reveal(c, out) {
    var now = c.currentTime;
    var dur = 0.18;

    var noise = makeNoise(c, dur, 0.55);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(3500, now + dur * 0.6);
    bp.frequency.exponentialRampToValueAtTime(1800, now + dur);

    var env = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.65, now + 0.025);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);

    // Hochton-Layer
    var n2  = makeNoise(c, dur * 0.5, 0.25);
    var s2  = c.createBufferSource(); s2.buffer = n2;
    var hp2 = makeFilter(c, "highpass", 5000);
    var e2  = c.createGain();
    e2.gain.setValueAtTime(0, now + 0.03);
    e2.gain.linearRampToValueAtTime(0.4, now + 0.07);
    e2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
    s2.connect(hp2); hp2.connect(e2); e2.connect(out);
    s2.start(now + 0.03); s2.stop(now + dur * 0.8);

    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + dur + 0.03);
  }

  /**
   * correctBell — Richtig! Gedämpfte Messingglocke
   * C-E-G Dreiklang mit Obertönen, leicht vintage-verstimmt.
   * Einsatz: Richtige Quiz-Antwort.
   */
  function correctBell(c, out) {
    [[262, 0, 0.22], [330, 0.06, 0.19], [392, 0.12, 0.16]].forEach(function (p) {
      var freq = p[0], delay = p[1], peak = p[2];
      var t   = c.currentTime + delay;

      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.003, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(peak, t + 0.007);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(env); env.connect(out);
      osc.start(t); osc.stop(t + 0.56);

      // Glocken-Partial (inharmonischer Oberton)
      var osc2 = c.createOscillator();
      var e2   = c.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2.756;
      e2.gain.setValueAtTime(0, t);
      e2.gain.linearRampToValueAtTime(peak * 0.12, t + 0.005);
      e2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc2.connect(e2); e2.connect(out);
      osc2.start(t); osc2.stop(t + 0.19);
    });
  }

  /**
   * wrongBass — Falsch! Dumpfer Schluss
   * Tiefer Ton mit schnellem Decay + Aufschlag-Rauschen.
   * Einsatz: Falsche Quiz-Antwort.
   */
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

    var noise = makeNoise(c, 0.02, 0.4);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 800, 1.2);
    var eN    = c.createGain();
    eN.gain.setValueAtTime(0.5, now);
    eN.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    src.connect(bp); bp.connect(eN); eN.connect(out);
    src.start(now); src.stop(now + 0.022);
  }

  /**
   * drawerOpen — Schublade / Menü öffnet sich
   * Leises Holzkratzen + Einrast-Ton.
   * Einsatz: Kapitelmenü öffnen, Glossar öffnen.
   */
  function drawerOpen(c, out) {
    var now = c.currentTime;

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

  /**
   * drawerClose — Schublade / Menü schließt sich
   * Umgekehrte Reihenfolge: Klick zuerst, dann Gleiten.
   * Einsatz: Kapitelmenü schließen, Glossar schließen.
   */
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

  /**
   * hoverTick — Miniaturklick für Hover
   * Kaum hörbar, aber spürbar wahrnehmbar.
   * Einsatz: Hover auf Dilemma-/IOC-/Quiz-Buttons, Memorial-Tiles.
   */
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

  /**
   * sliderScrape — Slider gleitet
   * Kurzes Kratzen wie auf rauem Papier.
   * Einsatz: Vergleichs-Slider (throttled).
   */
  function sliderScrape(c, out) {
    var now = c.currentTime;
    var dur = 0.08;
    var noise = makeNoise(c, dur, 0.3);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 2200, 0.9);
    var env   = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.01);
    env.gain.linearRampToValueAtTime(0.4, now + dur - 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + dur + 0.01);
  }

  /**
   * quizComplete — Quiz abgeschlossen
   * Papier ablegen + zwei abschließende Töne.
   * Einsatz: Wenn alle 10 Fragen beantwortet sind.
   */
  function quizComplete(c, out) {
    var now = c.currentTime;

    var noise = makeNoise(c, 0.2, 0.45);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 2400, 0.6);
    var env   = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.6, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + 0.23);

    [[392, 0.15, 0.18], [523, 0.26, 0.14]].forEach(function (p) {
      var freq = p[0], delay = p[1], peak = p[2];
      var t   = now + delay;
      var osc = c.createOscillator();
      var g   = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.009);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.41);
    });
  }

  /**
   * backToTop — Nach oben scrollen
   * Kurzes luftiges Whoosh mit aufsteigendem Filter.
   * Einsatz: Zurück-nach-oben-Button.
   */
  function backToTop(c, out) {
    var now   = c.currentTime;
    var noise = makeNoise(c, 0.1, 0.4);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.5;
    bp.frequency.setValueAtTime(800, now);
    bp.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
    var env = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.55, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + 0.13);
  }

  /**
   * nameWhisper — Namen-Wand Hover
   * Allerfeinstes Flüstern — fast unhörbar.
   * Einsatz: Hover auf einzelnen Namen in der Namen-Wand.
   */
  function nameWhisper(c, out) {
    var now   = c.currentTime;
    var noise = makeNoise(c, 0.06, 0.15);
    var src   = c.createBufferSource(); src.buffer = noise;
    var bp    = makeFilter(c, "bandpass", 2000, 1.5);
    var env   = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(now); src.stop(now + 0.065);
  }

  /* ═══════════════════════════════════════════════════════════════
     SOUND-PANEL (Mute-Button + Lautstärke-Regler)
  ═══════════════════════════════════════════════════════════════ */

  function createSoundPanel() {
    var wrap = document.createElement("div");
    wrap.id = "sound-panel";
    wrap.setAttribute("aria-label", "Sound-Einstellungen");
    wrap.style.cssText = [
      "position:fixed",
      "top:14px",
      "right:118px",
      "z-index:9502",
      "display:flex",
      "align-items:center",
      "gap:6px",
    ].join(";");

    /* ── Mute-Button ── */
    var btn = document.createElement("button");
    btn.id = "sound-mute-btn";
    btn.setAttribute("aria-label", "Sound-Einstellungen öffnen");
    btn.setAttribute("title",      "Sounds ein/aus & Lautstärke");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "🔔";
    btn.style.cssText = [
      "width:36px",
      "height:36px",
      "border-radius:50%",
      "background:rgba(11,37,69,.9)",
      "border:1px solid var(--gold,#C8A96E)",
      "color:var(--gold,#C8A96E)",
      "font-size:.95rem",
      "cursor:pointer",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "backdrop-filter:blur(8px)",
      "-webkit-backdrop-filter:blur(8px)",
      "transition:background .3s,opacity .3s",
      "line-height:1",
      "flex-shrink:0",
    ].join(";");

    /* ── Lautstärke-Panel ── */
    var volWrap = document.createElement("div");
    volWrap.id = "sound-vol-wrap";
    volWrap.style.cssText = [
      "display:flex",
      "align-items:center",
      "background:rgba(11,37,69,.9)",
      "border:1px solid var(--gold,#C8A96E)",
      "border-radius:20px",
      "padding:0 10px",
      "height:36px",
      "gap:7px",
      "backdrop-filter:blur(8px)",
      "-webkit-backdrop-filter:blur(8px)",
      "overflow:hidden",
      "max-width:0",
      "opacity:0",
      "pointer-events:none",
      "transition:max-width .35s cubic-bezier(.4,0,.2,1),opacity .28s ease",
    ].join(";");

    var volIcon = document.createElement("span");
    volIcon.textContent = "🎚";
    volIcon.setAttribute("aria-hidden", "true");
    volIcon.style.cssText = "font-size:.8rem;flex-shrink:0;";

    var slider = document.createElement("input");
    slider.type = "range";
    slider.min  = "0";
    slider.max  = "100";
    slider.value = String(Math.round(volume * 100));
    slider.setAttribute("aria-label", "Lautstärke");
    slider.style.cssText = [
      "width:72px",
      "accent-color:var(--gold,#C8A96E)",
      "cursor:pointer",
      "height:3px",
      "flex-shrink:0",
    ].join(";");

    var volLabel = document.createElement("span");
    volLabel.textContent = slider.value + "%";
    volLabel.style.cssText = [
      "font-family:'Source Sans 3',sans-serif",
      "font-size:.6rem",
      "color:var(--gold,#C8A96E)",
      "min-width:28px",
      "text-align:right",
      "letter-spacing:.04em",
    ].join(";");

    /* ── Trennlinie im Panel ── */
    var sep = document.createElement("div");
    sep.setAttribute("aria-hidden", "true");
    sep.style.cssText = [
      "width:1px",
      "height:16px",
      "background:rgba(200,169,110,.3)",
      "flex-shrink:0",
    ].join(";");

    /* ── Mute-Toggle im Panel ── */
    var muteInner = document.createElement("button");
    muteInner.textContent = "🔊";
    muteInner.setAttribute("aria-label", "Ton ein/aus");
    muteInner.setAttribute("title", "Ton stumm schalten");
    muteInner.style.cssText = [
      "background:transparent",
      "border:none",
      "color:var(--gold,#C8A96E)",
      "font-size:.85rem",
      "cursor:pointer",
      "padding:0",
      "line-height:1",
      "flex-shrink:0",
    ].join(";");

    volWrap.appendChild(volIcon);
    volWrap.appendChild(slider);
    volWrap.appendChild(volLabel);
    volWrap.appendChild(sep);
    volWrap.appendChild(muteInner);

    /* ── Events ── */
    slider.addEventListener("input", function () {
      var v = parseInt(this.value) / 100;
      setVolume(v);
      volLabel.textContent = this.value + "%";
      if (v === 0) {
        muted = true;
        btn.textContent = "🔕";
        muteInner.textContent = "🔇";
        btn.style.opacity = "0.5";
      } else if (muted) {
        muted = false;
        btn.textContent = "🔔";
        muteInner.textContent = "🔊";
        btn.style.opacity = "1";
      }
    });

    muteInner.addEventListener("click", function (e) {
      e.stopPropagation();
      muted = !muted;
      btn.textContent      = muted ? "🔕" : "🔔";
      muteInner.textContent = muted ? "🔇" : "🔊";
      btn.style.opacity    = muted ? "0.5" : "1";
      btn.setAttribute("aria-label", muted ? "Sounds einschalten" : "Sounds ausschalten");
      if (!muted) {
        setVolume(parseInt(slider.value) / 100);
        play(hoverTick);
      }
    });

    var panelOpen = false;

    function openPanel() {
      panelOpen = true;
      volWrap.style.maxWidth    = "180px";
      volWrap.style.opacity     = "1";
      volWrap.style.pointerEvents = "auto";
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Sound-Einstellungen schließen");
    }

    function closePanel() {
      panelOpen = false;
      volWrap.style.maxWidth    = "0";
      volWrap.style.opacity     = "0";
      volWrap.style.pointerEvents = "none";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Sound-Einstellungen öffnen");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!panelOpen) { openPanel(); }
      else            { closePanel(); }
    });

    btn.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });

    document.addEventListener("click", function () {
      if (panelOpen) closePanel();
    });

    volWrap.addEventListener("click", function (e) {
      e.stopPropagation(); // Verhindert das Schließen beim Klick im Panel
    });

    /* DOM zusammenbauen: Regler links vom Button */
    wrap.appendChild(volWrap);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENT-BINDINGS
  ═══════════════════════════════════════════════════════════════ */

  function bind() {

    /* ── CLICK-DELEGATION (zentral) ── */
    document.addEventListener("click", function (e) {
      var t = e.target;

      // Flip-Karten: Zeitungsblättern
      if (t.closest && t.closest(".flip-w")) {
        play(paperRustle); return;
      }

      // Protokoll-Toggle: Akte aufschlagen
      if (t.classList.contains("protocol-btn")) {
        play(paperRustle); return;
      }

      // Perspektiv-Buttons: Schreibmaschinen-Klick
      if (t.classList.contains("persp-btn")) {
        play(typewriterKey); return;
      }

      // Quiz-Antworten: Federkratzen
      if (t.classList.contains("qbtn") && !t.disabled) {
        play(penScratch); return;
      }

      // Dilemma-Buttons: Stempel
      if (t.classList.contains("dilemma-btn")) {
        play(stamp); return;
      }

      // IOC-Vote: Stempel
      if (t.classList.contains("ioc-btn")) {
        play(stamp); return;
      }

      // Poster-Karten: Enthüllen
      if (t.closest && t.closest(".poster-card")) {
        play(reveal); return;
      }

      // Map-Pins: Nadelklick
      if (t.closest && t.closest(".map-pin")) {
        play(pinClick); return;
      }

      // Zitat-Filter: Schreibmaschine
      if (t.classList.contains("q-filter-btn")) {
        play(typewriterKey); return;
      }

      // Kapitelmenü öffnen/schließen
      if (t.id === "pill" || (t.closest && t.closest("#pill"))) {
        var chapterMenu = document.getElementById("chapter-menu");
        var isOpen = chapterMenu && chapterMenu.classList.contains("show");
        play(isOpen ? drawerClose : drawerOpen);
        return;
      }

      // Glossar öffnen/schließen
      if (t.id === "glossary-btn" || (t.closest && t.closest("#glossary-btn"))) {
        var glossaryPanel = document.getElementById("glossary-panel");
        var gpOpen = glossaryPanel && glossaryPanel.classList.contains("show");
        play(gpOpen ? drawerClose : drawerOpen);
        return;
      }

      // Zurück-nach-oben
      if (t.id === "back-to-top" || (t.closest && t.closest("#back-to-top"))) {
        play(backToTop); return;
      }

      // Expander (Mehr anzeigen)
      if (t.classList.contains("xbtn") || (t.closest && t.closest(".xbtn"))) {
        play(reveal); return;
      }

      // Weiterlesen-Links
      if (t.classList.contains("read-more") || (t.closest && t.closest(".read-more"))) {
        play(typewriterKey); return;
      }

      // Footer- und Menü-Links
      if (
        (t.closest && t.closest(".foot-nav a")) ||
        (t.closest && t.closest("#chapter-menu a"))
      ) {
        play(typewriterKey); return;
      }

      // Quiz-Reset: Papier
      if (t.id === "qreset") {
        play(paperRustle); return;
      }

      // Chronologie-Items (Tooltip-Klick)
      if (t.closest && t.closest(".chron-item")) {
        play(hoverTick); return;
      }

      // Drucken-Button
      if (t.classList.contains("print-btn") || (t.closest && t.closest(".print-btn"))) {
        play(paperRustle); return;
      }

      // Kartei-Karten (Desktop-Klick)
      if (t.closest && t.closest(".kartei")) {
        play(hoverTick); return;
      }
    });

    /* ── QUIZ: Richtig / Falsch — Feedback-Sound nach Delay ── */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.classList.contains("qbtn")) return;
      setTimeout(function () {
        if (t.classList.contains("correct"))     play(correctBell);
        else if (t.classList.contains("wrong"))  play(wrongBass);
      }, 35);
    });

    /* ── QUIZ: Abschluss-Sound ── */
    var qres = document.getElementById("qres");
    if (qres) {
      var qObs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === "attributes" && m.attributeName === "style") {
            if (qres.style.display !== "none" && qres.style.display !== "") {
              setTimeout(function () { play(quizComplete); }, 180);
              qObs.disconnect();
              break;
            }
          }
        }
      });
      qObs.observe(qres, { attributes: true });
    }

    /* ── SLIDER: Schleif-Sound beim Ziehen ── */
    var sliderEl = document.getElementById("slider1");
    var sliderHandle = document.getElementById("slider-handle");
    var throttledScrape = throttle(function () { play(sliderScrape); }, 210);

    if (sliderHandle) {
      sliderHandle.addEventListener("mousedown",  function () { play(sliderScrape); });
      sliderHandle.addEventListener("touchstart", function () { play(sliderScrape); }, { passive: true });
    }
    if (sliderEl) {
      sliderEl.addEventListener("mousemove", function (e) {
        if (e.buttons === 1) throttledScrape();
      });
      sliderEl.addEventListener("touchmove", throttledScrape, { passive: true });
    }

    /* ── HOVER-SOUNDS (nur Desktop mit echtem Hover) ── */
    if (window.matchMedia("(hover: hover)").matches) {

      var hoverThrottle  = throttle(function () { play(hoverTick);   }, 400);
      var namesThrottle  = throttle(function () { play(nameWhisper); }, 600);
      var memThrottle    = throttle(function () { play(hoverTick);   }, 500);

      document.addEventListener("mouseover", function (e) {
        var t = e.target;

        // Hover auf Dilemma-, IOC-, Quiz-Buttons
        if (
          t.classList.contains("dilemma-btn") ||
          t.classList.contains("ioc-btn") ||
          (t.classList.contains("qbtn") && !t.disabled)
        ) {
          hoverThrottle();
        }

        // Namen-Wand
        if (t.closest && t.closest(".names-scroll span")) {
          namesThrottle();
        }

        // Memorial-Tiles
        if (t.closest && t.closest(".mem-tile")) {
          memThrottle();
        }
      });
    }

    /* ── KARTEI-SCROLL ── */
    document.querySelectorAll(".kartei-wrap").forEach(function (wrap) {
      wrap.addEventListener("scroll", throttle(function () {
        play(sliderScrape);
      }, 300), { passive: true });
    });

    /* ── GLOSSAR-SUCHE: Tippen ── */
    var glossarySearch = document.getElementById("glossary-search");
    if (glossarySearch) {
      glossarySearch.addEventListener("input", throttle(function () {
        play(typewriterKey);
      }, 120));
    }

    /* ── TASTATUR: Enter/Space auf interaktiven Elementen ── */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target;
      if (t.closest && t.closest(".flip-w"))      { play(paperRustle);  return; }
      if (t.closest && t.closest(".poster-card")) { play(reveal);       return; }
      if (t.closest && t.closest(".map-pin"))     { play(pinClick);     return; }
      if (t.classList.contains("persp-btn"))      { play(typewriterKey); return; }
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════ */

  function init() {
    if (prefersReducedMotion) {
      console.info("[sounds.js] prefers-reduced-motion erkannt — Sounds deaktiviert.");
      return;
    }

    createSoundPanel();
    bind();

    console.info(
      "[sounds.js] v2.0 bereit.\n" +
      "  Sounds: paperRustle · typewriterKey · stamp · pinClick ·\n" +
      "          penScratch · reveal · correctBell · wrongBass ·\n" +
      "          drawerOpen · drawerClose · hoverTick · sliderScrape ·\n" +
      "          quizComplete · backToTop · nameWhisper\n" +
      "  Panel:  #sound-panel (Mute + Lautstärke-Regler)\n" +
      "  Einbindung: <script src=\"sounds.js\"><\/script> vor </body>"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
