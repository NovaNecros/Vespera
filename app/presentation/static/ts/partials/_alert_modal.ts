// Vespera/app/presentation/static/ts/partials/_alert_modal.ts

import { AlertModalOptions, AlertType } from "../types.js";

(function() : void
{
    // --- VARIABLES ---
    // GENERAL
    const modalEl      : HTMLElement        | null = document.getElementById("general-alert-modal");
    const titleEl      : HTMLElement        | null = document.getElementById("general-alert-modal-label");
    const msgEl        : HTMLElement        | null = document.getElementById("alert-modal-message");
    const iconWrpEl    : HTMLElement        | null = document.getElementById("alert-modal-icon-wrapper");
    const iconEl       : HTMLElement        | null = document.getElementById("alert-modal-icon");

    // INPUTS
    const inputContEl  : HTMLElement        | null = document.getElementById("alert-modal-input-container");
    const inputLabelEl : HTMLElement        | null = document.getElementById("alert-modal-input-label");
    const inputEl      : HTMLInputElement   | null = document.getElementById("alert-modal-input") as HTMLInputElement;

    // BUTTONS
    const closeBtn     : HTMLElement        | null = document.getElementById("alert-modal-close-icon-btn");
    const dismissBtn   : HTMLButtonElement  | null = document.getElementById("alert-modal-dismiss-btn") as HTMLButtonElement;
    const confirmBtn   : HTMLButtonElement  | null = document.getElementById("alert-modal-confirm-btn") as HTMLButtonElement;

    // EXTERNAL FUNCTIONS
    let activeOnConfirm : ((val : string) => void) | null = null;
    let activeOnCancel  : (()             => void) | null = null;

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

        (window as any).closeModalWithTransition(modalEl, () : void =>
        {
            if(activeOnCancel)
            {
                activeOnCancel();
                activeOnCancel = null;
            }
            activeOnConfirm = null;
        });
    }

    function handleConfirm() : void
    {
        const val : string = inputEl ? inputEl.value.trim() : "";
        if(activeOnConfirm)
        {
            const callback  = activeOnConfirm;
            activeOnConfirm = null;
            activeOnCancel  = null;
            hideAlertModal();
            callback(val);
        }
        else
        {
            hideAlertModal();
        }
    }

    function showAlertModal(options : AlertModalOptions) : void
    {
        if(!modalEl)
        {
            alert(options.message);
            return;
        }

        activeOnConfirm = options.onConfirm || null;
        activeOnCancel  = options.onCancel  || null;

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

        if(options.showInput)
        {
            if(inputContEl)
            {
                inputContEl.classList.remove("hidden");
                inputContEl.classList.add("flex");
            }
            if(inputLabelEl && options.inputLabel) inputLabelEl.textContent = options.inputLabel;
            if(inputEl)
            {
                inputEl.value       = options.inputValue       || "";
                inputEl.placeholder = options.inputPlaceholder || "Enter text here...";
            }
            if(confirmBtn)
            {
                confirmBtn.classList.remove("hidden");
                if(options.confirmText)
                {
                    confirmBtn.innerHTML = `
                        <i class="fa-solid fa-feather mr-1.5"></i>
                        ${options.confirmText}
                    `;
                }
            }
        }
        else
        {
            if(inputContEl)
            {
                inputContEl.classList.add("hidden");
                inputContEl.classList.remove("flex");
            }
            if(confirmBtn) confirmBtn.classList.add("hidden");
        }

        if(dismissBtn) dismissBtn.textContent = options.cancelText || "Dismiss";

        (window as any).openModalWithTransition(modalEl);

        if(options.showInput && inputEl) setTimeout(() => inputEl.focus(), 80);
    }


    // --- LISTENERS ---
    if(closeBtn)   closeBtn.addEventListener("click",   hideAlertModal);
    if(dismissBtn) dismissBtn.addEventListener("click", hideAlertModal);
    if(confirmBtn) confirmBtn.addEventListener("click",  handleConfirm);

    if(inputEl) inputEl.addEventListener("keydown", (event : KeyboardEvent) =>
    {
        if(event.key === "Enter")
        {
            event.preventDefault();
            handleConfirm();
        }
    });

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