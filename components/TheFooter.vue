<script lang="ts" setup>
const currentYear = new Date().getFullYear();

const socials = [
    { name: "LinkedIn", link: "https://www.linkedin.com/in/abd/" },
    { name: "GitHub", link: "https://github.com/realabdullah/" },
    { name: "𝕏", link: "https://x.com/_realabd" },
]
</script>

<template>
    <footer class="footer flex flex-col">
        <div class="footer__contact flex items-start justify-between">
            <h2 class="footer__contact-text text-dark font-normal text-4xl leading-[-0.8px] sm:text-text-5xl sm:leading-[-1px]">I am eager to discuss your next project with you.
                <IconsUtility icon="arrow-right" />
            </h2>

            <div class="footer__contact-ctas flex flex-col items-start">
                <a href="mailto:abdulodesanmi@gmail.com"
                    class="footer__contact-ctas--item text-dark text-4xl leading-[-0.8px] sm:text-text-5xl sm:leading-[-1px] font-normal no-underline break-all">abdulodesanmi@gmail.com</a>
                <a href="https://docs.google.com/document/d/1kRlBn5TDxDaHplEORpbV0NLQw75PNbdHh9GMb3xS62Y/edit?usp=sharing" target="_blank"
                    class="footer__contact-ctas--item text-dark text-2xl sm:text-text-3xl font-normal no-underline">View
                    Resume</a>
            </div>
        </div>

        <div class="footer__socials flex items-center justify-between md:flex-col md:items-start">
            <span class="footer__socials-author text-secondary font-medium text-2xl leading-[-0.5px] sm:text-text-4xl sm:leading-[-0.6px]">Abdullahi Odesanmi ⏤
                {{ currentYear }}</span>

            <div class="footer__socials-links flex items-center">
                <a v-for="social in socials" :key="social.name" :href="social.link" target="_blank"
                    class="text-dark font-medium text-2xl leading-[-0.5px] sm:text-text-4xl sm:leading-[-0.6px] no-underline relative hover:link">{{ social.name }}</a>
            </div>
        </div>
    </footer>
</template>

<style lang="scss" scoped>
.footer {
    padding: 0 3rem 7rem;
    max-width: 120rem;
    margin: 0 auto;

    &__contact {
        padding-top: 7rem;
        border-top: 2px solid var(--text-color);
        gap: 2rem;
        margin-bottom: 17rem;

        @media screen and (max-width: 900px) {
            flex-direction: column;
            align-items: flex-start;
            padding-top: 5rem;
            margin-bottom: 10rem;
        }

        &-text {
            max-width: 34.7rem;

            svg {
                margin-left: 2rem;

                @media screen and (max-width: 900px) {
                    display: none;
                }
            }
        }

        &-ctas {
            gap: 2.7rem;

            @media screen and (max-width: 900px) {
                text-align: left;
            }
        }
    }

    &__socials {
        gap: 2rem;

        &-links {
            gap: 3rem;
        }
    }
}
</style>
