import { apiFetch, truncateHash, buildPaletteLut } from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("enigma22-main-container");
    if (!mainContainer)
        return;
    const questApiUrl = mainContainer.dataset.questApiUrl || "";
    const verifyApiUrl = mainContainer.dataset.verifyApiUrl || "";
    const hintStreamApiUrl = mainContainer.dataset.hintStreamApiUrl || "";
    const galleryApiUrl = mainContainer.dataset.galleryApiUrl || "";
    const thumbStreamApiUrl = mainContainer.dataset.thumbStreamApiUrl || "";
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
    const questStatusBadge = document.getElementById("quest-status-badge");
    const mirrorSpectrumBadge = document.getElementById("mirror-spectrum-badge");
    const mirror = new ScryingMirror();
    const targetPresetName = document.getElementById("target-preset-name");
    const targetFeedRate = document.getElementById("target-feed-rate");
    const targetKillRate = document.getElementById("target-kill-rate");
    const targetDuDv = document.getElementById("target-du-dv");
    const targetIterDt = document.getElementById("target-iter-dt");
    const targetHashDisplay = document.getElementById("target-hash-display");
    const artifactSelect = document.getElementById("altar-artifact-select");
    const selectedPreviewCont = document.getElementById("selected-artifact-preview");
    const previewThumbImg = document.getElementById("altar-preview-thumb");
    const previewNameLabel = document.getElementById("altar-preview-name");
    const previewHashLabel = document.getElementById("altar-preview-hash");
    const previewPresetBadge = document.getElementById("altar-preview-preset");
    const submitOfferingBtn = document.getElementById("submit-offering-btn");
    const victoryCard = document.getElementById("victory-sanctuary-card");
    const victorySecretKey = document.getElementById("victory-secret-key");
    const victorySolvedDate = document.getElementById("victory-solved-date");
    const victorySolvedArt = document.getElementById("victory-solved-artifact");
    function getDefaultState() {
        return {
            questData: null,
            paletteCatalog: [],
            vaultArtifacts: [],
            selectedArtifactId: null,
            isSolved: false
        };
    }
    const state = getDefaultState();
    function renderVictoryState(quest) {
        state.isSolved = true;
        if (questStatusBadge) {
            questStatusBadge.className = "vamp-badge vamp-badge-amethyst text-xs px-3 py-1";
            questStatusBadge.innerHTML = `
                <i class="fa-solid fa-gem mr-1.5 text-vespera-violetGlow"></i> 
                Resonance Achieved`;
        }
        if (victoryCard) {
            victoryCard.classList.remove("hidden");
            victoryCard.classList.add("flex");
        }
        if (victorySecretKey) {
            victorySecretKey.textContent = quest.solution_hash || quest.secret_key || "--";
        }
        if (victorySolvedDate && quest.solved_at) {
            victorySolvedDate.textContent = `Solved on ${new Date(quest.solved_at).toLocaleString()}`;
        }
        if (victorySolvedArt) {
            const alias = (quest.solution_artifact?.alias ||
                quest.artifact_alias ||
                `Artifact #${quest.id_artifact || quest.solution_id}`);
            victorySolvedArt.textContent = `Artifact: ${alias}`;
        }
        if (submitOfferingBtn) {
            submitOfferingBtn.disabled = true;
            submitOfferingBtn.innerHTML = `
                <i class="fa-solid fa-check-double mr-2"></i> 
                Enigma Solved`;
        }
    }
    function handleArtifactSelection(idArtifact) {
        state.selectedArtifactId = idArtifact;
        if (!idArtifact || idArtifact <= 0) {
            selectedPreviewCont?.classList.add("hidden");
            if (submitOfferingBtn)
                submitOfferingBtn.disabled = true;
            return;
        }
        const selectedItem = state.vaultArtifacts.find((a) => a.id_artifact === idArtifact);
        if (!selectedItem)
            return;
        if (previewThumbImg) {
            previewThumbImg.src = thumbStreamApiUrl.replace("/hash/PLACEHOLDER", `/hash/${selectedItem.artifact_hash}`);
        }
        if (previewNameLabel)
            previewNameLabel.textContent = selectedItem.alias;
        if (previewHashLabel)
            previewHashLabel.textContent = truncateHash(selectedItem.artifact_hash, 8);
        if (previewPresetBadge)
            previewPresetBadge.textContent = selectedItem.config?.display_name || "Custom Formula";
        selectedPreviewCont?.classList.remove("hidden");
        selectedPreviewCont?.classList.add("flex");
        if (submitOfferingBtn && !state.isSolved)
            submitOfferingBtn.disabled = false;
    }
    async function loadBratPalette() {
        const res = await apiFetch(palettesApiUrl);
        if (!res.success || !Array.isArray(res.data)) {
            return console.error(res.error || "Failed to load palette catalog");
        }
        state.paletteCatalog = res.data;
        const bratPal = state.paletteCatalog.find((p) => p.name === "brat");
        if (bratPal && bratPal.stops) {
            const bratLut = buildPaletteLut(bratPal.stops);
            mirror.setPaletteLut(bratLut);
            if (mirrorSpectrumBadge)
                mirrorSpectrumBadge.textContent = bratPal.display_name;
        }
    }
    async function loadQuestData() {
        const res = await apiFetch(questApiUrl);
        if (!res.success || !res.data) {
            return console.error(res.error || "Failed to load quest data");
        }
        state.questData = res.data;
        const quest = res.data;
        if (quest.hint_img_config) {
            const cfg = quest.hint_img_config;
            if (targetPresetName)
                targetPresetName.textContent = cfg.display_name || `Formula #${cfg.id_config}`;
            if (targetFeedRate)
                targetFeedRate.textContent = cfg.feed_rate.toFixed(4);
            if (targetKillRate)
                targetKillRate.textContent = cfg.kill_rate.toFixed(4);
            if (targetDuDv)
                targetDuDv.textContent = `${cfg.diff_u.toFixed(3)} • ${cfg.diff_v.toFixed(3)}`;
            if (targetIterDt)
                targetIterDt.textContent = `${cfg.iterations} • ${cfg.dt.toFixed(2)}`;
        }
        if (targetHashDisplay) {
            targetHashDisplay.textContent = quest.hint_img_hash;
            targetHashDisplay.title = quest.hint_img_hash;
        }
        if (quest.is_solved)
            renderVictoryState(quest);
    }
    async function loadVaultArtifacts() {
        if (!artifactSelect)
            return;
        const payload = {
            id_palette: null,
            id_config: null,
            id_source_image: null,
            favorites: false,
            search: "",
            sort_by: "date_created",
            sort_dir: "desc",
            page: 1,
            per_page: 10
        };
        const res = await apiFetch(galleryApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.success || !res.data || !Array.isArray(res.data.items)) {
            return console.error("Failed to load vault artifacts");
        }
        state.vaultArtifacts = res.data.items;
        const bufferHTML = [`<option value="">Choose an artifact to offer...</option>`];
        res.data.items.forEach((item) => {
            bufferHTML.push(`
            <option value="${item.id_artifact}">
                ${item.alias} (#${item.id_artifact}) • ${truncateHash(item.artifact_hash, 5)}
            </option>`);
        });
        artifactSelect.innerHTML = bufferHTML.join("");
    }
    async function submitOffering() {
        if (!state.selectedArtifactId || state.selectedArtifactId <= 0) {
            window.showAlertModal({
                title: "No Offering Provided",
                message: "You must first offer an Artifact to The Altar, love.",
                type: "danger"
            });
            return;
        }
        try {
            const apiUrl = verifyApiUrl.replace("/artifact/0", `/artifact/${state.selectedArtifactId}`);
            const res = await apiFetch(apiUrl, { method: "POST" });
            if (!res.success || !res.data) {
                window?.showAlertModal({
                    title: "Offering Failed",
                    message: "AN alchemical disruption has interrupted the offering.",
                    type: "danger"
                });
                return console.error(res.error || "Unknown error during offering");
            }
            if (res.data.is_solved) {
                renderVictoryState(res.data);
                window.showAlertModal?.({
                    title: "Resonance Achieved",
                    message: res.message || "The seal has shattered. Happy Birthday, my love.",
                    type: "info",
                    icon: "fa-gem",
                    cancelText: "Unlock The Secret",
                    onConfirm: () => { victoryCard?.scrollIntoView({ behavior: "smooth" }); },
                    onCancel: () => { victoryCard?.scrollIntoView({ behavior: "smooth" }); },
                });
            }
            else {
                window.showAlertModal?.({
                    title: "Harmnoic Dissonance",
                    message: res.message || "The offering does not resonate with the seal. Refine your reaction and try again, love.",
                    type: "warning"
                });
            }
        }
        catch (error) {
            window.showAlertModal?.({
                title: "Unforeseen Disruption",
                message: "An unexpected cataclysm has obstructed the offering.",
                type: "danger"
            });
            return console.error(error);
        }
    }
    function bindListeners() {
        artifactSelect?.addEventListener("change", () => {
            const selectedVal = parseInt(artifactSelect.value || "0");
            handleArtifactSelection(selectedVal);
        });
        submitOfferingBtn?.addEventListener("click", submitOffering);
    }
    async function initEnigma() {
        await Promise.all([
            loadBratPalette(),
            loadQuestData(),
            loadVaultArtifacts()
        ]);
        try {
            await mirror.loadFrames([hintStreamApiUrl], [15000]);
        }
        catch (error) {
            console.error("Could not preload The Enigma into The Scrying Mirror:", error);
        }
        bindListeners();
    }
    initEnigma().then();
});
