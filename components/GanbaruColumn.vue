<template>
	<figure class="ganbaru">
		<p class="ganbaru__kanji" lang="ja" aria-label="頑張る">
			<span aria-hidden="true" style="--i: 0">頑</span><span aria-hidden="true" style="--i: 1">張</span><span aria-hidden="true" style="--i: 2">る</span>
		</p>
		<figcaption class="ganbaru__gloss mono"><i>ganbaru</i>: to hold on, and do your best</figcaption>
	</figure>
</template>

<style scoped>
/* Written top to bottom, the way it would be by hand. */
.ganbaru {
	writing-mode: vertical-rl;
	display: flex;
	/* In vertical-rl the block axis runs right to left, so this sets the gloss beside the kanji. */
	flex-direction: column;
	align-items: flex-start;
	gap: 0.5rem;
	margin: 0;
}
.ganbaru__kanji {
	font-family: var(--jp);
	font-weight: 800;
	font-size: clamp(3.25rem, 9.5vw, 8rem);
	line-height: 1;
	letter-spacing: 0.06em;
}
.ganbaru__kanji span {
	display: inline-block;
	animation: brush 900ms cubic-bezier(0.55, 0, 0.2, 1) both;
	animation-delay: calc(350ms + var(--i) * 420ms);
}
.ganbaru__gloss {
	color: var(--muted);
	white-space: nowrap;
	padding-top: 0.35em;
	animation: fade 1200ms ease both 1.7s;
}
@keyframes brush {
	from {
		clip-path: inset(0 0 100% 0);
		transform: translateY(-0.04em);
	}
	to {
		clip-path: inset(0 0 -10% 0);
		transform: none;
	}
}
@keyframes fade {
	from {
		opacity: 0;
	}
}
</style>
