<script lang="ts" setup>
defineProps<{
    icon: "arrow-right" | "arrow-down";
}>();
</script>

<template>
    <svg v-if="icon === 'arrow-right'" width="24" height="21" viewBox="0 0 24 21" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
            d="M-5.24032e-07 9.01154L-3.92898e-07 12.0115L18.3146 12.0115L11.3126 18.9462L13.4097 21L24 10.5115L13.4097 1.32119e-06L11.3126 2.1L18.3146 9.01154L-5.24032e-07 9.01154Z"
            fill="currentColor" />
    </svg>

    <svg v-else-if="icon === 'arrow-down'" width="34" height="39" viewBox="0 0 34 39" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
            d="M19.2187 0.181824H14.4176V29.2102L3.31959 18.1122L0.0326538 21.4361L16.8182 38.2216L33.6406 21.4361L30.2798 18.1122L19.2187 29.2102V0.181824Z"
            fill="currentColor" />
    </svg>
</template>
