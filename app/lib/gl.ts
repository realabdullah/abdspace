/**
 * The small amount of WebGL2 plumbing every room shares. No engine: each room owns its own shaders
 * and draws in a few passes, so this file only removes the boilerplate around them.
 */

export type GL = WebGL2RenderingContext;
export type RGB = [number, number, number];

export interface Program {
	program: WebGLProgram;
	uniforms: Record<string, WebGLUniformLocation>;
	use: () => void;
}

export interface Target {
	texture: WebGLTexture;
	fbo: WebGLFramebuffer;
	width: number;
	height: number;
}

export interface DoubleTarget {
	read: Target;
	write: Target;
	swap: () => void;
}

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
	v_uv = a_pos * 0.5 + 0.5;
	gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const createGL = (canvas: HTMLCanvasElement, options: WebGLContextAttributes = {}): GL | null =>
	canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", ...options });

const compile = (gl: GL, type: number, source: string) => {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader failed to compile: ${log}`);
	}
	return shader;
};

/** Links a program and looks up every active uniform, so callers write `uniforms.u_time`. */
export const createProgram = (gl: GL, vertex: string, fragment: string): Program => {
	const program = gl.createProgram()!;
	gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
	gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);

	const uniforms: Record<string, WebGLUniformLocation> = {};
	const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < count; i++) {
		const info = gl.getActiveUniform(program, i);
		if (!info) continue;
		const name = info.name.replace(/\[0\]$/, "");
		uniforms[name] = gl.getUniformLocation(program, info.name)!;
	}
	return { program, uniforms, use: () => gl.useProgram(program) };
};

/** One oversized triangle covers the screen with fewer edges than a quad. */
export const createFullscreenTriangle = (gl: GL) => {
	const vao = gl.createVertexArray()!;
	gl.bindVertexArray(vao);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.bindVertexArray(null);
	return () => {
		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};
};

interface TargetOptions {
	internalFormat?: number;
	format?: number;
	type?: number;
	filter?: number;
}

export const createTarget = (gl: GL, width: number, height: number, options: TargetOptions = {}): Target => {
	const { internalFormat = gl.RGBA16F, format = gl.RGBA, type = gl.HALF_FLOAT, filter = gl.LINEAR } = options;
	const texture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

	const fbo = gl.createFramebuffer()!;
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.viewport(0, 0, width, height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	return { texture, fbo, width, height };
};

export const createDoubleTarget = (gl: GL, width: number, height: number, options: TargetOptions = {}): DoubleTarget => {
	const pair = { read: createTarget(gl, width, height, options), write: createTarget(gl, width, height, options) };
	return {
		get read() {
			return pair.read;
		},
		get write() {
			return pair.write;
		},
		swap: () => ([pair.read, pair.write] = [pair.write, pair.read]),
	};
};

export const deleteTarget = (gl: GL, target: Target) => {
	gl.deleteTexture(target.texture);
	gl.deleteFramebuffer(target.fbo);
};

/** Draw into a target, or into the canvas when it's null. */
export const bindTarget = (gl: GL, target: Target | null) => {
	gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo ?? null);
	gl.viewport(0, 0, target?.width ?? gl.drawingBufferWidth, target?.height ?? gl.drawingBufferHeight);
};

export const bindTexture = (gl: GL, unit: number, texture: WebGLTexture) => {
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	return unit;
};

/** Match the backing store to the CSS size. Returns true when it changed. DPR is capped: past 2 nobody sees the difference, everybody pays for it. */
export const fitCanvas = (canvas: HTMLCanvasElement, maxDpr = 2) => {
	const dpr = Math.min(devicePixelRatio || 1, maxDpr);
	const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
	const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
	if (canvas.width === width && canvas.height === height) return false;
	canvas.width = width;
	canvas.height = height;
	return true;
};

/** A requestAnimationFrame loop with a clamped delta, so a backgrounded tab doesn't come back with a 30 second step. */
export const startLoop = (frame: (time: number, delta: number) => void) => {
	let handle = 0;
	let last = performance.now();
	const step = (now: number) => {
		const delta = Math.min(0.05, (now - last) / 1000);
		last = now;
		frame(now / 1000, delta);
		handle = requestAnimationFrame(step);
	};
	handle = requestAnimationFrame(step);
	return () => cancelAnimationFrame(handle);
};

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const parseColor = (value: string): RGB => {
	const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
	if (hex) {
		const n = Number.parseInt(hex[1]!, 16);
		return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
	}
	const rgb = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
	return [(rgb[0] ?? 0) / 255, (rgb[1] ?? 0) / 255, (rgb[2] ?? 0) / 255];
};

export interface Palette {
	bg: RGB;
	fg: RGB;
	muted: RGB;
	faint: RGB;
	dark: boolean;
}

/** The site's own tokens, read from CSS, so every shader follows 明. */
export const readPalette = (): Palette => {
	const style = getComputedStyle(document.documentElement);
	return {
		bg: parseColor(style.getPropertyValue("--bg")),
		fg: parseColor(style.getPropertyValue("--fg")),
		muted: parseColor(style.getPropertyValue("--muted")),
		faint: parseColor(style.getPropertyValue("--faint")),
		dark: document.documentElement.classList.contains("dark"),
	};
};

export const watchPalette = (onChange: (palette: Palette) => void) => {
	const observer = new MutationObserver(() => onChange(readPalette()));
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => observer.disconnect();
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate independent easing toward a target: `rate` is roughly "fraction covered per second". */
export const damp = (current: number, target: number, rate: number, delta: number) => lerp(current, target, 1 - Math.exp(-rate * delta));
