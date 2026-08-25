/**
 * lib/audio/boot-chime.ts — boot chime for identity C · Ink & paper.
 *
 * TypeScript port of `design/assets/chime/boot-chime.js`, which stays in the
 * repo as the authoritative composition record (see DESIGN.md). Every number
 * that defines the sound lives in `spec`; `play()` is a renderer of that spec.
 *
 * Deliberately imported nowhere yet. Sound is off by default (brief §2.2) and
 * the boot sequence belongs to `feat/shell-boot-profile`. When it is wired:
 * call `play()` only after the visitor has opted in, only from a user gesture
 * (browsers gate AudioContext on one), and never under prefers-reduced-motion
 * — the boot sequence does not run there, so neither does this.
 */

export interface ThudSpec {
  readonly type: OscillatorType;
  readonly startHz: number;
  readonly endHz: number;
  readonly glideMs: number;
  readonly attackMs: number;
  readonly peak: number;
  readonly decayMs: number;
}

export interface ClickSpec {
  readonly atMs: number;
  readonly noise: {
    readonly centerHz: number;
    readonly q: number;
    readonly durationMs: number;
    readonly peak: number;
  };
  readonly ping: {
    readonly type: OscillatorType;
    readonly hz: number;
    readonly durationMs: number;
    readonly peak: number;
  };
}

export interface BootChimeSpec {
  readonly name: string;
  readonly identity: string;
  readonly totalDurationMs: number;
  /** Master level. 0.5 keeps the summed peak around -6 dBFS. */
  readonly masterGain: number;
  /** Event 1 — the thud. A sine that drops in pitch as it decays. */
  readonly thud: ThudSpec;
  /** Event 2 — the click: band-passed noise burst plus a short sine ping. */
  readonly click: ClickSpec;
}

export const spec: BootChimeSpec = {
  name: "boot-chime",
  identity: "C · Ink & paper",
  totalDurationMs: 420,
  masterGain: 0.5,
  thud: {
    type: "sine",
    startHz: 90,
    endHz: 55,
    glideMs: 220,
    attackMs: 6,
    peak: 0.8,
    decayMs: 300,
  },
  click: {
    atMs: 170,
    noise: { centerHz: 3200, q: 6, durationMs: 18, peak: 0.6 },
    ping: { type: "sine", hz: 2600, durationMs: 30, peak: 0.35 },
  },
};

/** Exponential ramps cannot reach 0. */
const FLOOR = 0.0001;

export interface PlayOptions {
  /** Context time to start (default: now). */
  when?: number;
  /** Linear multiplier on masterGain (default: 1). */
  gain?: number;
  /** Node to connect to (default: ctx.destination). */
  destination?: AudioNode;
}

/**
 * Render the spec into an AudioContext.
 * @returns context time at which the chime has finished.
 */
export function play(ctx: AudioContext, opts: PlayOptions = {}): number {
  const t0 = (opts.when ?? ctx.currentTime) + 0.01;
  const s = spec;

  const master = ctx.createGain();
  master.gain.value = (opts.gain ?? 1) * s.masterGain;
  master.connect(opts.destination ?? ctx.destination);

  // Thud
  const { thud } = s;
  const osc = ctx.createOscillator();
  osc.type = thud.type;
  osc.frequency.setValueAtTime(thud.startHz, t0);
  osc.frequency.exponentialRampToValueAtTime(thud.endHz, t0 + thud.glideMs / 1000);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(FLOOR, t0);
  thudGain.gain.linearRampToValueAtTime(thud.peak, t0 + thud.attackMs / 1000);
  thudGain.gain.exponentialRampToValueAtTime(FLOOR, t0 + thud.decayMs / 1000);
  osc.connect(thudGain);
  thudGain.connect(master);
  osc.start(t0);
  osc.stop(t0 + thud.decayMs / 1000 + 0.02);

  // Click — noise burst
  const tc = t0 + s.click.atMs / 1000;
  const n = s.click.noise;
  const length = Math.max(1, Math.ceil((ctx.sampleRate * n.durationMs) / 1000));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = n.centerHz;
  band.Q.value = n.q;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(n.peak, tc);
  noiseGain.gain.exponentialRampToValueAtTime(FLOOR, tc + n.durationMs / 1000);
  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(tc);
  noise.stop(tc + n.durationMs / 1000 + 0.01);

  // Click — ping
  const p = s.click.ping;
  const ping = ctx.createOscillator();
  ping.type = p.type;
  ping.frequency.value = p.hz;
  const pingGain = ctx.createGain();
  pingGain.gain.setValueAtTime(p.peak, tc);
  pingGain.gain.exponentialRampToValueAtTime(FLOOR, tc + p.durationMs / 1000);
  ping.connect(pingGain);
  pingGain.connect(master);
  ping.start(tc);
  ping.stop(tc + p.durationMs / 1000 + 0.01);

  return t0 + s.totalDurationMs / 1000;
}
