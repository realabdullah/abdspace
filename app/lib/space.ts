/** Just enough 3D math for one orbiting camera: column-major 4×4 matrices, as WebGL expects. */

export type Vec3 = [number, number, number];
export type Mat4 = Float32Array;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(...a) || 1));

export const perspective = (fovY: number, aspect: number, near: number, far: number): Mat4 => {
	const f = 1 / Math.tan(fovY / 2);
	const nf = 1 / (near - far);
	// prettier-ignore
	return new Float32Array([
		f / aspect, 0, 0, 0,
		0, f, 0, 0,
		0, 0, (far + near) * nf, -1,
		0, 0, 2 * far * near * nf, 0,
	]);
};

export const lookAt = (eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 => {
	const z = normalize(sub(eye, target));
	const x = normalize(cross(up, z));
	const y = cross(z, x);
	// prettier-ignore
	return new Float32Array([
		x[0], y[0], z[0], 0,
		x[1], y[1], z[1], 0,
		x[2], y[2], z[2], 0,
		-dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
	]);
};

export const multiply = (a: Mat4, b: Mat4): Mat4 => {
	const out = new Float32Array(16);
	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			let sum = 0;
			for (let k = 0; k < 4; k++) sum += a[k * 4 + row]! * b[col * 4 + k]!;
			out[col * 4 + row] = sum;
		}
	}
	return out;
};

/** World point to CSS pixels. `behind` is true when the point is behind the camera. */
export const project = (m: Mat4, p: Vec3, width: number, height: number) => {
	const x = m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!;
	const y = m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!;
	const w = m[3]! * p[0] + m[7]! * p[1] + m[11]! * p[2] + m[15]!;
	return { x: ((x / w + 1) / 2) * width, y: ((1 - y / w) / 2) * height, behind: w <= 0 };
};

/** Slab test: distance along the ray to an axis-aligned box, or Infinity on a miss. */
export const rayBox = (origin: Vec3, dir: Vec3, centre: Vec3, size: Vec3) => {
	let near = -Infinity;
	let far = Infinity;
	for (let i = 0; i < 3; i++) {
		const min = centre[i]! - size[i]! / 2;
		const max = centre[i]! + size[i]! / 2;
		if (Math.abs(dir[i]!) < 1e-9) {
			if (origin[i]! < min || origin[i]! > max) return Infinity;
			continue;
		}
		let t1 = (min - origin[i]!) / dir[i]!;
		let t2 = (max - origin[i]!) / dir[i]!;
		if (t1 > t2) [t1, t2] = [t2, t1];
		near = Math.max(near, t1);
		far = Math.min(far, t2);
		if (near > far) return Infinity;
	}
	return far < 0 ? Infinity : Math.max(0, near);
};

/** A unit cube with a normal and a 0–1 coordinate on every face, so the shader can ink each face's edges. */
export const createBox = (gl: WebGL2RenderingContext) => {
	const faces: { n: Vec3; u: Vec3; v: Vec3 }[] = [
		{ n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
		{ n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
		{ n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
		{ n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
		{ n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
		{ n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
	];
	const data: number[] = [];
	const indices: number[] = [];
	faces.forEach(({ n, u, v }, f) => {
		for (const [su, sv] of [
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		] as const) {
			const p = add(scale(n, 0.5), add(scale(u, su - 0.5), scale(v, sv - 0.5)));
			data.push(...p, ...n, su, sv);
		}
		const o = f * 4;
		indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
	});

	const vao = gl.createVertexArray()!;
	gl.bindVertexArray(vao);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	const stride = 8 * 4;
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24);
	gl.bindVertexArray(null);

	return () => {
		gl.bindVertexArray(vao);
		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
	};
};
