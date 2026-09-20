(function () {
    const modalEl = document.getElementById("general-alert-modal");
    const titleEl = document.getElementById("general-alert-modal-label");
    const msgEl = document.getElementById("alert-modal-message");
    const iconWrpEl = document.getElementById("alert-modal-icon-wrapper");
    const iconEl = document.getElementById("alert-modal-icon");
    const inputContEl = document.getElementById("alert-modal-input-container");
    const inputLabelEl = document.getElementById("alert-modal-input-label");
    const inputEl = document.getElementById("alert-modal-input");
    const closeBtn = document.getElementById("alert-modal-close-icon-btn");
    const dismissBtn = document.getElementById("alert-modal-dismiss-btn");
    const confirmBtn = document.getElementById("alert-modal-confirm-btn");
    let activeOnConfirm = null;
    let activeOnCancel = null;
    const defaultIconMap = {
        danger: "fa-triangle-exclamation",
        error: "fa-circle-xmark",
        warning: "fa-skull-crossbones",
        success: "fa-circle-check",
        info: "fa-ankh"
    };
    function hideAlertModal() {
        if (!modalEl)
            return;
        window.closeModalWithTransition(modalEl, () => {
            if (activeOnCancel) {
                activeOnCancel();
                activeOnCancel = null;
            }
            activeOnConfirm = null;
        });
    }
    function handleConfirm() {
        const val = inputEl ? inputEl.value.trim() : "";
        if (activeOnConfirm) {
            const callback = activeOnConfirm;
            activeOnConfirm = null;
            activeOnCancel = null;
            hideAlertModal();
            callback(val);
        }
        else {
            hideAlertModal();
        }
    }
    function showAlertModal(options) {
        if (!modalEl) {
            alert(options.message);
            return;
        }
        activeOnConfirm = options.onConfirm || null;
        activeOnCancel = options.onCancel || null;
        const title = options.title || "Vespera Grimoire";
        const message = options.message || "";
        const type = options.type || "danger";
        const isHtml = options.isHtml !== undefined ? options.isHtml : true;
        const iconCls = options.icon || defaultIconMap[type] || "fa-triangle-exclamation";
        if (titleEl)
            titleEl.textContent = title;
        if (msgEl) {
            if (isHtml)
                msgEl.innerHTML = message;
            else
                msgEl.textContent = message;
        }
        if (iconWrpEl)
            iconWrpEl.className = `alert-modal-icon-wrapper mb-4 mx-auto alert-type-${type}`;
        if (iconEl)
            iconEl.className = `fa-solid ${iconCls}`;
        if (options.showInput) {
            if (inputContEl) {
                inputContEl.classList.remove("hidden");
                inputContEl.classList.add("flex");
            }
            if (inputLabelEl && options.inputLabel)
                inputLabelEl.textContent = options.inputLabel;
            if (inputEl) {
                inputEl.value = options.inputValue || "";
                inputEl.placeholder = options.inputPlaceholder || "Enter text here...";
            }
        }
        else {
            if (inputContEl) {
                inputContEl.classList.add("hidden");
                inputContEl.classList.remove("flex");
            }
            if (confirmBtn)
                confirmBtn.classList.add("hidden");
        }
        if (dismissBtn)
            dismissBtn.textContent = options.cancelText || "Dismiss";
        if (confirmBtn) {
            if (options.onConfirm) {
                confirmBtn.classList.remove("hidden");
                if (options.confirmText) {
                    confirmBtn.innerHTML = `
                        <i class="fa-solid fa-feather mr-1.5"></i>
                        ${options.confirmText}
                    `;
                }
            }
            else {
                confirmBtn.classList.add("hidden");
            }
        }
        window.openModalWithTransition(modalEl);
        if (options.showInput && inputEl)
            setTimeout(() => inputEl.focus(), 80);
    }
    if (closeBtn)
        closeBtn.addEventListener("click", hideAlertModal);
    if (dismissBtn)
        dismissBtn.addEventListener("click", hideAlertModal);
    if (confirmBtn)
        confirmBtn.addEventListener("click", handleConfirm);
    if (inputEl)
        inputEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handleConfirm();
            }
        });
    if (modalEl)
        modalEl.addEventListener("click", (event) => {
            if (event.target === modalEl)
                hideAlertModal();
        });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modalEl && !modalEl.classList.contains("hidden")) {
            hideAlertModal();
        }
    });
    window.showAlertModal = showAlertModal;
    window.hideAlertModal = hideAlertModal;
})();
export {};
