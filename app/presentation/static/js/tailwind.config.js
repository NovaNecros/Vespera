"use strict";
const vesperaTailwindConfig = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                vespera: {
                    smokeCenter: "var(--vespera-smoke-center)",
                    smokeInner: "var(--vespera-smoke-inner)",
                    smokeOuter: "var(--vespera-smoke-outer)",
                    void: "var(--vespera-void)",
                    obsidian: "var(--vespera-obsidian)",
                    charcoal: "var(--vespera-charcoal)",
                    surface: "var(--vespera-surface)",
                    surfaceHover: "var(--vespera-surface-hover)",
                    bloodCoagulated: "var(--vespera-blood-coagulated)",
                    wine: "var(--vespera-wine)",
                    crimsonDark: "var(--vespera-crimson-dark)",
                    crimson: "var(--vespera-crimson)",
                    crimsonBright: "var(--vespera-crimson-bright)",
                    crimsonGlow: "var(--vespera-crimson-glow)",
                    ironBlack: "var(--vespera-iron-black)",
                    ironDark: "var(--vespera-iron-dark)",
                    iron: "var(--vespera-iron)",
                    pewter: "var(--vespera-pewter)",
                    silver: "var(--vespera-silver)",
                    silverBright: "var(--vespera-silver-bright)",
                    silverGlow: "var(--vespera-silver-glow)",
                    amethystDark: "var(--vespera-amethyst-dark)",
                    amethyst: "var(--vespera-amethyst)",
                    violetGlow: "var(--vespera-violet-glow)",
                    lilacMist: "var(--vespera-lilac-mist)",
                    boneShadow: "var(--vespera-bone-shadow)",
                    boneSilent: "var(--vespera-bone-silent)",
                    boneInk: "var(--vespera-bone-ink)",
                    bone: "var(--vespera-bone)",
                    parchment: "var(--vespera-parchment)",
                    white: "var(--vespera-white)"
                }
            },
            fontFamily: {
                ornate: ["'Cinzel Decorative'", "serif"],
                cinzel: ["'Cinzel'", "serif"],
                serif: ["'Cormorant Garamond'", "serif"],
                mono: ["'Fira Code'", "monospace"]
            },
            boxShadow: {
                "ambient": "var(--vespera-shadow-ambient)",
                "glow-crimson": "var(--vespera-glow-crimson)",
                "glow-crimson-int": "var(--vespera-glow-crimson-int)",
                "glow-silver": "var(--vespera-glow-silver)",
                "glow-amethyst": "var(--vespera-glow-amethyst)"
            }
        }
    }
};
window.tailwind = window.tailwind || {};
window.tailwind.config = vesperaTailwindConfig;
