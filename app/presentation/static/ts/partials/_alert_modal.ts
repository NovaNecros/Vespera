// Vespera/app/presentation/static/ts/partials/_alert_modal.ts

import { AlertModalOptions, AlertType } from "../types.js";

(function() : void
{
    // --- VARIABLES ---
    const modalEl    : HTMLElement | null = document.getElementById("general-alert-modal");
    const titleEl    : HTMLElement | null = document.getElementById("general-alert-modal-label");
    const msgEl      : HTMLElement | null = document.getElementById("alert-modal-message");
    const iconWrpEl  : HTMLElement | null = document.getElementById("alert-modal-icon-wrapper");
    const iconEl     : HTMLElement | null = document.getElementById("alert-modal-icon");
    const closeBtn   : HTMLElement | null = document.getElementById("alert-modal-close-icon-btn");
    const dismissBtn : HTMLElement | null = document.getElementById("alert-modal-dismiss-btn");

    const defaultIconMap : Record<AlertType, string> = {
        danger  : "fa-triangle-exclamation",
        error   : "fa-circle-xmark",
        warning : "fa-skull-crossbones",
        success : "fa-circle-check",
        info    : "fa-ankh"
    };


    // --- FUNCTIONS ---
    function hideAlertModal() : void
    {
        if(!modalEl) return;
        modalEl.classList.add("hidden");
        modalEl.classList.remove("flex");
        document.body.classList.remove("overflow-hidden");
    }

    function showAlertModal(options : AlertModalOptions) : void
    {
        if(!modalEl)
        {
            alert(options.message);
            return;
        }

        const title   : string    = options.title   || "Vespera Grimoire";
        const message : string    = options.message || "";
        const type    : AlertType = options.type    || "danger";
        const isHtml  : boolean   = options.isHtml  !== undefined ? options.isHtml : true;
        const iconCls : string    = options.icon    || defaultIconMap[type]  || "fa-triangle-exclamation";

        if(titleEl) titleEl.textContent = title;

        if(msgEl)
        {
            if(isHtml) msgEl.innerHTML   = message;
            else       msgEl.textContent = message;
        }

        if(iconWrpEl) iconWrpEl.className = `alert-modal-icon-wrapper mb-4 mx-auto alert-type-${type}`;
        if(iconEl)    iconEl.className    = `fa-solid ${iconCls}`;

        modalEl.classList.remove("hidden");
        modalEl.classList.add("flex");
        document.body.classList.add("overflow-hidden");
    }


    // --- LISTENERS ---
    if(closeBtn)   closeBtn.addEventListener("click", hideAlertModal);
    if(dismissBtn) dismissBtn.addEventListener("click", hideAlertModal);

    if(modalEl) modalEl.addEventListener("click", (event : MouseEvent) =>
    {
        if(event.target === modalEl) hideAlertModal();
    });

    document.addEventListener("keydown", (event : KeyboardEvent) =>
    {
        if(event.key === "Escape" && modalEl && !modalEl.classList.contains("hidden"))
        {
            hideAlertModal();
        }
    });

    (window as any).showAlertModal = showAlertModal;
    (window as any).hideAlertModal = hideAlertModal;
})();