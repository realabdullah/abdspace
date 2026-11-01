<script setup lang="ts">
const { enabled, toggle } = useRoomSound();
</script>

<template>
	<button type="button" class="sound mono" :aria-pressed="enabled" @click="toggle">
		<span class="sound__bars" aria-hidden="true"><i /><i /><i /></span>
		sound {{ enabled ? "on" : "off" }}
	</button>
</template>

<style scoped>
.sound {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--muted);
	padding: 0.5rem 0;
	transition: color 200ms ease;
}
.sound:hover,
.sound[aria-pressed="true"] {
	color: var(--fg);
}
.sound__bars {
	display: inline-flex;
	align-items: flex-end;
	gap: 2px;
	height: 0.7rem;
}
.sound__bars i {
	width: 1px;
	height: 30%;
	background: currentColor;
	transition: height 300ms var(--ease-out);
}
.sound[aria-pressed="true"] .sound__bars i {
	animation: level 1.1s ease-in-out infinite alternate;
}
.sound[aria-pressed="true"] .sound__bars i:nth-child(2) {
	animation-delay: -0.4s;
}
.sound[aria-pressed="true"] .sound__bars i:nth-child(3) {
	animation-delay: -0.75s;
}
@keyframes level {
	from {
		height: 25%;
	}
	to {
		height: 100%;
	}
}
</style>
