/**
 * Two small instruments, synthesised on the spot so nothing is downloaded:
 * a plucked string (Karplus–Strong) for the tension room and a soft FM bell for the score.
 * Sound is always opt-in; nothing plays until a visitor turns it on.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;

const ensure = () => {
	if (!context) {
		context = new AudioContext();
		const compressor = context.createDynamicsCompressor();
		compressor.threshold.value = -18;
		compressor.ratio.value = 4;
		master = context.createGain();
		master.gain.value = 0.5;
		master.connect(compressor).connect(context.destination);
	}
	if (context.state === "suspended") void context.resume();
	return { context, master: master! };
};

/** Call from the click that turns sound on, so the browser lets the context start. */
export const unlockAudio = () => void ensure();

const output = (gain: number, pan: number) => {
	const { context, master } = ensure();
	const amp = context.createGain();
	amp.gain.value = gain;
	const panner = context.createStereoPanner();
	panner.pan.value = Math.max(-1, Math.min(1, pan));
	amp.connect(panner).connect(master);
	return { context, amp };
};

interface PluckOptions {
	frequency: number;
	/** 0–1, how hard. */
	velocity?: number;
	/** -1 (left) to 1 (right). */
	pan?: number;
	/** 0–1. Plucking near the end of a string is brighter than plucking in the middle. */
	brightness?: number;
	/** Seconds until it has mostly rung out. */
	sustain?: number;
}

/**
 * Karplus–Strong: fill a delay line one period long with noise, then keep averaging neighbours as it loops.
 * The averaging is a low-pass filter, so high harmonics die first, which is exactly how a real string decays.
 */
export const pluck = ({ frequency, velocity = 0.6, pan = 0, brightness = 0.5, sustain = 2.2 }: PluckOptions) => {
	const { context, amp } = output(0.18 + velocity * 0.5, pan);
	const rate = context.sampleRate;
	const length = Math.floor(rate * (sustain + 0.3));
	const buffer = context.createBuffer(1, length, rate);
	const out = buffer.getChannelData(0);

	const period = Math.max(2, Math.round(rate / frequency));
	const ring = new Float32Array(period);
	// Softer plucks start from smoother noise, which is what a fingertip does compared to a pick.
	let smooth = 0;
	const softness = 0.75 - brightness * 0.6;
	for (let i = 0; i < period; i++) {
		smooth = smooth * softness + (Math.random() * 2 - 1) * (1 - softness);
		ring[i] = smooth;
	}

	// Per-sample loss that leaves roughly -60 dB after `sustain` seconds at this pitch.
	const loss = Math.pow(0.001, 1 / (sustain * frequency));
	const blend = 0.5 - brightness * 0.12;
	let index = 0;
	for (let i = 0; i < length; i++) {
		const next = (index + 1) % period;
		const sample = ring[index]!;
		out[i] = sample;
		ring[index] = loss * ((1 - blend) * sample + blend * ring[next]!);
		index = next;
	}
	const fade = Math.floor(rate * 0.05);
	for (let i = 0; i < fade; i++) out[length - 1 - i]! *= i / fade;

	const source = context.createBufferSource();
	source.buffer = buffer;
	source.connect(amp);
	source.start();
};

interface BellOptions {
	frequency: number;
	velocity?: number;
	pan?: number;
	duration?: number;
}

/** Two-operator FM with an inharmonic ratio: a short, glassy tone whose overtones fade before its body does. */
export const bell = ({ frequency, velocity = 0.5, pan = 0, duration = 1.6 }: BellOptions) => {
	const { context, amp } = output(0.12 + velocity * 0.3, pan);
	const now = context.currentTime;

	const carrier = context.createOscillator();
	carrier.frequency.value = frequency;
	const modulator = context.createOscillator();
	modulator.frequency.value = frequency * 3.5;
	const depth = context.createGain();
	depth.gain.setValueAtTime(frequency * 2.2 * velocity, now);
	depth.gain.exponentialRampToValueAtTime(1, now + duration * 0.6);
	modulator.connect(depth).connect(carrier.frequency);

	const envelope = context.createGain();
	envelope.gain.setValueAtTime(0.0001, now);
	envelope.gain.exponentialRampToValueAtTime(1, now + 0.008);
	envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
	carrier.connect(envelope).connect(amp);

	carrier.start(now);
	modulator.start(now);
	carrier.stop(now + duration + 0.05);
	modulator.stop(now + duration + 0.05);
};
