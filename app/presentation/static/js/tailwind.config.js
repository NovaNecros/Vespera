"use strict";
const vesperaTailwindConfig = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                vespera: {
                    smokeCenter: "#DFE1EA",
                    smokeInner: "#BBBEC4",
                    smokeOuter: "#66686C",
                    void: "#060608",
                    voidBorder: "#14151B",
                    obsidian: "#0B0C11",
                    charcoal: "#111319",
                    surface: "#181A22",
                    surfaceHover: "#2E3242",
                    bloodCoagulated: "#1A0003",
                    wine: "#2E0207",
                    crimsonDark: "#4D0008",
                    crimson: "#800008",
                    crimsonBright: "#B80A18",
                    crimsonGlow: "#FF1A2A",
                    ironBlack: "#050508",
                    ironDark: "#151720",
                    iron: "#262936",
                    pewter: "#585E70",
                    silver: "#9FA5B5",
                    silverBright: "#D8DCE6",
                    silverGlow: "#F0F3FA",
                    amethystDark: "#16041C",
                    amethyst: "#380C42",
                    violetGlow: "#7E2699",
                    lilacMist: "#C3A5C3",
                    boneShadow: "#3C3E44",
                    boneSilent: "#727682",
                    boneInk: "#C5C9D3",
                    bone: "#E2DFD8",
                    parchment: "#ECEAE4",
                    white: "#FFFFFF"
                }
            },
            fontFamily: {
                ornate: ["'Cinzel Decorative'", "serif"],
                cinzel: ["'Cinzel'", "serif"],
                serif: ["'Cormorant Garamond'", "serif"],
                mono: ["'Fira Code'", "monospace"]
            },
            boxShadow: {
                "ambient": "0 8px 32px 0 rgba(0, 0, 0, 0.85)",
                "glow-crimson": "0 0 20px rgba(128, 0, 8, 0.40), 0 0 40px rgba(128, 0, 8, 0.15)",
                "glow-crimson-int": "0 0 25px rgba(230, 0, 0, 0.55), 0 0 50px rgba(128, 0, 8, 0.35)",
                "glow-silver": "0 0 15px rgba(159, 165, 181, 0.25), 0 0 30px rgba(159, 165, 181, 0.10)",
                "glow-amethyst": "0 0 10px rgba(126, 38, 153, 0.35)"
            }
        }
    }
};
window.tailwind = window.tailwind || {};
window.tailwind.config = vesperaTailwindConfig;
