// Vespera/app/presentation/static/ts/partials/_navbar.ts

(function() : void
{
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