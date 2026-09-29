// Vespera/app/presentation/static/ts/enigmas/enigma22.ts

import
{
    APIResponse,         ArtifactManifestation,
    ColorPalette,        ConfigTuring,
    VaultGalleryPayload, VaultGalleryData,
    EnigmaQuestData,     EnigmaVerifyData
} from "../types.js";
import
{
    apiFetch,
    truncateHash,
    buildPaletteLut
} from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";

interface EnigmaState
{
    questData          : EnigmaQuestData | null;
    paletteCatalog     : ColorPalette[];
    vaultArtifacts     : ArtifactManifestation[];
    selectedArtifactId : number          | null;
    isSolved           : boolean;
}

document.addEventListener("DOMContentLoaded", () : void =>
{
    // --- VARIABLES ---
    const mainContainer     : HTMLElement       | null   = document.getElementById("enigma22-main-container");
    if(!mainContainer) return;

    // API URLs
    const questApiUrl       : string                     = mainContainer.dataset.questApiUrl       || "";
    const verifyApiUrl      : string                     = mainContainer.dataset.verifyApiUrl      || "";
    const hintStreamApiUrl  : string                     = mainContainer.dataset.hintStreamApiUrl  || "";
    const galleryApiUrl     : string                     = mainContainer.dataset.galleryApiUrl     || "";
    const thumbStreamApiUrl : string                     = mainContainer.dataset.thumbStreamApiUrl || "";
    const palettesApiUrl    : string                     = mainContainer.dataset.palettesApiUrl    || "";

    // Status & Mirror
    const questStatusBadge    : HTMLElement       | null = document.getElementById("quest-status-badge");
    const mirrorSpectrumBadge : HTMLElement       | null = document.getElementById("mirror-spectrum-badge");
    const mirror              : ScryingMirror            = new ScryingMirror();

    // Target Formula
    const targetPresetName   : HTMLElement       | null = document.getElementById("target-preset-name");
    const targetFeedRate     : HTMLElement       | null = document.getElementById("target-feed-rate");
    const targetKillRate     : HTMLElement       | null = document.getElementById("target-kill-rate");
    const targetDuDv         : HTMLElement       | null = document.getElementById("target-du-dv");
    const targetIterDt       : HTMLElement       | null = document.getElementById("target-iter-dt");
    const targetHashDisplay  : HTMLElement       | null = document.getElementById("target-hash-display");

    // Altar Controls
    const artifactSelect      : HTMLSelectElement | null = document.getElementById("altar-artifact-select") as HTMLSelectElement;
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


    // --- FUNCTIONS ---
    // State
    function getDefaultState() : EnigmaState
    {
        return {
            questData          : null,
            paletteCatalog     : [],
            vaultArtifacts     : [],
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
    function handleArtifactSelection(idArtifact : number) : void
    {
        state.selectedArtifactId = idArtifact;

        if(!idArtifact || idArtifact <= 0)
        {
           selectedPreviewCont?.classList.add("hidden");
           if(submitOfferingBtn) submitOfferingBtn.disabled = true;
           return;
        }

        const selectedItem : ArtifactManifestation | undefined = state.vaultArtifacts.find(
            (a : ArtifactManifestation) => a.id_artifact === idArtifact);

        if(!selectedItem) return;

        if(previewThumbImg)
        {
            previewThumbImg.src = thumbStreamApiUrl.replace(
                "/hash/PLACEHOLDER",`/hash/${selectedItem.artifact_hash}`);
        }

        if(previewNameLabel)   previewNameLabel.textContent   = selectedItem.alias;
        if(previewHashLabel)   previewHashLabel.textContent   = truncateHash(selectedItem.artifact_hash, 8);
        if(previewPresetBadge) previewPresetBadge.textContent = selectedItem.config?.display_name || "Custom Formula";

        selectedPreviewCont?.classList.remove("hidden");
        selectedPreviewCont?.classList.add("flex");

        if(submitOfferingBtn && !state.isSolved) submitOfferingBtn.disabled = false;
    }

    // API Handlers
    async function loadBratPalette() : Promise<void>
    {
        // Yo sé que no debería llamar a todas las paletas si solo quiero una
        // pero es la 1:40 am del 29 de septiembre so optimizar el código ya no es mi prioridad xd
        const res : APIResponse<ColorPalette[]> = await apiFetch<ColorPalette[]>(palettesApiUrl);
        if(!res.success || !Array.isArray(res.data))
        {
            return console.error(res.error || "Failed to load palette catalog");
        }

        state.paletteCatalog = res.data;

        // BRAT :b
        const bratPal : ColorPalette | undefined = state.paletteCatalog.find(
            (p : ColorPalette) => p.name === "brat");

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

    async function loadVaultArtifacts() : Promise<void>
    {
        if(!artifactSelect) return;

        const payload : VaultGalleryPayload = {
            id_palette      : null,
            id_config       : null,
            id_source_image : null,
            favorites       : false,
            search          : "",
            sort_by         : "date_created",
            sort_dir        : "desc",
            page            : 1,
            per_page        : 10
        };

        const res : APIResponse<VaultGalleryData> = await apiFetch<VaultGalleryData>(galleryApiUrl, {
            method  : "POST",
            headers : { "Content-Type" : "application/json" },
            body    : JSON.stringify(payload)
        });

        if(!res.success || !res.data || !Array.isArray(res.data.items))
        {
            return console.error("Failed to load vault artifacts");
        }

        state.vaultArtifacts = res.data.items;

        const bufferHTML : string[] = [`<option value="">Choose an artifact to offer...</option>`];
        res.data.items.forEach((item : ArtifactManifestation) =>
        {
            bufferHTML.push(`
            <option value="${item.id_artifact}">
                ${item.alias} (#${item.id_artifact}) • ${truncateHash(item.artifact_hash, 5)}
            </option>`);
        });
        artifactSelect.innerHTML = bufferHTML.join("");
    }

    async function submitOffering() : Promise<void>
    {
        if(!state.selectedArtifactId || state.selectedArtifactId <= 0)
        {
            (window as any).showAlertModal({
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
                (window as any)?.showAlertModal({
                    title   : "Offering Failed",
                    message : "AN alchemical disruption has interrupted the offering.",
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
                    onConfirm  : () : void => { victoryCard?.scrollIntoView({ behavior : "smooth" })},
                    onCancel   : () : void => { victoryCard?.scrollIntoView({ behavior : "smooth" })},
                });
            }
            else
            {
                (window as any).showAlertModal?.({
                    title   : "Harmnoic Dissonance",
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
        artifactSelect?.addEventListener("change", () : void =>
        {
            const selectedVal : number = parseInt(artifactSelect.value || "0");
            handleArtifactSelection(selectedVal);
        });

        submitOfferingBtn?.addEventListener("click", submitOffering);
    }


    // --- INITIALIZATION ---
    async function initEnigma() : Promise<void>
    {
        await Promise.all([
            loadBratPalette(),
            loadQuestData(),
            loadVaultArtifacts()
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