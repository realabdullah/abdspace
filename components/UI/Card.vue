<script lang="ts" setup></script>

<template>
	<div class="card__wrapper">
		<div class="position-relative z-1">
            <slot></slot>
        </div>
	</div>
</template>

<style lang="scss" scoped>
.card__wrapper {
	background-color: var(--main-color);
	box-shadow: var(--box-shadow);
	border-radius: 5px;
	position: relative;
	transition: box-shadow 0.25s;

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 5px;
		background-color: var(--card-bg);
	}

	&:hover {
		box-shadow: var(--box-shadow-hover);
	}
}
</style>
