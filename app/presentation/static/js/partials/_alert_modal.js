(function () {
    const modalEl = document.getElementById("general-alert-modal");
    const titleEl = document.getElementById("general-alert-modal-label");
    const msgEl = document.getElementById("alert-modal-message");
    const iconWrpEl = document.getElementById("alert-modal-icon-wrapper");
    const iconEl = document.getElementById("alert-modal-icon");
    const closeBtn = document.getElementById("alert-modal-close-icon-btn");
    const dismissBtn = document.getElementById("alert-modal-dismiss-btn");
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
        modalEl.classList.add("hidden");
        modalEl.classList.remove("flex");
        document.body.classList.remove("overflow-hidden");
    }
    function showAlertModal(options) {
        if (!modalEl) {
            alert(options.message);
            return;
        }
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
        modalEl.classList.remove("hidden");
        modalEl.classList.add("flex");
        document.body.classList.add("overflow-hidden");
    }
    if (closeBtn)
        closeBtn.addEventListener("click", hideAlertModal);
    if (dismissBtn)
        dismissBtn.addEventListener("click", hideAlertModal);
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
