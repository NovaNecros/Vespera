// Vespera/app/presentation/static/ts/partials/_navbar.ts

(function() : void
{
    // --- VARIABLES ---
    const toggleSmokeBtn   : HTMLButtonElement | null = document.getElementById("toggle-smoke-btn")   as HTMLButtonElement;
    const toggleSmokeIcon  : HTMLElement       | null = document.getElementById("toggle-smoke-icon")  as HTMLElement;

    // --- FUNCTIONS ---
    function updateSmokeBtnIcon(isPaused : boolean) : void
    {
        if(!toggleSmokeBtn || !toggleSmokeIcon) return;
        if(isPaused) toggleSmokeIcon.className    = "fa-solid fa-play-circle text-vespera-silver";
        else toggleSmokeIcon.className            = "fa-solid fa-pause-circle text-vespera-silver";
    }
    const initiallyPaused : boolean = localStorage.getItem("vespera_smoke_paused") === "true";
    updateSmokeBtnIcon(initiallyPaused);

    // --- LISTENERS ---
    toggleSmokeBtn?.addEventListener("click", (event : MouseEvent) : void =>
    {
        // Easter Egg
        if(event.shiftKey)
        {
            event.preventDefault();
            event.stopPropagation();
            window.location.href = "/empty";
            return;
        }

        if(typeof (window as any).vesperaToggleSmoke === "function")
        {
            const isNowPassed : boolean = (window as any).vesperaToggleSmoke();
            updateSmokeBtnIcon(isNowPassed);
        }
    });

    // --- INITIALIZATION ---
    function initNavbar() : void
    {
        const currentPath : string = window.location.pathname;
        const tabs : NodeListOf<HTMLAnchorElement> = document.querySelectorAll(".module-tab");

        tabs.forEach((tab : HTMLAnchorElement) =>
        {
            const target : string | undefined = tab.dataset.target;
            if(!target) return;

            tab.addEventListener("click", () =>
            {
                tabs.forEach((t : HTMLAnchorElement) => t.classList.remove("active"));
                tab.classList.add("active");
                localStorage.setItem("vespera_active_tab", target);
            });

            if(target === "studio" && currentPath.startsWith("/studio"))
            {
                tab.classList.add("active");
            }
            else if(target === "vault" && currentPath.startsWith("/vault"))
            {
                tab.classList.add("active");
            }
            else if(target == "compendium" && currentPath.startsWith("/compendium"))
            {
                tab.classList.add("active");
            }
            else if(target === "enigma" && currentPath.startsWith("/enigma/22"))
            {
                tab.classList.add("active");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initNavbar);
})();