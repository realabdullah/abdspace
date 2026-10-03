<script setup lang="ts">
const year = new Date().getFullYear();

// 頑張る, one piece at a time. Read top to bottom, like the hero.
const parts = [
	{ glyph: "頑", reading: "gan", meaning: "stubborn, firm, unwilling to give way" },
	{ glyph: "張", reading: "ba", meaning: "to stretch, to pull tight, to hold out" },
	{ glyph: "る", reading: "ru", meaning: "the ending that turns it into something you do" },
];
</script>

<template>
	<footer class="wrap">
		<section class="section word" aria-labelledby="word-title">
			<h2 id="word-title" class="section__label mono"><span>ganbaru</span><span lang="ja" class="faint">頑張る</span></h2>
			<div>
				<ol class="word__parts">
					<li v-for="(part, i) in parts" :key="part.glyph" class="word__part" :style="{ '--i': i }">
						<span lang="ja" class="word__glyph" aria-hidden="true">{{ part.glyph }}</span>
						<span class="mono muted">{{ part.reading }}</span>
						<span class="word__meaning">{{ part.meaning }}</span>
					</li>
				</ol>
				<p class="word__sum">Put together: hold firm and keep going, especially when it’s hard. <span class="muted">A word I came across once and kept. It’s how I try to work.</span></p>
			</div>
		</section>

		<div class="end mono muted">
			<span>© {{ year }} Abdullahi Odesanmi</span>
			<span class="end__mei">the switch up top is <span lang="ja">明</span>, bright: sun <span lang="ja">日</span> and moon <span lang="ja">月</span></span>
			<a href="#top" class="link">back to top ↑</a>
		</div>
	</footer>
</template>

<style scoped>
.word__parts {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: clamp(1rem, 4vw, 3rem);
}
.word__part {
	display: grid;
	align-content: start;
	gap: 0.5rem;
}
.word__glyph {
	font-weight: 800;
	font-size: clamp(3rem, 8vw, 5.5rem);
	line-height: 1;
	margin-bottom: 0.75rem;
}
.word__meaning {
	font-size: 1rem;
	line-height: 1.45;
	text-wrap: pretty;
}
.word__sum {
	max-width: 36rem;
	margin-top: clamp(2.5rem, 6vw, 4rem);
	font-size: clamp(1.25rem, 2.2vw, 1.5rem);
	font-weight: 300;
	line-height: 1.4;
	text-wrap: pretty;
}

/* Each character is brushed in as it scrolls into view. */
@supports (animation-timeline: view()) {
	@media (prefers-reduced-motion: no-preference) {
		.word__glyph {
			animation: brush linear both;
			animation-timeline: view();
			animation-range: entry calc(20% + var(--i) * 12%) entry calc(70% + var(--i) * 12%);
		}
	}
}
@keyframes brush {
	from {
		clip-path: inset(0 0 100% 0);
	}
	to {
		clip-path: inset(0 0 -10% 0);
	}
}

.end {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 0.75rem 2rem;
	padding-block: 2rem 2.5rem;
	border-top: 1px solid var(--rule);
}
.end [lang="ja"] {
	color: var(--fg);
}
</style>
