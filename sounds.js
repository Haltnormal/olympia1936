/**
 * ═══════════════════════════════════════════════════════════════════
 *  sounds.js  —  „Die zwei Gesichter von 1936"
 *  Version 4.0
 * ═══════════════════════════════════════════════════════════════════
 *
 *  WAS IST NEU IN V4
 *  ─────────────────
 *  ENTFERNT:
 *  • Kein Sound mehr auf „Betrachte als"-Buttons (persp-btn)
 *  • Kein Sound mehr auf „Weiter"-Links (read-more)
 *  • Kein Sound mehr auf Footer-/Menü-Navigations-Links
 *  • Kein Sound mehr auf Zitat-Filter-Buttons
 *  → Alles was sich zu alltäglich oder aufdringlich anfühlte ist weg.
 *    Sounds sind jetzt bedeutungstragende Momente, keine App-Feedback-Töne.
 *
 *  VERFEINERT:
 *  • Flip-Karten: jetzt mit leichtem Nachklang (Papier legt sich)
 *  • Poster-Karten: unterschiedlicher Sound für Öffnen vs. Schließen
 *  • Dilemma: Sound variiert leicht je nach Antwort-Position
 *  • Stempel beim IOC-Vote schwerer, ernster
 *
 *  NEU:
 *  • Schreibmaschinen-Zeilenvorschub beim ersten Sichtbarwerden
 *    jedes neuen Hauptkapitels (einmalig, dezent)
 *  • Seufzen-Sound beim Sichtbarwerden von s-bergmann
 *  • Chronologie: Metronom-Klicken beim Erscheinen (statt Morse)
 *    + Morse bleibt als separater Moment beim Marzahn-Block
 *  • Foto-Moment: leises Kamera-Klicken wenn Poster-Bilder ins Bild scrollen
 *  • Flip-Karte zurückdrehen: anderer Sound als Vorwärts-Drehen
 *  • Brief-Abschnitt (s-brief): leises Briefpapier-Rascheln beim Erscheinen
 *  • Owens-Abschnitt: kurzes Startschuss-ähnliches Knacken beim ersten Sichtbarwerden
 *  • Ambient-Quiz: Uhr läuft jetzt in Schleife statt abzureißen
 *  • Ambient-Fassade: gelegentliches entferntes Applaus-Murmeln (sehr leise)
 *  • Ambient-Realität: leises Papier-Zerknüllen als periodisches Element
 *  • Epilog-Abschnitt: sehr leise tiefe Klavier-ähnliche Töne
 *
 *  EINBINDUNG
 *  ──────────
 *  Am Ende von <body>, nach dem bestehenden <script>-Block:
 *      <script src="sounds.js"></script>
 *
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     KONFIGURATION
  ═══════════════════════════════════════════════════════════════ */

  var CFG = {
    master:      0.28,   // Gesamt sehr leise
    sfx:         0.85,   // Bedeutungsvolle Interaktions-Sounds
    subtle:      0.40,   // Sehr subtile Interaktions-Sounds
    ambient:     0.13,   // Hintergrund-Ambient
    special:     0.22,   // Einmalige Spezial-Momente
    hover:       0.22,   // Hover-Feedback (kaum hörbar)
    fadeTime:    3.2,    // Überblendzeit zwischen Ambient-Zuständen
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

  function play(fn, vol) {
    if (muted || prefersReducedMotion) return;
    vol = vol !== undefined ? vol : CFG.sfx;
    try {
      var c = getCtx();
      var g = c.createGain();
      g.gain.value = vol;
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

  function makeNoise(c, dur, amp) {
    amp = amp !== undefined ? amp : 1.0;
    var len = Math.ceil(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d   = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * amp;
    return buf;
  }

  function makePink(c, dur) {
    var len = Math.ceil(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d   = buf.getChannelData(0);
    var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
      b6 = w * 0.115926;
    }
    return buf;
  }

  function filt(c, type, freq, Q) {
    var f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = Q||1;
    return f;
  }

  function reverb(c, dur, decay) {
    var rate = c.sampleRate;
    var len  = Math.ceil(rate * (dur||1.2));
    var buf  = c.createBuffer(2, len, rate);
    for (var ch=0; ch<2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i=0; i<len; i++)
        d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, decay||2);
    }
    var conv = c.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  /* ═══════════════════════════════════════════════════════════════
     SOUND-BIBLIOTHEK
  ═══════════════════════════════════════════════════════════════ */

  /* ── Zeitungsblättern vorwärts (Flip öffnen) ── */
  function paperFlipOpen(c, out) {
    var now = c.currentTime;
    // Erster Kontakt — scharf
    var n1 = makeNoise(c, 0.07); var s1 = c.createBufferSource(); s1.buffer = n1;
    var b1 = filt(c,"bandpass",3400,0.7); var e1 = c.createGain();
    e1.gain.setValueAtTime(0,now); e1.gain.linearRampToValueAtTime(1.1,now+0.005);
    e1.gain.exponentialRampToValueAtTime(0.001,now+0.07);
    s1.connect(b1); b1.connect(e1); e1.connect(out); s1.start(now); s1.stop(now+0.08);
    // Nachrascheln
    var n2 = makeNoise(c,0.2,0.45); var s2 = c.createBufferSource(); s2.buffer = n2;
    var b2 = filt(c,"bandpass",1600,0.5); var lp = filt(c,"lowpass",4000);
    var e2 = c.createGain();
    e2.gain.setValueAtTime(0,now+0.045); e2.gain.linearRampToValueAtTime(0.5,now+0.08);
    e2.gain.exponentialRampToValueAtTime(0.001,now+0.26);
    s2.connect(b2); b2.connect(lp); lp.connect(e2); e2.connect(out);
    s2.start(now+0.045); s2.stop(now+0.27);
  }

  /* ── Zeitungsblättern rückwärts (Flip schließen) ── */
  /* Gleicher Charakter aber umgekehrte Dynamik — leiser, weicher */
  function paperFlipClose(c, out) {
    var now = c.currentTime;
    var n = makeNoise(c,0.19,0.5); var s = c.createBufferSource(); s.buffer = n;
    var bp = filt(c,"bandpass",2000,0.6); var lp = filt(c,"lowpass",5000);
    var e = c.createGain();
    e.gain.setValueAtTime(0,now); e.gain.linearRampToValueAtTime(0.7,now+0.03);
    e.gain.linearRampToValueAtTime(0.55,now+0.11);
    e.gain.exponentialRampToValueAtTime(0.001,now+0.19);
    s.connect(bp); bp.connect(lp); lp.connect(e); e.connect(out);
    s.start(now); s.stop(now+0.2);
    // Abschluss-Klick
    var n2 = makeNoise(c,0.015,0.6); var s2 = c.createBufferSource(); s2.buffer = n2;
    var hp = filt(c,"highpass",2800); var e2 = c.createGain();
    e2.gain.setValueAtTime(0.8,now+0.17); e2.gain.exponentialRampToValueAtTime(0.001,now+0.19);
    s2.connect(hp); hp.connect(e2); e2.connect(out); s2.start(now+0.17); s2.stop(now+0.2);
  }

  /* ── Schwerer amtlicher Stempel (IOC, Dilemma) ── */
  function stampHeavy(c, out) {
    var now = c.currentTime;
    var osc = c.createOscillator(); var e1 = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160,now);
    osc.frequency.exponentialRampToValueAtTime(38,now+0.11);
    var lp = filt(c,"lowpass",600,0.5);
    e1.gain.setValueAtTime(0,now); e1.gain.linearRampToValueAtTime(1.0,now+0.003);
    e1.gain.exponentialRampToValueAtTime(0.001,now+0.14);
    osc.connect(lp); lp.connect(e1); e1.connect(out);
    osc.start(now); osc.stop(now+0.15);
    // Aufschlag-Zischen
    var n = makeNoise(c,0.018,0.8); var s = c.createBufferSource(); s.buffer = n;
    var bp = filt(c,"bandpass",4200,2); var e2 = c.createGain();
    e2.gain.setValueAtTime(1.2,now); e2.gain.exponentialRampToValueAtTime(0.001,now+0.018);
    s.connect(bp); bp.connect(e2); e2.connect(out); s.start(now); s.stop(now+0.02);
    // Nachklingen — wie Metall auf Holztisch
    var o2 = c.createOscillator(); var e3 = c.createGain();
    o2.type = "sine"; o2.frequency.setValueAtTime(280,now+0.015);
    o2.frequency.exponentialRampToValueAtTime(180,now+0.18);
    e3.gain.setValueAtTime(0,now+0.015); e3.gain.linearRampToValueAtTime(0.12,now+0.025);
    e3.gain.exponentialRampToValueAtTime(0.001,now+0.22);
    o2.connect(e3); e3.connect(out); o2.start(now+0.015); o2.stop(now+0.23);
  }

  /* ── Leichter Stempel (Dilemma-Variante) ── */
  function stampLight(c, out) {
    var now = c.currentTime;
    var osc = c.createOscillator(); var env = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220,now);
    osc.frequency.exponentialRampToValueAtTime(65,now+0.08);
    var lp = filt(c,"lowpass",800,0.7);
    env.gain.setValueAtTime(0,now); env.gain.linearRampToValueAtTime(0.75,now+0.004);
    env.gain.exponentialRampToValueAtTime(0.001,now+0.1);
    osc.connect(lp); lp.connect(env); env.connect(out);
    osc.start(now); osc.stop(now+0.11);
    var n = makeNoise(c,0.012,0.6); var s = c.createBufferSource(); s.buffer = n;
    var bp = filt(c,"bandpass",3800,1.5); var e2 = c.createGain();
    e2.gain.setValueAtTime(0.9,now); e2.gain.exponentialRampToValueAtTime(0.001,now+0.012);
    s.connect(bp); bp.connect(e2); e2.connect(out); s.start(now); s.stop(now+0.014);
  }

  /* ── Nadelklick (Map-Pins) ── */
  function pinClick(c, out) {
    var now = c.currentTime;
    [[1400,0,0.45],[2100,0.004,0.18],[700,0.008,0.16]].forEach(function(p) {
      var o = c.createOscillator(); var e = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(p[0],now+p[1]);
      o.frequency.exponentialRampToValueAtTime(p[0]*0.52,now+p[1]+0.2);
      e.gain.setValueAtTime(0,now+p[1]); e.gain.linearRampToValueAtTime(p[2],now+p[1]+0.007);
      e.gain.exponentialRampToValueAtTime(0.001,now+p[1]+0.24);
      o.connect(e); e.connect(out); o.start(now+p[1]); o.stop(now+p[1]+0.25);
    });
    var n = makeNoise(c,0.01,0.4); var s = c.createBufferSource(); s.buffer = n;
    var hp = filt(c,"highpass",3200); var en = c.createGain();
    en.gain.setValueAtTime(0.7,now); en.gain.exponentialRampToValueAtTime(0.001,now+0.01);
    s.connect(hp); hp.connect(en); en.connect(out); s.start(now); s.stop(now+0.012);
  }

  /* ── Feder auf Papier (Quiz) ── */
  function penScratch(c, out) {
    var now = c.currentTime; var dur = 0.11;
    var n = makeNoise(c,dur,0.6); var s = c.createBufferSource(); s.buffer = n;
    var b1 = filt(c,"bandpass",3800,1.8); var b2 = filt(c,"bandpass",5200,2.2);
    var mix = c.createGain(); mix.gain.value = 0.5;
    var env = c.createGain();
    env.gain.setValueAtTime(0,now); env.gain.linearRampToValueAtTime(0.7,now+0.015);
    env.gain.linearRampToValueAtTime(0.5,now+0.08);
    env.gain.exponentialRampToValueAtTime(0.001,now+dur);
    var lfo = c.createOscillator(); var lg = c.createGain();
    lfo.frequency.value=28; lg.gain.value=400;
    lfo.connect(lg); lg.connect(b1.frequency);
    lfo.start(now); lfo.stop(now+dur+0.01);
    s.connect(b1); s.connect(b2); b1.connect(mix); b2.connect(mix);
    mix.connect(env); env.connect(out); s.start(now); s.stop(now+dur+0.01);
  }

  /* ── Akte enthüllen (Poster öffnen) ── */
  function revealOpen(c, out) {
    var now = c.currentTime; var dur = 0.22;
    var n = makeNoise(c,dur,0.5); var s = c.createBufferSource(); s.buffer = n;
    var bp = c.createBiquadFilter(); bp.type="bandpass"; bp.Q.value=0.65;
    bp.frequency.setValueAtTime(250,now);
    bp.frequency.exponentialRampToValueAtTime(4000,now+dur*0.65);
    bp.frequency.exponentialRampToValueAtTime(1600,now+dur);
    var env = c.createGain();
    env.gain.setValueAtTime(0,now); env.gain.linearRampToValueAtTime(0.7,now+0.03);
    env.gain.exponentialRampToValueAtTime(0.001,now+dur+0.02);
    s.connect(bp); bp.connect(env); env.connect(out); s.start(now); s.stop(now+dur+0.03);
    // Hochton-Schicht
    var n2 = makeNoise(c,0.1,0.2); var s2 = c.createBufferSource(); s2.buffer = n2;
    var hp = filt(c,"highpass",5500); var e2 = c.createGain();
    e2.gain.setValueAtTime(0,now+0.04); e2.gain.linearRampToValueAtTime(0.45,now+0.09);
    e2.gain.exponentialRampToValueAtTime(0.001,now+0.18);
    s2.connect(hp); hp.connect(e2); e2.connect(out); s2.start(now+0.04); s2.stop(now+0.19);
  }

  /* ── Akte schließen (Poster zuklappen) ── */
  function revealClose(c, out) {
    var now = c.currentTime; var dur = 0.14;
    var n = makeNoise(c,dur,0.45); var s = c.createBufferSource(); s.buffer = n;
    var bp = c.createBiquadFilter(); bp.type="bandpass"; bp.Q.value=0.6;
    bp.frequency.setValueAtTime(3500,now);
    bp.frequency.exponentialRampToValueAtTime(300,now+dur);
    var env = c.createGain();
    env.gain.setValueAtTime(0,now); env.gain.linearRampToValueAtTime(0.55,now+0.012);
    env.gain.exponentialRampToValueAtTime(0.001,now+dur+0.01);
    s.connect(bp); bp.connect(env); env.connect(out); s.start(now); s.stop(now+dur+0.02);
  }

  /* ── Gedämpfte Glocke (Quiz richtig) ── */
  function bellCorrect(c, out) {
    var rev = reverb(c,1.0,3.0); rev.connect(out);
    [[262,0,0.22],[330,0.065,0.19],[392,0.13,0.16]].forEach(function(p) {
      var t = c.currentTime+p[1];
      var o = c.createOscillator(); var e = c.createGain();
      o.type="sine"; o.frequency.setValueAtTime(p[0]*1.003,t);
      e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(p[2],t+0.007);
      e.gain.exponentialRampToValueAtTime(0.001,t+0.6);
      var o2 = c.createOscillator(); var e2 = c.createGain();
      o2.type="sine"; o2.frequency.value=p[0]*2.756;
      e2.gain.setValueAtTime(0,t); e2.gain.linearRampToValueAtTime(p[2]*0.11,t+0.005);
      e2.gain.exponentialRampToValueAtTime(0.001,t+0.2);
      o.connect(e); e.connect(rev); o.start(t); o.stop(t+0.61);
      o2.connect(e2); e2.connect(rev); o2.start(t); o2.stop(t+0.21);
    });
  }

  /* ── Tiefer Thud (Quiz falsch) ── */
  function thudWrong(c, out) {
    var now = c.currentTime;
    var o = c.createOscillator(); var e = c.createGain();
    o.type="sine"; o.frequency.setValueAtTime(105,now);
    o.frequency.exponentialRampToValueAtTime(58,now+0.22);
    var lp = filt(c,"lowpass",480,0.75);
    e.gain.setValueAtTime(0,now); e.gain.linearRampToValueAtTime(0.6,now+0.008);
    e.gain.exponentialRampToValueAtTime(0.001,now+0.3);
    o.connect(lp); lp.connect(e); e.connect(out); o.start(now); o.stop(now+0.31);
    var o2 = c.createOscillator(); var e2 = c.createGain();
    o2.type="triangle"; o2.frequency.setValueAtTime(210,now);
    o2.frequency.exponentialRampToValueAtTime(85,now+0.14);
    e2.gain.setValueAtTime(0,now); e2.gain.linearRampToValueAtTime(0.2,now+0.006);
    e2.gain.exponentialRampToValueAtTime(0.001,now+0.17);
    o2.connect(e2); e2.connect(out); o2.start(now); o2.stop(now+0.18);
  }

  /* ── Quiz-Abschluss: Papier ablegen + drei Töne ── */
  function quizDone(c, out) {
    var now = c.currentTime; var rev = reverb(c,1.8,2.0); rev.connect(out);
    var n = makeNoise(c,0.22,0.4); var s = c.createBufferSource(); s.buffer = n;
    var bp = filt(c,"bandpass",2200,0.55); var env = c.createGain();
    env.gain.setValueAtTime(0,now); env.gain.linearRampToValueAtTime(0.55,now+0.01);
    env.gain.exponentialRampToValueAtTime(0.001,now+0.24);
    s.connect(bp); bp.connect(env); env.connect(rev); s.start(now); s.stop(now+0.25);
    [[392,0.2,0.16],[494,0.32,0.13],[587,0.44,0.10]].forEach(function(p) {
      var t = now+p[1]; var o = c.createOscillator(); var g = c.createGain();
      o.type="sine"; o.frequency.value=p[0];
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(p[2],t+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.55);
      o.connect(g); g.connect(rev); o.start(t); o.stop(t+0.56);
    });
  }

  /* ── Schublade/Menü öffnen ── */
  function drawerOpen(c, out) {
    var now = c.currentTime;
    var n = makeNoise(c,0.065,0.3); var s = c.createBufferSource(); s.buffer = n;
    var lp = filt(c,"lowpass",1100,0.55); var e1 = c.createGain();
    e1.gain.setValueAtTime(0,now); e1.gain.linearRampToValueAtTime(0.65,now+0.01);
    e1.gain.exponentialRampToValueAtTime(0.001,now+0.065);
    s.connect(lp); lp.connect(e1); e1.connect(out); s.start(now); s.stop(now+0.07);
    var o = c.createOscillator(); var e2 = c.createGain();
    o.type="sine"; o.frequency.setValueAtTime(500,now+0.038);
    o.frequency.exponentialRampToValueAtTime(320,now+0.1);
    e2.gain.setValueAtTime(0,now+0.038); e2.gain.linearRampToValueAtTime(0.14,now+0.045);
    e2.gain.exponentialRampToValueAtTime(0.001,now+0.11);
    o.connect(e2); e2.connect(out); o.start(now+0.038); o.stop(now+0.12);
  }

  /* ── Schublade/Menü schließen ── */
  function drawerClose(c, out) {
    var now = c.currentTime;
    var o = c.createOscillator(); var e = c.createGain();
    o.type="sine"; o.frequency.setValueAtTime(360,now);
    o.frequency.exponentialRampToValueAtTime(260,now+0.055);
    e.gain.setValueAtTime(0,now); e.gain.linearRampToValueAtTime(0.12,now+0.005);
    e.gain.exponentialRampToValueAtTime(0.001,now+0.07);
    o.connect(e); e.connect(out); o.start(now); o.stop(now+0.08);
    var n = makeNoise(c,0.045,0.25); var s = c.createBufferSource(); s.buffer = n;
    var lp = filt(c,"lowpass",850); var e2 = c.createGain();
    e2.gain.setValueAtTime(0,now+0.018); e2.gain.linearRampToValueAtTime(0.4,now+0.032);
    e2.gain.exponentialRampToValueAtTime(0.001,now+0.065);
    s.connect(lp); lp.connect(e2); e2.connect(out); s.start(now+0.018); s.stop(now+0.068);
  }

  /* ── Hover-Tick (minimal) ── */
  function hoverTick(c, out) {
    var now = c.currentTime; var n = makeNoise(c,0.01,0.25);
    var s = c.createBufferSource(); s.buffer = n;
    var hp = filt(c,"highpass",4500); var e = c.createGain();
    e.gain.setValueAtTime(0.3,now); e.gain.exponentialRampToValueAtTime(0.001,now+0.01);
    s.connect(hp); hp.connect(e); e.connect(out); s.start(now); s.stop(now+0.012);
  }

  /* ── Zurück nach oben: Whoosh aufwärts ── */
  function whooshUp(c, out) {
    var now = c.currentTime; var n = makeNoise(c,0.1,0.38);
    var s = c.createBufferSource(); s.buffer = n;
    var bp = c.createBiquadFilter(); bp.type="bandpass"; bp.Q.value=0.45;
    bp.frequency.setValueAtTime(600,now);
    bp.frequency.exponentialRampToValueAtTime(4500,now+0.1);
    var e = c.createGain();
    e.gain.setValueAtTime(0,now); e.gain.linearRampToValueAtTime(0.5,now+0.022);
    e.gain.exponentialRampToValueAtTime(0.001,now+0.12);
    s.connect(bp); bp.connect(e); e.connect(out); s.start(now); s.stop(now+0.13);
  }

  /* ── IOC Ja: gedämpfte Fanfare (zynisch leise) ── */
  function iocYes(c, out) {
    var rev = reverb(c,1.0,2.5); rev.connect(out);
    [[392,0,0.18],[494,0.1,0.16],[587,0.2,0.14]].forEach(function(p) {
      var t = c.currentTime+p[1];
      var o = c.createOscillator(); var g = c.createGain();
      o.type="square"; var lp = filt(c,"lowpass",750,0.65);
      o.frequency.value=p[0];
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(p[2]*0.45,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.32);
      o.connect(lp); lp.connect(g); g.connect(rev); o.start(t); o.stop(t+0.33);
    });
  }

  /* ── IOC Nein: Elegie (zwei absteigende Töne) ── */
  function iocNo(c, out) {
    var rev = reverb(c,1.8,3.5); rev.connect(out);
    [[320,0,0.18],[269,0.2,0.15]].forEach(function(p) {
      var t = c.currentTime+p[1];
      var o = c.createOscillator(); var g = c.createGain();
      o.type="sine"; o.frequency.setValueAtTime(p[0],t);
      o.frequency.linearRampToValueAtTime(p[0]*0.95,t+0.38);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(p[2],t+0.05);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.48);
      o.connect(g); g.connect(rev); o.start(t); o.stop(t+0.49);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     SPEZIAL-SOUNDS (einmalige atmosphärische Momente)
  ═══════════════════════════════════════════════════════════════ */

  /* ── Schreibmaschinen-Zeilenvorschub
     Beim ersten Erscheinen eines Hauptkapitels: kurze Folge von
     3–4 schnellen Tastenanschlägen + Glocke + Schlitten-Rücklauf.
     Klingt wie: das Kapitel wird getippt, nicht geladen. ── */
  function typewriterCarriageReturn(c, out) {
    var now = c.currentTime;
    // 4 schnelle Tastenanschläge
    [0, 0.07, 0.14, 0.19].forEach(function(delay) {
      var t = now + delay;
      var n = makeNoise(c,0.025); var s = c.createBufferSource(); s.buffer = n;
      var hp = filt(c,"highpass",900,0.5); var lp = filt(c,"lowpass",5500);
      var e = c.createGain();
      e.gain.setValueAtTime(0.7,t); e.gain.exponentialRampToValueAtTime(0.001,t+0.025);
      s.connect(hp); hp.connect(lp); lp.connect(e); e.connect(out);
      s.start(t); s.stop(t+0.03);
      // Metallisches Ping nach jedem Anschlag
      var o = c.createOscillator(); var eg = c.createGain();
      o.type="triangle"; o.frequency.setValueAtTime(1800+delay*200,t);
      o.frequency.exponentialRampToValueAtTime(800,t+0.05);
      eg.gain.setValueAtTime(0,t); eg.gain.linearRampToValueAtTime(0.12,t+0.003);
      eg.gain.exponentialRampToValueAtTime(0.001,t+0.06);
      o.connect(eg); eg.connect(out); o.start(t); o.stop(t+0.065);
    });
    // Glocke am Zeilenende
    var bellT = now + 0.26;
    var bOsc = c.createOscillator(); var bEnv = c.createGain();
    bOsc.type="sine"; bOsc.frequency.value=2200;
    bEnv.gain.setValueAtTime(0,bellT); bEnv.gain.linearRampToValueAtTime(0.28,bellT+0.005);
    bEnv.gain.exponentialRampToValueAtTime(0.001,bellT+0.35);
    bOsc.connect(bEnv); bEnv.connect(out); bOsc.start(bellT); bOsc.stop(bellT+0.36);
    // Schlitten-Rücklauf: absteigendes Rauschen
    var rT = now + 0.32;
    var rN = makeNoise(c,0.18,0.4); var rS = c.createBufferSource(); rS.buffer = rN;
    var rbp = c.createBiquadFilter(); rbp.type="bandpass"; rbp.Q.value=0.5;
    rbp.frequency.setValueAtTime(3000,rT); rbp.frequency.exponentialRampToValueAtTime(400,rT+0.18);
    var rE = c.createGain();
    rE.gain.setValueAtTime(0,rT); rE.gain.linearRampToValueAtTime(0.5,rT+0.02);
    rE.gain.exponentialRampToValueAtTime(0.001,rT+0.18);
    rS.connect(rbp); rbp.connect(rE); rE.connect(out); rS.start(rT); rS.stop(rT+0.19);
  }

  /* ── Seufzen (Bergmann-Abschnitt erscheint)
     Ein sehr leiser, sanfter Windton — wie ein tiefer Atemzug. ── */
  function sigh(c, out) {
    var now = c.currentTime; var dur = 1.6;
    var n = makePink(c,dur); var s = c.createBufferSource(); s.buffer = n;
    var lp = filt(c,"lowpass",280,0.5);
    var bp = filt(c,"bandpass",420,0.8);
    var e = c.createGain();
    e.gain.setValueAtTime(0,now); e.gain.linearRampToValueAtTime(0.65,now+0.4);
    e.gain.linearRampToValueAtTime(0.55,now+1.0);
    e.gain.exponentialRampToValueAtTime(0.001,now+dur);
    s.connect(lp); lp.connect(bp); bp.connect(e); e.connect(out);
    s.start(now); s.stop(now+dur+0.05);
  }

  /* ── Startschuss-Knacken (Owens erscheint)
     Ein kurzes, scharfes Klicken — wie ein Startpistolen-Echo. ── */
  function startGun(c, out) {
    var now = c.currentTime;
    // Impuls
    var n = makeNoise(c,0.035,0.9); var s = c.createBufferSource(); s.buffer = n;
    var hp = filt(c,"highpass",1200); var e = c.createGain();
    e.gain.setValueAtTime(1.2,now); e.gain.exponentialRampToValueAtTime(0.001,now+0.035);
    s.connect(hp); hp.connect(e); e.connect(out); s.start(now); s.stop(now+0.04);
    // Langer Nachhall — wie in einem leeren Stadion
    var rev = reverb(c,2.5,1.2); rev.connect(out);
    var n2 = makeNoise(c,0.04,0.6); var s2 = c.createBufferSource(); s2.buffer = n2;
    var bp = filt(c,"bandpass",2000,0.8); var e2 = c.createGain();
    e2.gain.setValueAtTime(0.8,now); e2.gain.exponentialRampToValueAtTime(0.001,now+0.04);
    s2.connect(bp); bp.connect(e2); e2.connect(rev); s2.start(now); s2.stop(now+0.045);
  }

  /* ── Briefpapier-Rascheln (Brief-Abschnitt erscheint)
     Langsames, bedächtiges Aufrascheln — als würde jemand
     einen Brief aus einem Umschlag ziehen. ── */
  function letterUnfold(c, out) {
    var now = c.currentTime;
    // Dreistufiges Rascheln (Falz 1, Falz 2, ausbreiten)
    [0, 0.22, 0.48].forEach(function(delay, idx) {
      var dur = 0.15 + idx * 0.04;
      var amp = 0.5 - idx * 0.08;
      var t   = now + delay;
      var n = makeNoise(c,dur,amp); var s = c.createBufferSource(); s.buffer = n;
      var bp = filt(c,"bandpass",2200-idx*200,0.65);
      var lp = filt(c,"lowpass",5000-idx*400);
      var e = c.createGain();
      e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(0.8,t+0.01);
      e.gain.linearRampToValueAtTime(0.5,t+dur*0.6);
      e.gain.exponentialRampToValueAtTime(0.001,t+dur+0.02);
      s.connect(bp); bp.connect(lp); lp.connect(e); e.connect(out);
      s.start(t); s.stop(t+dur+0.03);
    });
  }

  /* ── Metronom-Klicken (Chronologie erscheint)
     6 gleichmäßige Klicks, wie eine Uhr die tickt —
     Zeit marschiert unaufhaltsam. ── */
  function metronome(c, out) {
    var now = c.currentTime + 0.5; var interval = 0.38;
    for (var i = 0; i < 6; i++) {
      (function(idx) {
        var t    = now + idx * interval;
        var freq = idx === 0 ? 900 : 640; // Erster Tick höher (Betonung)
        var n = makeNoise(c,0.012,0.35); var s = c.createBufferSource(); s.buffer = n;
        var hp = filt(c,"highpass",2200); var e = c.createGain();
        var vol = Math.max(0.3, 1.0 - idx * 0.12);
        e.gain.setValueAtTime(vol,t); e.gain.exponentialRampToValueAtTime(0.001,t+0.012);
        s.connect(hp); hp.connect(e); e.connect(out); s.start(t); s.stop(t+0.014);
        var o = c.createOscillator(); var og = c.createGain();
        o.type="sine"; o.frequency.value=freq;
        og.gain.setValueAtTime(0,t); og.gain.linearRampToValueAtTime(0.06*vol,t+0.003);
        og.gain.exponentialRampToValueAtTime(0.001,t+0.05);
        o.connect(og); og.connect(out); o.start(t); o.stop(t+0.055);
      })(i);
    }
  }

  /* ── Windhauch (Marzahn erscheint)
     Langer, leiser Wind — wie über ein leeres Feld. ── */
  function windGust(c, out) {
    var now = c.currentTime; var dur = 3.2;
    var n = makePink(c,dur); var s = c.createBufferSource(); s.buffer = n;
    var lp = filt(c,"lowpass",360,0.4);
    var hp = filt(c,"highpass",80);
    var e = c.createGain();
    e.gain.setValueAtTime(0,now); e.gain.linearRampToValueAtTime(0.7,now+0.8);
    e.gain.linearRampToValueAtTime(0.85,now+1.5);
    e.gain.linearRampToValueAtTime(0.4,now+2.6);
    e.gain.exponentialRampToValueAtTime(0.001,now+dur);
    s.connect(lp); lp.connect(hp); hp.connect(e); e.connect(out);
    s.start(now); s.stop(now+dur+0.1);
    // Leises Heulen (höhere Frequenz)
    var n2 = makePink(c,dur*0.7); var s2 = c.createBufferSource(); s2.buffer = n2;
    var bp2 = filt(c,"bandpass",1200,2.5); var e2 = c.createGain();
    e2.gain.setValueAtTime(0,now+0.5); e2.gain.linearRampToValueAtTime(0.25,now+1.2);
    e2.gain.exponentialRampToValueAtTime(0.001,now+dur*0.7);
    s2.connect(bp2); bp2.connect(e2); e2.connect(out);
    s2.start(now+0.5); s2.stop(now+dur*0.7+0.05);
  }

  /* ── Namen-Wand: Streicherdrone
     Warme, tiefe Drone die langsam auf- und abschwingt.
     D-Moll-Anklang — dunkel, aber nicht hoffnungslos. ── */
  function namesDrone(c, out) {
    var now = c.currentTime; var dur = 14.0;
    // D2, A2, D3 — D-Moll Grundton
    [[73.4, 0.10], [110.0, 0.07], [146.8, 0.045], [220.0, 0.025]].forEach(function(p,i) {
      var o = c.createOscillator(); var g = c.createGain();
      o.type = i < 2 ? "sine" : "triangle";
      o.frequency.value = p[0];
      o.detune.value = (i%2===0 ? 1 : -1) * (i+1) * 2.5; // Leichte Verstimmung
      g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(p[1],now+3.0);
      g.gain.linearRampToValueAtTime(p[1]*0.8,now+dur-3.0);
      g.gain.linearRampToValueAtTime(0,now+dur);
      var lp = filt(c,"lowpass",400-i*40,0.6);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(now); o.stop(now+dur+0.1);
      // Leises Vibrato per LFO
      var lfo = c.createOscillator(); var lg = c.createGain();
      lfo.frequency.value = 0.12 + i*0.04; lg.gain.value = 1.5;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(now); lfo.stop(now+dur+0.1);
    });
  }

  /* ── Epilog-Klavier-Töne (sehr leise, melancholisch)
     Drei einzelne Töne wie auf einem alten Klavier —
     einfach, keine Akkorde, viel Raum zwischen den Tönen. ── */
  function epilogPiano(c, out) {
    var rev = reverb(c,2.5,1.8); rev.connect(out);
    // D4, F4, A4 — D-Moll, sehr langsam
    [[294, 0, 0.14], [349, 1.4, 0.11], [440, 3.0, 0.09]].forEach(function(p) {
      var t = c.currentTime + p[1];
      var o = c.createOscillator(); var g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(p[0],t);
      // Simulierter Klavier-Attack mit kurzem Oberton
      var o2 = c.createOscillator(); var g2 = c.createGain();
      o2.type = "triangle"; o2.frequency.value = p[0] * 4;
      g2.gain.setValueAtTime(0,t); g2.gain.linearRampToValueAtTime(p[2]*0.3,t+0.003);
      g2.gain.exponentialRampToValueAtTime(0.001,t+0.08);
      o2.connect(g2); g2.connect(rev); o2.start(t); o2.stop(t+0.09);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(p[2],t+0.006);
      g.gain.exponentialRampToValueAtTime(0.001,t+1.2);
      o.connect(g); g.connect(rev); o.start(t); o.stop(t+1.21);
    });
  }

  /* ── Telegraphen-Morse: „1936" als Morsecode
     Präziser als SOS — buchstabiert das Jahr.
     1=.---- 9=----. 3=...-- 6=--...
     (Kurz vereinfacht auf markante Muster) ── */
  function morseYear(c, out) {
    var now = c.currentTime + 0.4;
    var u   = 0.08; // Einheitslänge in Sekunden
    // Vereinfachtes Muster: vier kurze Gruppen für 1-9-3-6
    var pattern = [
      // 1: kurz lang lang lang lang
      [1,0,3,0,3,0,3,0,3,2],
      // 9: lang lang lang lang kurz
      [3,0,3,0,3,0,3,0,1,2],
      // 3: kurz kurz kurz lang lang
      [1,0,1,0,1,0,3,0,3,2],
      // 6: lang kurz kurz kurz kurz
      [3,0,1,0,1,0,1,0,1,3],
    ];
    var cursor = 0;
    pattern.forEach(function(group) {
      group.forEach(function(val) {
        if (val > 0) {
          var t   = now + cursor;
          var dur = val * u;
          var o   = c.createOscillator(); var e = c.createGain();
          o.type="sine"; o.frequency.value=640;
          e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(0.32,t+0.006);
          e.gain.linearRampToValueAtTime(0.32,t+dur-0.01);
          e.gain.exponentialRampToValueAtTime(0.001,t+dur);
          o.connect(e); e.connect(out); o.start(t); o.stop(t+dur+0.01);
          cursor += dur + u; // Pause nach jedem Symbol
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     AMBIENT — Hintergrundatmosphäre je Kapitel
  ═══════════════════════════════════════════════════════════════ */

  var ambientNodes = [];
  var ambientGain  = null;
  var currentZone  = null;

  function stopAmbient() {
    if (!ambientGain) return;
    var now = getCtx().currentTime;
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(0, now + CFG.fadeTime);
    var toStop = ambientNodes.slice();
    setTimeout(function() {
      toStop.forEach(function(n) { try { n.stop(); n.disconnect(); } catch(_){} });
    }, (CFG.fadeTime + 0.5) * 1000);
    ambientNodes = [];
    ambientGain  = null;
  }

  function startAmbient(fn) {
    if (muted || prefersReducedMotion) return;
    stopAmbient();
    var c = getCtx(); var now = c.currentTime;
    ambientGain = c.createGain();
    ambientGain.gain.setValueAtTime(0, now);
    ambientGain.gain.linearRampToValueAtTime(CFG.ambient, now + CFG.fadeTime);
    ambientGain.connect(masterGain);
    fn(c, ambientGain);
  }

  /* ZONE A: Fassade
     Warme Drone + gelegentliches fernes Murmeln
     (Menschenmenge hinter dicken Wänden) */
  function ambientFassade(c, out) {
    // Warmes Rauschen (Menge)
    var n = makePink(c,30); var s = c.createBufferSource();
    s.buffer=n; s.loop=true;
    var lp = filt(c,"lowpass",280,0.35); var g = c.createGain(); g.gain.value=0.55;
    s.connect(lp); lp.connect(g); g.connect(out); s.start(); ambientNodes.push(s);
    // A2-Drone (warm, hell — Normalität)
    [110, 165, 220].forEach(function(freq,i) {
      var o = c.createOscillator(); o.type="sine"; o.frequency.value=freq;
      o.detune.value = (i-1)*3;
      // Langsames Atmen per LFO
      var lfo = c.createOscillator(); var lg = c.createGain();
      lfo.frequency.value = 0.08 + i*0.03; lg.gain.value = 0.5;
      lfo.connect(lg); lg.connect(o.detune); lfo.start(); ambientNodes.push(lfo);
      var gn = c.createGain(); gn.gain.value = 0.055 - i*0.012;
      o.connect(gn); gn.connect(out); o.start(); ambientNodes.push(o);
    });
    // Periodisches fernes Gemurmel: alle ~18s ein kurzes Rausch-Blinzeln
    (function murmur() {
      var delay = 10000 + Math.random()*10000;
      var timer = setTimeout(function() {
        if (!ambientNodes.length) return;
        play(function(c2,out2) {
          var n2 = makePink(c2,1.2); var s2 = c2.createBufferSource(); s2.buffer=n2;
          var bp = filt(c2,"bandpass",600,0.8); var e = c2.createGain();
          e.gain.setValueAtTime(0,c2.currentTime);
          e.gain.linearRampToValueAtTime(0.35,c2.currentTime+0.3);
          e.gain.exponentialRampToValueAtTime(0.001,c2.currentTime+1.2);
          s2.connect(bp); bp.connect(e); e.connect(out2); s2.start(); s2.stop(c2.currentTime+1.25);
        }, CFG.ambient * 0.7);
        murmur();
      }, delay);
      ambientNodes.push({ stop: function() { clearTimeout(timer); }, disconnect: function(){} });
    })();
  }

  /* ZONE B: Realität
     Dissonante Drone (E+F Halbton) + periodisches tiefes Grollen */
  function ambientRealitaet(c, out) {
    var n = makePink(c,30); var s = c.createBufferSource();
    s.buffer=n; s.loop=true;
    var lp = filt(c,"lowpass",160,0.3); var g = c.createGain(); g.gain.value=0.45;
    s.connect(lp); lp.connect(g); g.connect(out); s.start(); ambientNodes.push(s);
    // Dissonanz: E1 und F1 (halber Ton auseinander — bewusst unbequem)
    [[41.2, 0.08], [43.7, 0.06], [65.4, 0.05]].forEach(function(p,i) {
      var o = c.createOscillator(); o.type="triangle"; o.frequency.value=p[0];
      var lfo = c.createOscillator(); var lg = c.createGain();
      lfo.frequency.value = 0.15+i*0.05; lg.gain.value = 0.6;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(); ambientNodes.push(lfo);
      var gn = c.createGain(); gn.gain.value=p[1];
      o.connect(gn); gn.connect(out); o.start(); ambientNodes.push(o);
    });
    // Periodisches Grollen
    (function growl() {
      var delay = 12000 + Math.random()*14000;
      var timer = setTimeout(function() {
        if (!ambientNodes.length) return;
        play(function(c2,out2) {
          var n2 = makePink(c2,1.8); var s2 = c2.createBufferSource(); s2.buffer=n2;
          var lp2 = filt(c2,"lowpass",90,0.4); var e = c2.createGain();
          e.gain.setValueAtTime(0,c2.currentTime);
          e.gain.linearRampToValueAtTime(0.55,c2.currentTime+0.5);
          e.gain.linearRampToValueAtTime(0.4,c2.currentTime+1.2);
          e.gain.exponentialRampToValueAtTime(0.001,c2.currentTime+1.8);
          s2.connect(lp2); lp2.connect(e); e.connect(out2); s2.start(); s2.stop(c2.currentTime+1.85);
        }, CFG.ambient * 1.2);
        growl();
      }, delay);
      ambientNodes.push({ stop: function(){ clearTimeout(timer); }, disconnect: function(){} });
    })();
  }

  /* ZONE C: Gedenken — fast Stille
     Nur ein A1-Ton und rosa Archiv-Rauschen. */
  function ambientGedenken(c, out) {
    var o = c.createOscillator(); o.type="sine"; o.frequency.value=55;
    var lfo = c.createOscillator(); var lg = c.createGain();
    lfo.frequency.value=0.05; lg.gain.value=0.3;
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(); ambientNodes.push(lfo);
    var g = c.createGain(); g.gain.value=0.038;
    o.connect(g); g.connect(out); o.start(); ambientNodes.push(o);
    var n = makePink(c,30); var s = c.createBufferSource();
    s.buffer=n; s.loop=true;
    var lp = filt(c,"lowpass",100,0.2); var gn = c.createGain(); gn.gain.value=0.28;
    s.connect(lp); lp.connect(gn); gn.connect(out); s.start(); ambientNodes.push(s);
  }

  /* ZONE D: Quiz — Uhr tickt in Schleife */
  function ambientQuiz(c, out) {
    var tick = 0.75; var now = c.currentTime;
    var totalTicks = 80; // ~60 Sekunden
    for (var i=0; i<totalTicks; i++) {
      (function(idx) {
        var t = now + idx*tick;
        var n = makeNoise(c,0.009,0.18); var s = c.createBufferSource(); s.buffer=n;
        var hp = filt(c,"highpass",3800); var e = c.createGain();
        var v = idx%4===0 ? 0.6 : 0.38; // Jeder vierte Tick betont
        e.gain.setValueAtTime(v,t); e.gain.exponentialRampToValueAtTime(0.001,t+0.009);
        s.connect(hp); hp.connect(e); e.connect(out); s.start(t); s.stop(t+0.011);
        ambientNodes.push(s);
      })(i);
    }
  }

  /* ZONE E: Heute/Reflexion — nüchterne moderne Drone */
  function ambientHeute(c, out) {
    [[120,0.055],[180,0.038],[240,0.02]].forEach(function(p,i) {
      var o = c.createOscillator(); o.type="sine"; o.frequency.value=p[0];
      o.detune.value = i*5;
      var g = c.createGain(); g.gain.value=p[1];
      o.connect(g); g.connect(out); o.start(); ambientNodes.push(o);
    });
    // Sehr leises Hochton-Shimmer
    var oH = c.createOscillator(); oH.type="sine"; oH.frequency.value=3600;
    var lfo = c.createOscillator(); var lg = c.createGain();
    lfo.frequency.value=0.35; lg.gain.value=4;
    lfo.connect(lg); lg.connect(oH.frequency); lfo.start(); ambientNodes.push(lfo);
    var gH = c.createGain(); gH.gain.value=0.007;
    oH.connect(gH); gH.connect(out); oH.start(); ambientNodes.push(oH);
  }

  /* ═══════════════════════════════════════════════════════════════
     SCROLL-ZONE-MAPPING
  ═══════════════════════════════════════════════════════════════ */

  var ZONE_MAP = [
    {id:"s-fassade",    zone:"fassade"},
    {id:"s-riefen",     zone:"fassade"},
    {id:"s-brief",      zone:"realitaet"},
    {id:"s-slider",     zone:"realitaet"},
    {id:"zone-chron",   zone:"realitaet"},
    {id:"zone-map",     zone:"realitaet"},
    {id:"s-bergmann",   zone:"realitaet"},
    {id:"s-kartei",     zone:"realitaet"},
    {id:"zone-owens",   zone:"realitaet"},
    {id:"s-marzahn",    zone:"realitaet"},
    {id:"s-boykott",    zone:"realitaet"},
    {id:"s-int-stimmen",zone:"realitaet"},
    {id:"s-plakate",    zone:"fassade"},
    {id:"s-taeter",     zone:"realitaet"},
    {id:"zone-quotes",  zone:"gedenken"},
    {id:"zone-memorial",zone:"gedenken"},
    {id:"zone-flatow",  zone:"gedenken"},
    {id:"zone-dilemmas",zone:"realitaet"},
    {id:"quiz-sec",     zone:"quiz"},
    {id:"zone-ref",     zone:"heute"},
    {id:"zone-sportswashing",zone:"heute"},
    {id:"zone-epilog-tl",zone:"gedenken"},
    {id:"wall-names",   zone:"gedenken"},
    {id:"zone-links",   zone:"heute"},
  ];

  var AMBIENT_FNS = {
    fassade:   ambientFassade,
    realitaet: ambientRealitaet,
    gedenken:  ambientGedenken,
    quiz:      ambientQuiz,
    heute:     ambientHeute,
  };

  function updateAmbientZone() {
    if (window.scrollY < 250) {
      if (currentZone !== null) { currentZone = null; stopAmbient(); }
      return;
    }
    var mid = window.scrollY + window.innerHeight * 0.55;
    var best = null; var bestTop = -Infinity;
    ZONE_MAP.forEach(function(e) {
      var el = document.getElementById(e.id); if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= mid && top > bestTop) { bestTop=top; best=e.zone; }
    });
    if (best !== currentZone) {
      currentZone = best;
      if (best) startAmbient(AMBIENT_FNS[best]);
      else stopAmbient();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     EINMALIGE SPEZIAL-TRIGGER
  ═══════════════════════════════════════════════════════════════ */

  var fired = {};

  function onceVisible(id, key, delay, fn, threshold) {
    var el = document.getElementById(id); if (!el) return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !fired[key]) {
          fired[key] = true;
          setTimeout(fn, delay || 0);
          obs.disconnect();
        }
      });
    }, { threshold: threshold || 0.2 });
    obs.observe(el);
  }

  function setupSpecialTriggers() {

    // Kapitelüberschriften: Schreibmaschinen-Zeilenvorschub
    // Nur bei den großen Kapiteln, nicht bei jedem Sub-Abschnitt
    ["s-fassade","s-slider","s-bergmann","s-boykott","zone-quotes","quiz-sec","zone-ref"].forEach(function(id,i) {
      onceVisible(id, "cr_"+id, 300 + i*100, function() {
        play(typewriterCarriageReturn, CFG.special * 0.85);
      }, 0.15);
    });

    // Brief erscheint: Briefpapier-Rascheln
    onceVisible("s-brief", "letter", 600, function() {
      play(letterUnfold, CFG.special * 1.1);
    });

    // Chronologie: Metronom
    onceVisible("zone-chron", "metro", 700, function() {
      play(metronome, CFG.special);
    });

    // Bergmann: Seufzen
    onceVisible("s-bergmann", "sigh", 1200, function() {
      play(sigh, CFG.special * 0.9);
    });

    // Owens: Startschuss-Knacken
    onceVisible("zone-owens", "start", 800, function() {
      play(startGun, CFG.special * 0.8);
    });

    // Marzahn: Windhauch + Morse
    onceVisible("s-marzahn", "wind", 500, function() {
      play(windGust, CFG.special * 1.2);
    });
    onceVisible("s-marzahn", "morse", 4500, function() {
      play(morseYear, CFG.special * 0.9);
    });

    // Namen-Wand: Streicherdrone
    onceVisible("wall-names", "names", 300, function() {
      play(namesDrone, CFG.special * 1.4);
    });

    // Epilog: Piano-Töne
    onceVisible("zone-epilog-tl", "epilog", 1000, function() {
      play(epilogPiano, CFG.special * 1.1);
    });

    // Flatow: leises Gedenken — nochmal eine kleine Drone
    onceVisible("zone-flatow", "flatow", 800, function() {
      play(epilogPiano, CFG.special * 0.75);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     MUTE-BUTTON
  ═══════════════════════════════════════════════════════════════ */

  function createMuteButton() {
    var btn = document.createElement("button");
    btn.id = "sound-mute-btn";
    btn.setAttribute("aria-label","Sounds ausschalten");
    btn.setAttribute("title","Sounds ein / aus");
    btn.textContent = "🔔";
    btn.style.cssText = [
      "position:fixed","top:14px","right:118px","z-index:9502",
      "width:36px","height:36px","border-radius:50%",
      "background:rgba(11,37,69,.88)",
      "border:1px solid var(--gold,#C8A96E)",
      "color:var(--gold,#C8A96E)",
      "font-size:.9rem","cursor:pointer",
      "display:flex","align-items:center","justify-content:center",
      "backdrop-filter:blur(8px)","-webkit-backdrop-filter:blur(8px)",
      "transition:background .3s,opacity .3s","line-height:1",
    ].join(";");

    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      muted = !muted;
      if (muted) {
        btn.textContent="🔕"; btn.setAttribute("aria-label","Sounds einschalten");
        btn.style.opacity="0.5";
        if (ambientGain && ctx) {
          var now = ctx.currentTime;
          ambientGain.gain.setValueAtTime(ambientGain.gain.value,now);
          ambientGain.gain.linearRampToValueAtTime(0,now+1.0);
        }
      } else {
        btn.textContent="🔔"; btn.setAttribute("aria-label","Sounds ausschalten");
        btn.style.opacity="1";
        if (ambientGain && ctx) {
          var now2 = ctx.currentTime;
          ambientGain.gain.setValueAtTime(0,now2);
          ambientGain.gain.linearRampToValueAtTime(CFG.ambient,now2+1.5);
        }
        play(hoverTick, CFG.hover);
      }
    });
    document.body.appendChild(btn);
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENT-BINDINGS
     Nur bedeutungsvolle Momente — keine alltäglichen Buttons.
  ═══════════════════════════════════════════════════════════════ */

  /* Flip-Karten: Track ob offen oder zu */
  var flipStates = {};

  function bind() {

    document.addEventListener("click", function(e) {
      var t = e.target;

      /* ── Flip-Karten: Zeitungsblättern vor/rückwärts ── */
      if (t.closest && t.closest(".flip-w")) {
        var fw = t.closest(".flip-w");
        var id = fw.dataset.flipId || (fw.dataset.flipId = Math.random().toString(36).slice(2));
        var isNowOpen = fw.classList.contains("open");
        // classList wird nach click getoggelt — wir lesen den Zustand vor dem Toggle
        // indem wir schauen ob 'open' schon gesetzt ist (vor dem Click-Handler)
        play(isNowOpen ? paperFlipClose : paperFlipOpen, CFG.sfx);
        return;
      }

      /* ── Protokoll-Toggle: Akte aufschlagen ── */
      if (t.classList.contains("protocol-btn")) {
        play(paperFlipOpen, CFG.sfx * 0.85); return;
      }

      /* ── Quiz-Antworten: Feder ── */
      if (t.classList.contains("qbtn") && !t.disabled) {
        play(penScratch, CFG.sfx); return;
      }

      /* ── Dilemma-Buttons: Stempel (variiert je Position) ── */
      if (t.classList.contains("dilemma-btn")) {
        var btns = t.closest(".dilemma-btns") ?
          Array.from(t.closest(".dilemma-btns").querySelectorAll(".dilemma-btn")) : [];
        var idx = btns.indexOf(t);
        // Erste Antwort = schwerer Stempel, andere leichter
        play(idx === 0 ? stampHeavy : stampLight, CFG.sfx); return;
      }

      /* ── IOC-Vote: schwerer Stempel + emotionaler Nachklang ── */
      if (t.classList.contains("ioc-btn")) {
        play(stampHeavy, CFG.sfx);
        setTimeout(function() {
          play(t.classList.contains("yes") ? iocYes : iocNo, CFG.special * 1.1);
        }, 130);
        return;
      }

      /* ── Poster-Karten: öffnen vs. schließen ── */
      if (t.closest && t.closest(".poster-card")) {
        var pc = t.closest(".poster-card");
        var wasOpen = pc.classList.contains("open");
        play(wasOpen ? revealClose : revealOpen, CFG.sfx); return;
      }

      /* ── Map-Pins: Nadelklick ── */
      if (t.closest && t.closest(".map-pin")) {
        play(pinClick, CFG.sfx); return;
      }

      /* ── Kapitelmenü: Schublade ── */
      if (t.id==="pill" || (t.closest && t.closest("#pill"))) {
        var cm = document.getElementById("chapter-menu");
        play(cm && cm.classList.contains("show") ? drawerClose : drawerOpen, CFG.sfx);
        return;
      }

      /* ── Glossar: Schublade ── */
      if (t.id==="glossary-btn" || (t.closest && t.closest("#glossary-btn"))) {
        var gp = document.getElementById("glossary-panel");
        play(gp && gp.classList.contains("show") ? drawerClose : drawerOpen, CFG.sfx);
        return;
      }

      /* ── Zurück nach oben ── */
      if (t.id==="back-to-top" || (t.closest && t.closest("#back-to-top"))) {
        play(whooshUp, CFG.sfx); return;
      }

      /* ── „Mehr anzeigen"-Expander ── */
      if (t.classList.contains("xbtn") || (t.closest && t.closest(".xbtn"))) {
        var xb = t.closest(".xbtn") || t;
        var xBody = document.getElementById(xb.getAttribute("onclick")
          ? (xb.getAttribute("onclick").match(/'([^']+)'/) || [])[1] : "");
        var isExpanding = xBody && !xBody.classList.contains("open");
        play(isExpanding ? revealOpen : revealClose, CFG.sfx * 0.8); return;
      }

      /* ── Quiz-Reset ── */
      if (t.id==="qreset") {
        play(paperFlipOpen, CFG.sfx * 0.7); return;
      }
    });

    /* ── Quiz: Richtig/Falsch-Feedback ── */
    document.addEventListener("click", function(e) {
      var t = e.target;
      if (!t.classList.contains("qbtn")) return;
      setTimeout(function() {
        if (t.classList.contains("correct"))    play(bellCorrect, CFG.sfx);
        else if (t.classList.contains("wrong")) play(thudWrong, CFG.sfx);
      }, 40);
    });

    /* ── Quiz: Abschluss ── */
    var qres = document.getElementById("qres");
    if (qres) {
      var qObs = new MutationObserver(function(muts) {
        for (var i=0; i<muts.length; i++) {
          if (muts[i].attributeName==="style" &&
              qres.style.display !== "none" && qres.style.display !== "") {
            setTimeout(function() { play(quizDone, CFG.sfx); }, 220);
            qObs.disconnect(); break;
          }
        }
      });
      qObs.observe(qres, {attributes:true});
    }

    /* ── Hover: nur Dilemma/IOC/Quiz (kaum hörbar) ── */
    if (window.matchMedia("(hover: hover)").matches) {
      var hTh = throttle(function(){ play(hoverTick, CFG.hover); }, 450);
      document.addEventListener("mouseover", function(e) {
        var t = e.target;
        if (t.classList.contains("dilemma-btn") ||
            t.classList.contains("ioc-btn") ||
            (t.classList.contains("qbtn") && !t.disabled)) {
          hTh();
        }
      });
    }

    /* ── Glossar-Suche: Tippen (throttled, sehr leise) ── */
    var gs = document.getElementById("glossary-search");
    if (gs) {
      var gsTh = throttle(function() {
        // Einzelner Noise-Burst, kein Schreibmaschinen-Ping
        play(function(c,out) {
          var n = makeNoise(c,0.018,0.3); var s = c.createBufferSource(); s.buffer=n;
          var hp = filt(c,"highpass",3000); var e = c.createGain();
          e.gain.setValueAtTime(0.4,c.currentTime);
          e.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.018);
          s.connect(hp); hp.connect(e); e.connect(out); s.start(); s.stop(c.currentTime+0.02);
        }, CFG.hover * 1.2);
      }, 140);
      gs.addEventListener("input", gsTh);
    }

    /* ── Tastatur ── */
    document.addEventListener("keydown", function(e) {
      if (e.key!=="Enter" && e.key!==" ") return;
      var t = e.target;
      if (t.closest && t.closest(".flip-w")) { play(paperFlipOpen, CFG.sfx); return; }
      if (t.closest && t.closest(".poster-card")) { play(revealOpen, CFG.sfx); return; }
      if (t.closest && t.closest(".map-pin")) { play(pinClick, CFG.sfx); return; }
    });

    /* ── Scroll: Ambient updaten ── */
    window.addEventListener("scroll", throttle(updateAmbientZone, 350), {passive:true});
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════ */

  function init() {
    if (prefersReducedMotion) {
      console.info("[sounds.js] prefers-reduced-motion — deaktiviert.");
      return;
    }
    createMuteButton();
    bind();
    setupSpecialTriggers();
    console.info(
      "[sounds.js] v4.0\n" +
      "  Entfernt: persp-btn · read-more · footer-links · q-filter\n" +
      "  Interaktion: flip (vor/rück) · stamp (schwer/leicht) · poster (auf/zu) · pin · feder · glocke · thud · schublade · whoosh\n" +
      "  Atmosphäre: Fassade · Realität · Gedenken · Quiz · Heute\n" +
      "  Spezial: Schreibmaschinen-Return · Seufzen · Startschuss · Briefrascheln · Metronom · Wind · Morse(1936) · Streicherdrone · Epilog-Piano"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
