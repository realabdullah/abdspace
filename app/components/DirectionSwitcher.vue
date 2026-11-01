<script setup lang="ts">
// The door between art directions. It sits beside 明 and reads as one more quiet glyph.
const { current, meta, go } = useDirection();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const listId = useId();

const choose = async (id: DirectionId) => {
	open.value = false;
	await go(id);
};

const onOutside = (event: PointerEvent) => {
	if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
};
const onKey = (event: KeyboardEvent) => {
	if (event.key === "Escape" && open.value) {
		open.value = false;
		root.value?.querySelector<HTMLButtonElement>(".door__trigger")?.focus();
	}
};

onMounted(() => {
	document.addEventListener("pointerdown", onOutside);
	document.addEventListener("keydown", onKey);
});
onUnmounted(() => {
	document.removeEventListener("pointerdown", onOutside);
	document.removeEventListener("keydown", onKey);
});
</script>

<template>
	<div ref="root" class="door">
		<button
			type="button"
			class="door__trigger"
			:aria-expanded="open"
			:aria-controls="listId"
			:aria-label="`Art direction: ${meta.name}. Choose another room`"
			:title="`room: ${meta.name}`"
			@click="open = !open"
		>
			<span lang="ja" aria-hidden="true">{{ meta.glyph }}</span>
		</button>
		<Transition name="door">
			<ul v-show="open" :id="listId" class="door__list mono">
				<li v-for="direction in DIRECTIONS" :key="direction.id">
					<button type="button" class="door__room" :aria-current="direction.id === current" @click="choose(direction.id)">
						<span lang="ja" class="door__glyph" aria-hidden="true">{{ direction.glyph }}</span>
						<span class="door__name">{{ direction.name }}</span>
						<span class="door__note">{{ direction.note }}</span>
					</button>
				</li>
			</ul>
		</Transition>
	</div>
</template>

<style scoped>
.door {
	position: relative;
	display: inline-flex;
}
.door__trigger {
	display: inline-grid;
	place-items: center;
	width: 2.75rem;
	height: 2.75rem;
	margin: -0.5rem;
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-weight: 500;
	font-size: 1.375rem;
	line-height: 1;
	color: var(--faint);
	transition: color 300ms ease;
}
.door__trigger:hover,
.door__trigger[aria-expanded="true"] {
	color: var(--fg);
}
.door__list {
	position: absolute;
	top: calc(100% + 0.9rem);
	right: -0.75rem;
	z-index: 50;
	display: grid;
	min-width: 19rem;
	padding: 0.4rem;
	background: var(--bg);
	color: var(--fg);
	border: 1px solid var(--rule);
	box-shadow: 0 18px 40px -24px color-mix(in srgb, var(--fg) 45%, transparent);
	transform-origin: top right;
}
.door__room {
	display: grid;
	grid-template-columns: 1.75rem 5.5rem 1fr;
	align-items: baseline;
	gap: 0.5rem;
	width: 100%;
	padding: 0.55rem 0.6rem;
	text-align: left;
	color: var(--muted);
	transition:
		color 200ms ease,
		background-color 200ms ease;
}
.door__room:hover,
.door__room:focus-visible {
	color: var(--fg);
	background: color-mix(in srgb, var(--fg) 5%, transparent);
}
.door__room[aria-current="true"] {
	color: var(--fg);
}
.door__room[aria-current="true"] .door__name::after {
	content: " ·";
}
.door__glyph {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-size: 1.05rem;
	color: var(--fg);
}
.door__note {
	color: var(--muted);
	font-style: italic;
}
.door-enter-active,
.door-leave-active {
	transition:
		opacity 220ms ease,
		transform 320ms var(--ease-out);
}
.door-enter-from,
.door-leave-to {
	opacity: 0;
	transform: scaleY(0.96) translateY(-4px);
}
@media (max-width: 30rem) {
	.door__list {
		min-width: min(19rem, calc(100vw - 2rem));
	}
	.door__room {
		grid-template-columns: 1.75rem 1fr;
	}
	.door__note {
		grid-column: 2;
	}
}
</style>
