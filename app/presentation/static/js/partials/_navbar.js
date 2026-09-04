"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
(function () {
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
            else if (target === "cript" && currentPath.startsWith("/vault/cript")) {
                tab.classList.add("active");
            }
            else if (target === "vault" && (currentPath === "/vault" || currentPath.startsWith("/vault/"))) {
                tab.classList.add("active");
            }
        });
    }
    document.addEventListener("DOMContentLoaded", initNavbar);
})();
