/**
 * sounds.js — Diskrete Soundeffekte für „Die zwei Gesichter von 1936"
 *
 * Alle Sounds werden per Web Audio API synthetisch erzeugt.
 * → Kein externer Server, keine Ladezeit, keine CORS-Probleme.
 * → Respektiert prefers-reduced-motion (Bewegungsreduktion = auch Sounds aus).
 * → Nutzer kann Sounds global deaktivieren (Mute-Button).
 * → Sounds sind subtil: < 300 ms, leise, historisch inspiriert.
 *
 * EINBINDUNG:
 *   Füge am Ende des <body>, nach dem bestehenden <script>-Block, ein:
 *   <script src="sounds.js"></script>
 *
 * GITHUB:
 *   Datei einfach ins Root des Repos legen (neben index.html).
 */

(function () {
  "use strict";

  /* ─── Globale Steuerung ─── */
  let ctx = null;          // AudioContext — lazy init (Autoplay-Policy)
  let masterGain = null;
  let muted = false;

  // Reduzierte Bewegung = auch Sounds aus
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.38; // Globale Lautstärke (0–1)
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function play(fn) {
    if (muted || prefersReducedMotion) return;
    try {
      const c = getCtx();
      fn(c, masterGain);
    } catch (e) {
      // Kein Sound = kein Problem
    }
  }

  /* ══════════════════════════════════════════════
     SOUND-BIBLIOTHEK
     Jede Funktion erhält (ctx, out) und erzeugt
     kurze synthetische Geräusche.
  ══════════════════════════════════════════════ */

  /**
   * paperRustle — Zeitungsblättern / Seite umdrehen
   * Weißes Rauschen mit schnellem Attack, sanftem Decay.
   * Einsatz: Flip-Karten, Protokoll-Toggle.
   */
  function paperRustle(ctx, out) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Bandpass-Filter — dämpft tiefe und hohe Frequenzen
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2800;
    bp.Q.value = 0.8;

    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.9, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    src.connect(bp);
    bp.connect(env);
    env.connect(out);
    src.start(now);
    src.stop(now + 0.19);
  }

  /**
   * stampClick — Stempel / Entscheidung
   * Kurzer Impuls mit leichtem Klick-Charakter.
   * Einsatz: Dilemma-Buttons, IOC-Vote, Quiz-Antworten.
   */
  function stampClick(ctx, out) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.7, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // Leichter Tiefpass für wärmeren Klang
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;

    osc.connect(lp);
    lp.connect(env);
    env.connect(out);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * softTick — Leises Klicken / Tippen
   * Sehr kurzer neutraler Klick.
   * Einsatz: Navigations-Buttons, Menü, Perspektiv-Wechsel.
   */
  function softTick(ctx, out) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 200);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0.6, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;

    src.connect(hp);
    hp.connect(env);
    env.connect(out);
    src.start(now);
    src.stop(now + 0.05);
  }

  /**
   * pinDrop — Nadel auf Karte / Map-Pin
   * Kurzes "Plink" mit leichtem Hall-Effekt.
   * Einsatz: Kartenmarkierungen auf der Berlin-Karte.
   */
  function pinDrop(ctx, out) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(env);
    env.connect(out);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  /**
   * penScratch — Feder / Stift auf Papier
   * Leises Kratzen — für Quiz-Auswahl.
   * Einsatz: Quiz-Antwort-Buttons.
   */
  function penScratch(ctx, out) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.09, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // Gefiltertes Rauschen mit leichter Rauigkeit
      data[i] =
        (Math.random() * 2 - 1) *
        Math.sin((i / buf.length) * Math.PI) *
        0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3500;
    bp.Q.value = 1.2;

    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.65, now + 0.02);
    env.gain.linearRampToValueAtTime(0.55, now + 0.07);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    src.connect(bp);
    bp.connect(env);
    env.connect(out);
    src.start(now);
    src.stop(now + 0.1);
  }

  /**
   * revealWhoosh — Leises Enthüllen / Aufklappen
   * Kurzes weiches Rauschen mit aufsteigendem Filter.
   * Einsatz: Poster-Karte aufklappen, Protokoll sichtbar werden.
   */
  function revealWhoosh(ctx, out) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.14, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (i / data.length) * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime ? 
      bp.frequency.setValueAtTime(600, ctx.currentTime) : 
      (bp.frequency.value = 600);
    
    // Frequenz-Sweep nach oben
    if (bp.frequency.linearRampToValueAtTime) {
      bp.frequency.linearRampToValueAtTime(2200, ctx.currentTime + 0.14);
    }
    bp.Q.value = 0.6;

    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    src.connect(bp);
    bp.connect(env);
    env.connect(out);
    src.start(now);
    src.stop(now + 0.15);
  }

  /**
   * correctChime — Leises Aufleuchten / Richtig
   * Zwei kurze harmonische Töne.
   * Einsatz: Richtige Quiz-Antwort.
   */
  function correctChime(ctx, out) {
    [[523, 0], [659, 0.07]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const now = ctx.currentTime + delay;

      osc.type = "sine";
      osc.frequency.value = freq;

      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.28, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(env);
      env.connect(out);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  /**
   * wrongThud — Dumpfer Ton / Falsch
   * Ein leiser tiefer Impuls.
   * Einsatz: Falsche Quiz-Antwort.
   */
  function wrongThud(ctx, out) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.15);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(env);
    env.connect(out);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  /**
   * menuOpen — Leises Entfalten des Menüs
   * Sehr kurzes weiches Klicken.
   * Einsatz: Kapitelmenü öffnen/schließen.
   */
  function menuOpen(ctx, out) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(env);
    env.connect(out);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /* ══════════════════════════════════════════════
     MUTE-BUTTON — wird rechts oben in der Seite
     neben dem bestehenden #pill platziert.
  ══════════════════════════════════════════════ */

  function createMuteButton() {
    const btn = document.createElement("button");
    btn.id = "sound-mute-btn";
    btn.setAttribute("aria-label", "Sounds ein/aus");
    btn.setAttribute("title", "Sounds ein/aus");
    btn.textContent = "🔔";
    btn.style.cssText = [
      "position:fixed",
      "top:14px",
      "right:120px",      // links vom #pill
      "z-index:9502",
      "width:36px",
      "height:36px",
      "border-radius:50%",
      "background:rgba(11,37,69,.9)",
      "border:1px solid var(--gold)",
      "color:var(--gold)",
      "font-size:.95rem",
      "cursor:pointer",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "backdrop-filter:blur(8px)",
      "-webkit-backdrop-filter:blur(8px)",
      "transition:background .3s",
      "line-height:1",
    ].join(";");

    btn.addEventListener("click", () => {
      muted = !muted;
      btn.textContent = muted ? "🔕" : "🔔";
      btn.setAttribute(
        "aria-label",
        muted ? "Sounds einschalten" : "Sounds ausschalten"
      );
      btn.style.opacity = muted ? "0.5" : "1";
      // Kleines Feedback wenn eingeschaltet wird
      if (!muted) play(softTick);
    });

    document.body.appendChild(btn);
  }

  /* ══════════════════════════════════════════════
     EVENT-BINDINGS
     Alle Sounds werden per Event-Delegation an
     document gebunden — robust gegenüber dynamisch
     generiertem Inhalt (Quiz, Dilemmas).
  ══════════════════════════════════════════════ */

  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target;

      /* ── Flip-Karten: Zeitungsblättern ── */
      if (t.closest(".flip-w") || t.closest(".flip-i") || t.closest(".flip-f")) {
        play(paperRustle);
        return;
      }

      /* ── Perspektiv-Buttons ── */
      if (t.classList.contains("persp-btn")) {
        play(softTick);
        return;
      }

      /* ── Protokoll-Toggle ── */
      if (t.classList.contains("protocol-btn")) {
        play(paperRustle);
        return;
      }

      /* ── Quiz-Antworten ── */
      if (t.classList.contains("qbtn")) {
        play(penScratch);
        return;
      }

      /* ── Dilemma-Buttons ── */
      if (t.classList.contains("dilemma-btn")) {
        play(stampClick);
        return;
      }

      /* ── IOC-Vote ── */
      if (t.classList.contains("ioc-btn")) {
        play(stampClick);
        return;
      }

      /* ── Poster-Karten aufklappen ── */
      if (t.closest(".poster-card")) {
        play(revealWhoosh);
        return;
      }

      /* ── Karten-Pins ── */
      if (t.closest(".map-pin")) {
        play(pinDrop);
        return;
      }

      /* ── Zitat-Filter ── */
      if (t.classList.contains("q-filter-btn")) {
        play(softTick);
        return;
      }

      /* ── Kapitelmenü (pill-Button) ── */
      if (t.id === "pill" || t.closest("#pill")) {
        play(menuOpen);
        return;
      }

      /* ── Glossar-Button ── */
      if (t.id === "glossary-btn" || t.closest("#glossary-btn")) {
        play(menuOpen);
        return;
      }

      /* ── Zurück-nach-oben ── */
      if (t.id === "back-to-top" || t.closest("#back-to-top")) {
        play(softTick);
        return;
      }

      /* ── "Mehr anzeigen"-Expander ── */
      if (t.classList.contains("xbtn") || t.closest(".xbtn")) {
        play(revealWhoosh);
        return;
      }

      /* ── Weiterlesen-Links ── */
      if (t.classList.contains("read-more") || t.closest(".read-more")) {
        play(softTick);
        return;
      }

      /* ── Kartei-Wrap (scrollbar) - kein Sound nötig ── */

      /* ── Footer-Links / Navigations-Links ── */
      if (
        t.closest(".foot-nav a") ||
        t.closest("#chapter-menu a")
      ) {
        play(softTick);
        return;
      }

      /* ── Quiz-Reset ── */
      if (t.id === "qreset") {
        play(paperRustle);
        return;
      }
    });

    /* ── Quiz: Richtig/Falsch-Feedback ──
       Wir beobachten Klicks auf Quiz-Buttons und spielen
       nach kurzem Delay den Ergebnis-Sound ab.
    */
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t.classList.contains("qbtn")) return;
      // Warte kurz, bis die Klasse gesetzt ist
      setTimeout(() => {
        if (t.classList.contains("correct")) {
          play(correctChime);
        } else if (t.classList.contains("wrong")) {
          play(wrongThud);
        }
      }, 30);
    });

    /* ── Slider: Drag-Start ── */
    const handle = document.getElementById("slider-handle");
    if (handle) {
      let sliderPlayed = false;
      const playSlider = () => {
        if (!sliderPlayed) {
          play(softTick);
          sliderPlayed = true;
          setTimeout(() => {
            sliderPlayed = false;
          }, 300); // Throttle: max 1 Sound alle 300ms
        }
      };
      handle.addEventListener("mousedown", playSlider);
      handle.addEventListener("touchstart", playSlider, { passive: true });
    }
  }

  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */

  function init() {
    if (prefersReducedMotion) return; // Kein Sound bei Bewegungsreduktion
    createMuteButton();
    bind();

    // AudioContext erst nach erstem User-Interaction starten
    // (wird in play() via getCtx() erledigt)
    console.info(
      "[sounds.js] Soundeffekte geladen. Mute-Button: #sound-mute-btn"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
