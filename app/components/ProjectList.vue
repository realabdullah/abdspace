<script setup lang="ts">
interface Project {
	title: string;
	about: string;
	link: string;
	date: string;
}

defineProps<{ projects: Project[] }>();
</script>

<template>
	<div class="index">
		<ul>
			<li v-for="project in projects" :key="project.title">
				<a :href="project.link" target="_blank" rel="noopener noreferrer" class="row">
					<span class="row__title">{{ project.title }}</span>
					<span class="row__about">{{ project.about }}</span>
					<span class="row__meta mono">{{ hostOf(project.link) }}<span class="row__arrow" aria-hidden="true"> ↗</span></span>
				</a>
			</li>
		</ul>
	</div>
</template>

<style scoped>
.row {
	display: grid;
	gap: 0.15rem;
	padding-block: 0.875rem;
	border-bottom: 1px solid var(--rule);
	transition: opacity 350ms ease;
}
li:first-child .row {
	border-top: 1px solid var(--rule);
}
.row__title {
	font-size: 1.375rem;
	line-height: 1.25;
	letter-spacing: -0.01em;
}
.row__about {
	color: var(--muted);
	font-size: 1rem;
	line-height: 1.45;
	text-wrap: pretty;
}
.row__meta {
	color: var(--muted);
	margin-top: 0.25rem;
}
.row__arrow {
	display: inline-block;
	opacity: 0;
	transform: translate(-3px, 3px);
	transition:
		opacity 300ms ease,
		transform 300ms var(--ease-out);
}

/* Hovering a row lets the rest of the list recede. */
@media (hover: hover) {
	.index:has(.row:hover) .row:not(:hover) {
		opacity: 0.32;
	}
	.row:hover .row__title {
		font-style: italic;
	}
	.row:hover .row__arrow {
		opacity: 1;
		transform: none;
	}
}

@media (min-width: 52rem) {
	.row {
		grid-template-columns: 12rem minmax(0, 1fr) 13rem;
		gap: 1.5rem;
		align-items: baseline;
	}
	.row__meta {
		margin-top: 0;
		text-align: right;
	}
}
</style>
