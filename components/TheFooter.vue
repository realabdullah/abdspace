<script lang="ts" setup>
const currentYear = new Date().getFullYear();

const socials = [
    { name: "LinkedIn", link: "https://www.linkedin.com/in/abd/" },
    { name: "GitHub", link: "https://github.com/realabdullah/" },
    { name: "𝕏", link: "https://x.com/_realabd" },
]
</script>

<template>
    <footer class="footer d-flex flex-column">
        <div class="footer__contact d-flex items-start content-between">
            <h2 class="footer__contact-text col-text weight-400 text-two">I am eager to discuss your next project with you.
                <IconsUtility icon="arrow-right" />
            </h2>

            <div class="footer__contact-ctas d-flex flex-column items-start">
                <a href="mailto:abdulodesanmi@gmail.com"
                    class="footer__contact-ctas--item col-text text-two weight-400 text-none break-all">abdulodesanmi@gmail.com</a>
                <a href="https://drive.google.com/file/d/1cYdJI5CHq2lERoxPZL3r26ErQssM3itL/view?usp=sharing" target="_blank"
                    class="footer__contact-ctas--item col-text text-four weight-400 text-none">View
                    Resume</a>
            </div>
        </div>

        <div class="footer__socials d-flex items-center content-between md:flex-column md:items-start">
            <span class="footer__socials-author col-secondary weight-500 text-three">Abdullahi Odesanmi ⏤
                {{ currentYear }}</span>

            <div class="footer__socials-links d-flex items-center">
                <a v-for="social in socials" :key="social.name" :href="social.link" target="_blank"
                    class="col-text weight-500 text-three text-none position-relative hover:link">{{ social.name }}</a>
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
