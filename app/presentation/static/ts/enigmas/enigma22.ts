// Vespera/app/presentation/static/ts/enigmas/enigma22.ts

import
{
    APIResponse,
    ArtifactSearchPayload, SynthesisArtifact,
    ColorPalette,          ConfigTuring,
    EnigmaQuestData,       EnigmaVerifyData
} from "../types.js";
import { apiFetch, buildPaletteLut, truncateHash } from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";

interface EnigmaState
{
    questData          : EnigmaQuestData | null;
    paletteCatalog     : ColorPalette[];
    vaultArtifacts     : SynthesisArtifact[];
    filteredArtifacts  : SynthesisArtifact[];
    selectedArtifactId : number          | null;
    isSolved           : boolean;
}

document.addEventListener("DOMContentLoaded", () : void =>
{
    // --- VARIABLES ---
    const mainContainer     : HTMLElement       | null   = document.getElementById("enigma22-main-container");
    if(!mainContainer) return;

    // API URLs
    const bratPaletteApiUrl   : string                   = mainContainer.dataset.bratPaletteApiUrl  || "";
    const artifactsApiUrl     : string                   = mainContainer.dataset.artifactsApiUrl    || "";
    const questApiUrl         : string                   = mainContainer.dataset.questApiUrl        || "";
    const verifyApiUrl        : string                   = mainContainer.dataset.verifyApiUrl       || "";
    const hintStreamApiUrl    : string                   = mainContainer.dataset.hintStreamApiUrl   || "";
    const thumbStreamApiUrl   : string                   = mainContainer.dataset.thumbStreamApiUrl  || "";
    const sourceStreamApiUrl  : string                   = mainContainer.dataset.sourceStreamApiUrl || "";

    // Status & Mirror
    const questStatusBadge    : HTMLElement       | null = document.getElementById("quest-status-badge");
    const leftHeaderIcon      : HTMLElement       | null = document.getElementById("left-header-icon");
    const leftHeaderTitle     : HTMLElement       | null = document.getElementById("left-header-title");
    const mirrorSpectrumBadge : HTMLElement       | null = document.getElementById("mirror-spectrum-badge");
    const mirrorContainer     : HTMLElement       | null = document.getElementById("scrying-mirror-container");
    const mirror              : ScryingMirror            = new ScryingMirror();

    // Victory Image
    const victoryCatalystCont : HTMLElement       | null = document.getElementById("victory-catalyst-container");
    const victoryCatalystImg  : HTMLImageElement  | null = document.getElementById("victory-catalyst-img")  as HTMLImageElement;
    const victoryCatalystName : HTMLElement       | null = document.getElementById("victory-catalyst-name");

    // Target Formula
    const targetFormulaPanel : HTMLElement       | null = document.getElementById("target-formula-panel");
    const targetPresetName   : HTMLElement       | null = document.getElementById("target-preset-name");
    const targetFeedRate     : HTMLElement       | null = document.getElementById("target-feed-rate");
    const targetKillRate     : HTMLElement       | null = document.getElementById("target-kill-rate");
    const targetDuDv         : HTMLElement       | null = document.getElementById("target-du-dv");
    const targetIterDt       : HTMLElement       | null = document.getElementById("target-iter-dt");
    const targetHashDisplay  : HTMLElement       | null = document.getElementById("target-hash-display");

    // Search & Select
    const artifactSearchInput : HTMLInputElement  | null = document.getElementById("altar-artifact-search") as HTMLInputElement;
    const autocompleteList    : HTMLElement       | null = document.getElementById("altar-autocomplete-list");
    const searchClearBtn      : HTMLButtonElement | null = document.getElementById("clear-search-btn")      as HTMLButtonElement;
    const artifactSelect      : HTMLSelectElement | null = document.getElementById("altar-artifact-select") as HTMLSelectElement;

    // Altar
    const questBriefingCard   : HTMLElement       | null = document.getElementById("quest-briefing-card");
    const offeringAltarCard   : HTMLElement       | null = document.getElementById("offering-altar-card");
    const selectedPreviewCont : HTMLElement       | null = document.getElementById("selected-artifact-preview");
    const previewThumbImg     : HTMLImageElement  | null = document.getElementById("altar-preview-thumb")   as HTMLImageElement;
    const previewNameLabel    : HTMLElement       | null = document.getElementById("altar-preview-name");
    const previewHashLabel    : HTMLElement       | null = document.getElementById("altar-preview-hash");
    const previewPresetBadge  : HTMLElement       | null = document.getElementById("altar-preview-preset");
    const submitOfferingBtn   : HTMLButtonElement | null = document.getElementById("submit-offering-btn")   as HTMLButtonElement;

    // Victory Sanctuary
    const victoryCard         : HTMLElement       | null = document.getElementById("victory-sanctuary-card");
    const victorySecretKey    : HTMLElement       | null = document.getElementById("victory-secret-key");
    const victorySolvedDate   : HTMLElement       | null = document.getElementById("victory-solved-date");
    const victorySolvedArt    : HTMLElement       | null = document.getElementById("victory-solved-artifact");
    const copySecretRuneBtn   : HTMLButtonElement | null = document.getElementById("copy-secret-rune-btn")   as HTMLButtonElement;
    const copyRuneIcon        : HTMLElement       | null = document.getElementById("copy-rune-icon")         as HTMLElement;

    let searchDebounceTimer   : number            | null = null;
    let copyResetTimer        : number            | null = null;

    // --- FUNCTIONS ---
    // State
    function getDefaultState() : EnigmaState
    {
        return {
            questData          : null,
            paletteCatalog     : [],
            vaultArtifacts     : [],
            filteredArtifacts  : [],
            selectedArtifactId : null,
            isSolved           : false
        };
    }
    const state : EnigmaState = getDefaultState();

    function renderVictoryState(quest : EnigmaQuestData | EnigmaVerifyData) : void
    {
        state.isSolved = true;

        if(questStatusBadge)
        {
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

        if(leftHeaderIcon) leftHeaderIcon.className     = "fa-solid fa-image text-vespera-parchment";
        if(leftHeaderTitle) leftHeaderTitle.textContent = "The Sacred Catalyst";

        const solvedArtifact : SynthesisArtifact | undefined = (quest as any).solution_artifact;
        const catalystHash   : string            | undefined = solvedArtifact?.source_image?.sha256_hash;
        const catalystAlias  : string            | undefined = solvedArtifact?.source_image?.alias;

        if(catalystHash && victoryCatalystImg)
        {
            victoryCatalystImg.src = sourceStreamApiUrl.replace(
                "/hash/PLACEHOLDER", `/hash/${catalystHash}`);
        }
        if(catalystAlias && victoryCatalystName)
        {
            victoryCatalystName.textContent = catalystAlias;
        }

        victoryCatalystCont?.classList.remove("hidden");
        victoryCatalystCont?.classList.add("flex");

        if(victoryCard)
        {
            victoryCard.classList.remove("hidden");
            victoryCard.classList.add("flex");
        }

        if(victorySecretKey)
        {
            victorySecretKey.textContent = (quest as any).solution_hash || (quest as any).secret_key || "--";
        }

        if(victorySolvedDate && quest.solved_at)
        {
            victorySolvedDate.textContent = `Solved on ${new Date(quest.solved_at).toLocaleString()}`;
        }

        if(victorySolvedArt)
        {
            const alias : string = (
                (quest as any).solution_artifact?.alias ||
                (quest as any).artifact_alias           ||
                `Artifact #${(quest as any).id_artifact || (quest as any).solution_id}`
            );
            victorySolvedArt.textContent = `Artifact: ${alias}`;
        }

        if(submitOfferingBtn)
        {
            submitOfferingBtn.disabled  = true;
            submitOfferingBtn.innerHTML = `
                <i class="fa-solid fa-check-double mr-2"></i> 
                Enigma Solved`;
        }
    }

    // Artifacts
    function renderAutocompleteList(items : SynthesisArtifact[]) : void
    {
        if(!autocompleteList) return;

        if(items.length === 0)
        {
            autocompleteList.innerHTML = `
                <div class="p-2.5 font-cinzel text-xs text-vespera-silver text-center">
                    No matching artifacts found
                </div>`;
            autocompleteList.classList.remove("hidden");
            autocompleteList.classList.add("flex");

            return;
        }

        const bufferHTML : string[] = [];
        items.slice(0, 8).forEach((item : SynthesisArtifact) =>
        {
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

        autocompleteList.querySelectorAll(".autocomplete-option").forEach((optEl : Element) =>
        {
            optEl.addEventListener("click", () =>
            {
                const idArt : number = parseInt((optEl as HTMLElement).dataset.artifactId || "0");
                handleArtifactSelection(idArt);
                if(artifactSelect) artifactSelect.value = idArt.toString();
                autocompleteList.classList.add("hidden");
                autocompleteList.classList.remove("flex");
            });
        });
    }

    function handleArtifactSelection(idArtifact : number) : void
    {
        state.selectedArtifactId = idArtifact;

        if(!idArtifact || idArtifact <= 0)
        {
           selectedPreviewCont?.classList.add("hidden");
           if(submitOfferingBtn) submitOfferingBtn.disabled = true;
           return;
        }

        const selectedItem : SynthesisArtifact | undefined = state.vaultArtifacts.find(
            (a : SynthesisArtifact) => a.id_artifact === idArtifact);

        if(!selectedItem) return;

        if(previewThumbImg)
        {
            previewThumbImg.src = thumbStreamApiUrl.replace(
                "/hash/PLACEHOLDER",`/hash/${selectedItem.artifact_hash}`);
        }

        if(previewNameLabel)   previewNameLabel.textContent   = selectedItem.alias;
        if(previewHashLabel)   previewHashLabel.textContent   = selectedItem.artifact_hash;
        if(previewPresetBadge) previewPresetBadge.textContent = selectedItem.config?.display_name || "Custom Formula";

        selectedPreviewCont?.classList.remove("hidden");
        selectedPreviewCont?.classList.add("flex");

        if(submitOfferingBtn && !state.isSolved) submitOfferingBtn.disabled = false;
    }

    // Victory
    async function copyRuneToClipboard() : Promise<void>
    {
        const runeText : string = victorySecretKey?.textContent?.trim() || "";
        if(!runeText || runeText === "--") return;

        try
        {
            await navigator.clipboard.writeText(runeText);

            if(copyRuneIcon)   copyRuneIcon.className    = "fa-solid fa-check text-vespera-violetGlow";
            if(copyResetTimer) clearTimeout(copyResetTimer);
            copyResetTimer = window.setTimeout(() : void =>
            {
                if(copyRuneIcon) copyRuneIcon.className = "fa-solid fa-copy";
            }, 2000);
        }
        catch(error)
        {
            console.error("Could not copy secret rune to clipboard:", error);
        }
    }

    // API Handlers
    async function loadBratPalette() : Promise<void>
    {
        const res : APIResponse<ColorPalette> = await apiFetch<ColorPalette>(bratPaletteApiUrl);
        if(!res.success || !res.data)
        {
            return console.error(res.error || "Failed to load Brat palette");
        }

        const bratPal : ColorPalette = res.data;

        if(bratPal && bratPal.stops)
        {
            const bratLut : Uint8ClampedArray = buildPaletteLut(bratPal.stops);
            mirror.setPaletteLut(bratLut);
            if(mirrorSpectrumBadge) mirrorSpectrumBadge.textContent = bratPal.display_name;
        }
    }

    async function loadQuestData() : Promise<void>
    {
        const res : APIResponse<EnigmaQuestData> = await apiFetch<EnigmaQuestData>(questApiUrl);
        if(!res.success || !res.data)
        {
            return console.error(res.error || "Failed to load quest data");
        }

        state.questData = res.data;
        const quest : EnigmaQuestData = res.data;

        if(quest.hint_img_config)
        {
            const cfg : ConfigTuring = quest.hint_img_config;
            if(targetPresetName)  targetPresetName.textContent = cfg.display_name || `Formula #${cfg.id_config}`;
            if(targetFeedRate)    targetFeedRate.textContent   = cfg.feed_rate.toFixed(4);
            if(targetKillRate)    targetKillRate.textContent   = cfg.kill_rate.toFixed(4);
            if(targetDuDv)        targetDuDv.textContent       = `${cfg.diff_u.toFixed(3)} • ${cfg.diff_v.toFixed(3)}`;
            if(targetIterDt)      targetIterDt.textContent     = `${cfg.iterations} • ${cfg.dt.toFixed(2)}`;
        }

        if(targetHashDisplay)
        {
            targetHashDisplay.textContent = quest.hint_img_hash;
            targetHashDisplay.title       = quest.hint_img_hash;
        }

        if(quest.is_solved) renderVictoryState(quest);
    }

    async function loadArtifacts() : Promise<void>
    {
        if(!artifactSelect) return;

        const payload : ArtifactSearchPayload          = { search : "",  limit  : 10 };
        const res     : APIResponse<SynthesisArtifact[]> = await apiFetch<SynthesisArtifact[]>(artifactsApiUrl, {
            method  : "POST",
            headers : { "Content-Type" : "application/json" },
            body    : JSON.stringify(payload)
        });

        if(!res.success || !res.data || !Array.isArray(res.data))
        {
            return console.error("Failed to load unique artifacts");
        }

        state.vaultArtifacts = res.data;

        const bufferHTML : string[] = [`<option value="">Choose an artifact to offer...</option>`];
        res.data.forEach((item : SynthesisArtifact) =>
        {
            bufferHTML.push(`
            <option value="${item.id_artifact}">
                ${item.alias} (#${item.id_artifact}) • ${truncateHash(item.artifact_hash, 6)}
            </option>`);
        });
        artifactSelect.innerHTML = bufferHTML.join("");
    }

    async function searchArtifacts(q : string) : Promise<void>
    {
        if(searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = window.setTimeout(async () : Promise<void> =>
        {
            const payload : ArtifactSearchPayload            = { search : q, limit : 8};
            const res     : APIResponse<SynthesisArtifact[]> = await apiFetch<SynthesisArtifact[]>(artifactsApiUrl, {
                method  : "POST",
                headers : { "Content-Type": "application/json" },
                body    : JSON.stringify(payload)
            });

            if(res.success && Array.isArray(res.data)) renderAutocompleteList(res.data);
        }, 200);
    }

    async function submitOffering() : Promise<void>
    {
        if(!state.selectedArtifactId || state.selectedArtifactId <= 0)
        {
            (window as any).showAlertModal?.({
                title   : "No Offering Provided",
                message : "You must first offer an Artifact to The Altar, love.",
                type    : "danger"
            });

            return;
        }

        try
        {
            const apiUrl : string = verifyApiUrl.replace(
                "/artifact/0", `/artifact/${state.selectedArtifactId}`);

            const res : APIResponse<EnigmaVerifyData> = await apiFetch<EnigmaVerifyData>(apiUrl, { method : "POST" });

            if(!res.success || !res.data)
            {
                (window as any).showAlertModal?.({
                    title   : "Offering Failed",
                    message : "An alchemical disruption has interrupted the offering.",
                    type    : "danger"
                });
                return console.error(res.error || "Unknown error during offering");
            }

            if(res.data.is_solved)
            {
                renderVictoryState(res.data);
                (window as any).showAlertModal?.({
                    title      : "Resonance Achieved",
                    message    : res.message || "The seal has shattered. Happy Birthday, my love.",
                    type       : "info",
                    icon       : "fa-gem",
                    cancelText : "Unlock The Secret",
                    onConfirm  : () : void => { victoryCard?.scrollIntoView({ behavior : "smooth" }); },
                    onCancel   : () : void => { victoryCard?.scrollIntoView({ behavior : "smooth" }); },
                });
            }
            else
            {
                (window as any).showAlertModal?.({
                    title   : "Harmonic Dissonance",
                    message : res.message || "The offering does not resonate with the seal. Refine your reaction and try again, love.",
                    type    : "warning"
                });
            }
        }
        catch(error : any)
        {
            (window as any).showAlertModal?.({
                title   : "Unforeseen Disruption",
                message : "An unexpected cataclysm has obstructed the offering.",
                type    : "danger"
            });
            return console.error(error);
        }
    }


    // --- LISTENERS ---
    function bindListeners() : void
    {
        artifactSearchInput?.addEventListener("input", () : void =>
        {
            const q : string = artifactSearchInput?.value.trim().toLowerCase() || "";
            if(!q)
            {
                if(searchClearBtn)
                {
                    searchClearBtn.classList.add("hidden");
                    searchClearBtn.disabled = true;
                }

                autocompleteList?.classList.add("hidden");
                autocompleteList?.classList.remove("flex");
                return;
            }

            if(searchClearBtn)
            {
                searchClearBtn.classList.remove("hidden");
                searchClearBtn.disabled = false;
            }

            searchArtifacts(q).then();
        });

        searchClearBtn?.addEventListener("click", () =>
        {
            if(artifactSearchInput) artifactSearchInput.value = "";
            searchClearBtn.classList.add("hidden");
            searchClearBtn.disabled = true;
            handleArtifactSelection(0);
        });

        document.addEventListener("click", (event : MouseEvent) : void =>
        {
            if(!autocompleteList) return;
            const target : HTMLElement = event.target as HTMLElement;
            if(!target.closest("#altar-artifact-search") && !target.closest("#altar-autocomplete-list"))
            {
                autocompleteList.classList.add("hidden");
                autocompleteList.classList.remove("flex");
            }
        });

        artifactSelect?.addEventListener("change", () : void =>
        {
            const selectedVal : number = parseInt(artifactSelect.value || "0");
            handleArtifactSelection(selectedVal);
        });

        submitOfferingBtn?.addEventListener("click", submitOffering);

        copySecretRuneBtn?.addEventListener("click", copyRuneToClipboard);
    }


    // --- INITIALIZATION ---
    async function initEnigma() : Promise<void>
    {
        await Promise.all([
            loadBratPalette(),
            loadQuestData(),
            loadArtifacts()
        ]);

        try
        {
            await mirror.loadFrames([hintStreamApiUrl], [15000]);
        }
        catch(error)
        {
            console.error("Could not preload The Enigma into The Scrying Mirror:", error);
        }

        bindListeners();
    }

    initEnigma().then();
});