import { apiFetch, buildPaletteLut } from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("enigma22-main-container");
    if (!mainContainer)
        return;
    const bratPaletteApiUrl = mainContainer.dataset.bratPaletteApiUrl || "";
    const artifactsApiUrl = mainContainer.dataset.artifactsApiUrl || "";
    const questApiUrl = mainContainer.dataset.questApiUrl || "";
    const verifyApiUrl = mainContainer.dataset.verifyApiUrl || "";
    const hintStreamApiUrl = mainContainer.dataset.hintStreamApiUrl || "";
    const thumbStreamApiUrl = mainContainer.dataset.thumbStreamApiUrl || "";
    const sourceStreamApiUrl = mainContainer.dataset.sourceStreamApiUrl || "";
    const questStatusBadge = document.getElementById("quest-status-badge");
    const leftHeaderIcon = document.getElementById("left-header-icon");
    const leftHeaderTitle = document.getElementById("left-header-title");
    const mirrorSpectrumBadge = document.getElementById("mirror-spectrum-badge");
    const mirrorContainer = document.getElementById("scrying-mirror-container");
    const mirror = new ScryingMirror();
    const victoryCatalystCont = document.getElementById("victory-catalyst-container");
    const victoryCatalystImg = document.getElementById("victory-catalyst-img");
    const victoryCatalystName = document.getElementById("victory-catalyst-name");
    const targetFormulaPanel = document.getElementById("target-formula-panel");
    const targetPresetName = document.getElementById("target-preset-name");
    const targetFeedRate = document.getElementById("target-feed-rate");
    const targetKillRate = document.getElementById("target-kill-rate");
    const targetDuDv = document.getElementById("target-du-dv");
    const targetIterDt = document.getElementById("target-iter-dt");
    const targetHashDisplay = document.getElementById("target-hash-display");
    const artifactSearchInput = document.getElementById("altar-artifact-search");
    const autocompleteList = document.getElementById("altar-autocomplete-list");
    const searchClearBtn = document.getElementById("clear-search-btn");
    const artifactSelect = document.getElementById("altar-artifact-select");
    const questBriefingCard = document.getElementById("quest-briefing-card");
    const offeringAltarCard = document.getElementById("offering-altar-card");
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
    let searchDebounceTimer = null;
    function getDefaultState() {
        return {
            questData: null,
            paletteCatalog: [],
            vaultArtifacts: [],
            filteredArtifacts: [],
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
        targetFormulaPanel?.classList.add("hidden");
        questBriefingCard?.classList.add("hidden");
        offeringAltarCard?.classList.add("hidden");
        mirrorContainer?.classList.add("hidden");
        mirrorSpectrumBadge?.classList.add("hidden");
        if (leftHeaderIcon)
            leftHeaderIcon.className = "fa-solid fa-image text-vespera-amethyst";
        if (leftHeaderTitle)
            leftHeaderTitle.textContent = "The Sacred Catalyst";
        const solvedArtifact = quest.solution_artifact;
        const catalystHash = solvedArtifact?.source_image?.sha256_hash;
        const catalystAlias = solvedArtifact?.source_image?.alias;
        if (catalystHash && victoryCatalystImg) {
            victoryCatalystImg.src = sourceStreamApiUrl.replace("/hash/PLACEHOLDER", `/hash/${catalystHash}`);
        }
        if (catalystAlias && victoryCatalystName) {
            victoryCatalystName.textContent = catalystAlias;
        }
        victoryCatalystCont?.classList.remove("hidden");
        victoryCatalystCont?.classList.add("flex");
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
    function renderAutocompleteList(items) {
        if (!autocompleteList)
            return;
        if (items.length === 0) {
            autocompleteList.innerHTML = `
                <div class="p-2.5 font-cinzel text-xs text-vespera-silver text-center">
                    No matching artifacts found
                </div>`;
            autocompleteList.classList.remove("hidden");
            autocompleteList.classList.add("flex");
            return;
        }
        const bufferHTML = [];
        items.slice(0, 8).forEach((item) => {
            bufferHTML.push(`
            <div class="autocomplete-option flex items-center justify-between gap-2"
                 data-artifact-id="${item.id_artifact}">
                <div class="flex flex-col truncate">
                    <span class="font-cinzel text-xs text-vespera-parchment font-bold truncate">
                        ${item.alias}
                    </span>
                    <span class="font-mono text-[0.65rem] text-vespera-silver truncate">
                        #${item.id_artifact} • ${item.artifact_hash}
                    </span>
                </div>
                <span class="vamp-badge vamp-badge-silver text-[0.55rem] px-1 py-0.5 shrink-0">
                    ${item.config?.display_name || "Custom"}
                </span>
            </div>`);
        });
        autocompleteList.innerHTML = bufferHTML.join("");
        autocompleteList.classList.remove("hidden");
        autocompleteList.classList.add("flex");
        autocompleteList.querySelectorAll(".autocomplete-option").forEach((optEl) => {
            optEl.addEventListener("click", () => {
                const idArt = parseInt(optEl.dataset.artifactId || "0");
                handleArtifactSelection(idArt);
                if (artifactSelect)
                    artifactSelect.value = idArt.toString();
                autocompleteList.classList.add("hidden");
                autocompleteList.classList.remove("flex");
            });
        });
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
            previewHashLabel.textContent = selectedItem.artifact_hash;
        if (previewPresetBadge)
            previewPresetBadge.textContent = selectedItem.config?.display_name || "Custom Formula";
        selectedPreviewCont?.classList.remove("hidden");
        selectedPreviewCont?.classList.add("flex");
        if (submitOfferingBtn && !state.isSolved)
            submitOfferingBtn.disabled = false;
    }
    async function loadBratPalette() {
        const res = await apiFetch(bratPaletteApiUrl);
        if (!res.success || !res.data) {
            return console.error(res.error || "Failed to load Brat palette");
        }
        const bratPal = res.data;
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
    async function loadArtifacts() {
        if (!artifactSelect)
            return;
        const payload = { search: "", limit: 10 };
        const res = await apiFetch(artifactsApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.success || !res.data || !Array.isArray(res.data)) {
            return console.error("Failed to load unique artifacts");
        }
        state.vaultArtifacts = res.data;
        const bufferHTML = [`<option value="">Choose an artifact to offer...</option>`];
        res.data.forEach((item) => {
            bufferHTML.push(`
            <option value="${item.id_artifact}">
                ${item.alias} (#${item.id_artifact}) • ${item.artifact_hash}
            </option>`);
        });
        artifactSelect.innerHTML = bufferHTML.join("");
    }
    async function searchArtifacts(q) {
        if (searchDebounceTimer)
            clearTimeout(searchDebounceTimer);
        searchDebounceTimer = window.setTimeout(async () => {
            const payload = { search: q, limit: 8 };
            const res = await apiFetch(artifactsApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.success && Array.isArray(res.data))
                renderAutocompleteList(res.data);
        }, 200);
    }
    async function submitOffering() {
        if (!state.selectedArtifactId || state.selectedArtifactId <= 0) {
            window.showAlertModal?.({
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
                window.showAlertModal?.({
                    title: "Offering Failed",
                    message: "An alchemical disruption has interrupted the offering.",
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
                    title: "Harmonic Dissonance",
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
        artifactSearchInput?.addEventListener("input", () => {
            const q = artifactSearchInput?.value.trim().toLowerCase() || "";
            if (!q) {
                if (searchClearBtn) {
                    searchClearBtn.classList.add("hidden");
                    searchClearBtn.disabled = true;
                }
                autocompleteList?.classList.add("hidden");
                autocompleteList?.classList.remove("flex");
                return;
            }
            if (searchClearBtn) {
                searchClearBtn.classList.remove("hidden");
                searchClearBtn.disabled = false;
            }
            searchArtifacts(q).then();
        });
        searchClearBtn?.addEventListener("click", () => {
            if (artifactSearchInput)
                artifactSearchInput.value = "";
            searchClearBtn.classList.add("hidden");
            searchClearBtn.disabled = true;
            handleArtifactSelection(0);
        });
        document.addEventListener("click", (event) => {
            if (!autocompleteList)
                return;
            const target = event.target;
            if (!target.closest("#altar-artifact-search") && !target.closest("#altar-autocomplete-list")) {
                autocompleteList.classList.add("hidden");
                autocompleteList.classList.remove("flex");
            }
        });
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
            loadArtifacts()
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
