/* INDEX.JS*/

document.addEventListener("DOMContentLoaded", () => {

    /* Referencias principales del index */

    const indexPage = document.querySelector(".index-page");
    const logoCard = document.querySelector(".logo-card");
    const loginButton = document.querySelector(".btn-primary");
    const activityCards = document.querySelectorAll(".activity-card");

    /* Validacion defensiva */
    if (!indexPage || !logoCard) {
        return;
    }


    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";


    const canUseMouseEffects = () => {
        return window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
    };

    let animationFrameId = null;

    const handleMouseMove = (event) => {

        if (!canUseMouseEffects()) {
            return;
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {

            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const mouseX = event.clientX - windowWidth / 2;
            const mouseY = event.clientY - windowHeight / 2;

            const moveX = mouseX / windowWidth;
            const moveY = mouseY / windowHeight;

            logoCard.style.transform = `
                translate(${moveX * 16}px, ${moveY * 16}px)
                rotate(${moveX * 4 - 3}deg)
            `;
        });
    };


    const resetLogoEffect = () => {

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        logoCard.style.transform = "";
    };


    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", resetLogoEffect);


    if (loginButton) {
        loginButton.addEventListener("click", () => {
            loginButton.classList.add("btn-loading");
        });
    }

    activityCards.forEach((card) => {

        card.addEventListener("click", () => {

            activityCards.forEach((item) => {
                item.classList.remove("activity-card-active");
            });

            card.classList.add("activity-card-active");
        });
    });

    window.addEventListener("resize", () => {
        resetLogoEffect();
    });
});