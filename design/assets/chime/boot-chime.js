/*
 * design/assets/chime/boot-chime.js — boot chime for identity C · Ink & paper
 *
 * Concept: a soft low sine thud followed by a single bright click — a stamp landing
 * on paper. Two events, about 0.4 s in total, well inside the ~1.2 s boot.
 *
 * This is the chime asset: an original composition delivered as a Web Audio synthesis
 * spec in code. No audio file exists or is committed. Every number that defines the
 * sound is in `spec` below; `play()` is a reference renderer of that spec.
 *
 * Delivery notes
 *  · Classic script, not a module, so the local preview (index.html) can play it
 *    straight from disk; spine S1 ports it to TypeScript and imports it in the app.
 *  · Sound is off by default at the app layer. Call play() only after the visitor has
 *    opted in, and only from a user gesture (browsers gate AudioContext on one).
 *  · Under prefers-reduced-motion the boot sequence does not run, so neither does this.
 */
(function (global) {
  "use strict";

  var spec = {
    name: "boot-chime",
    identity: "C · Ink & paper",
    totalDurationMs: 420,
    // Master level. 0.5 keeps the summed peak around -6 dBFS.
    masterGain: 0.5,
    // Event 1 — the thud. A sine that drops in pitch as it decays, like a soft impact.
    thud: {
      type: "sine",
      startHz: 90,
      endHz: 55,
      glideMs: 220,
      attackMs: 6,
      peak: 0.8,
      decayMs: 300
    },
    // Event 2 — the click, 170 ms after the thud begins. A band-passed noise burst
    // gives the paper-and-stamp texture; a short sine ping gives it a bright centre.
    click: {
      atMs: 170,
      noise: { centerHz: 3200, q: 6, durationMs: 18, peak: 0.6 },
      ping: { type: "sine", hz: 2600, durationMs: 30, peak: 0.35 }
    }
  };

  var FLOOR = 0.0001; // exponential ramps cannot reach 0

  /**
   * Render the spec into an AudioContext.
   * @param {AudioContext} ctx
   * @param {{when?: number, gain?: number, destination?: AudioNode}} [opts]
   *   when        — context time to start (default: now)
   *   gain        — linear multiplier on masterGain (default: 1)
   *   destination — node to connect to (default: ctx.destination)
   * @returns {number} context time at which the chime has finished
   */
  function play(ctx, opts) {
    opts = opts || {};
    var t0 = (typeof opts.when === "number" ? opts.when : ctx.currentTime) + 0.01;
    var s = spec;

    var master = ctx.createGain();
    master.gain.value = (typeof opts.gain === "number" ? opts.gain : 1) * s.masterGain;
    master.connect(opts.destination || ctx.destination);

    // Thud
    var thud = s.thud;
    var osc = ctx.createOscillator();
    osc.type = thud.type;
    osc.frequency.setValueAtTime(thud.startHz, t0);
    osc.frequency.exponentialRampToValueAtTime(thud.endHz, t0 + thud.glideMs / 1000);
    var thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(FLOOR, t0);
    thudGain.gain.linearRampToValueAtTime(thud.peak, t0 + thud.attackMs / 1000);
    thudGain.gain.exponentialRampToValueAtTime(FLOOR, t0 + thud.decayMs / 1000);
    osc.connect(thudGain);
    thudGain.connect(master);
    osc.start(t0);
    osc.stop(t0 + thud.decayMs / 1000 + 0.02);

    // Click — noise burst
    var tc = t0 + s.click.atMs / 1000;
    var n = s.click.noise;
    var length = Math.max(1, Math.ceil((ctx.sampleRate * n.durationMs) / 1000));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource();
    noise.buffer = buffer;
    var band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = n.centerHz;
    band.Q.value = n.q;
    var noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(n.peak, tc);
    noiseGain.gain.exponentialRampToValueAtTime(FLOOR, tc + n.durationMs / 1000);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(tc);
    noise.stop(tc + n.durationMs / 1000 + 0.01);

    // Click — ping
    var p = s.click.ping;
    var ping = ctx.createOscillator();
    ping.type = p.type;
    ping.frequency.value = p.hz;
    var pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(p.peak, tc);
    pingGain.gain.exponentialRampToValueAtTime(FLOOR, tc + p.durationMs / 1000);
    ping.connect(pingGain);
    pingGain.connect(master);
    ping.start(tc);
    ping.stop(tc + p.durationMs / 1000 + 0.01);

    return t0 + s.totalDurationMs / 1000;
  }

  global.bootChime = { spec: spec, play: play };
})(typeof globalThis !== "undefined" ? globalThis : this);
