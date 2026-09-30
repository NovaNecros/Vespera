"use strict";
(function () {
    const toggleSmokeBtn = document.getElementById("toggle-smoke-btn");
    const toggleSmokeIcon = document.getElementById("toggle-smoke-icon");
    function updateSmokeBtnIcon(isPaused) {
        if (!toggleSmokeBtn || !toggleSmokeIcon)
            return;
        if (isPaused)
            toggleSmokeIcon.className = "fa-solid fa-play-circle text-vespera-silver";
        else
            toggleSmokeIcon.className = "fa-solid fa-pause-circle text-vespera-silver";
    }
    const initiallyPaused = localStorage.getItem("vespera_smoke_paused") === "true";
    updateSmokeBtnIcon(initiallyPaused);
    toggleSmokeBtn?.addEventListener("click", (event) => {
        if (event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            window.location.href = "/empty";
            return;
        }
        if (typeof window.vesperaToggleSmoke === "function") {
            const isNowPassed = window.vesperaToggleSmoke();
            updateSmokeBtnIcon(isNowPassed);
        }
    });
    function initNavbar() {
        const currentPath = window.location.pathname;
        const tabs = document.querySelectorAll(".module-tab");
        tabs.forEach((tab) => {
            const target = tab.dataset.target;
            if (!target)
                return;
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                localStorage.setItem("vespera_active_tab", target);
            });
            if (target === "studio" && currentPath.startsWith("/studio")) {
                tab.classList.add("active");
            }
            else if (target === "vault" && currentPath.startsWith("/vault")) {
                tab.classList.add("active");
            }
            else if (target == "compendium" && currentPath.startsWith("/compendium")) {
                tab.classList.add("active");
            }
            else if (target === "enigma" && currentPath.startsWith("/enigma/22")) {
                tab.classList.add("active");
            }
        });
    }
    document.addEventListener("DOMContentLoaded", initNavbar);
})();
