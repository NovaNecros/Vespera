// Vespera/app/presentation/static/ts/tailwind.config.ts

interface TailwindThemeConfig
{
    darkMode : string;
    theme    : {
        extend : {
            colors     : Record<string, Record<string, string>>;
            fontFamily : Record<string, string[]>;
            boxShadow  : Record<string, string>;
        };
    };
}

const vesperaTailwindConfig : TailwindThemeConfig = {
    darkMode : "class",
    theme    : {
        extend : {
            colors : {
                vespera : {
                    void       : "var(--vespera-void)",
                    obsidian   : "var(--vespera-obsidian)",
                    velvet     : "var(--vespera-velvet)",
                    surface    : "var(--vespera-surface)",
                    crimson    : "var(--vespera-crimson)",
                    bright     : "var(--vespera-crimson-bright)",
                    wine       : "var(--vespera-wine)",
                    gold       : "var(--vespera-gold)",
                    goldbright : "var(--vespera-gold-bright)",
                    amethyst   : "var(--vespera-amethyst)",
                    lilac      : "var(--vespera-lilac-mist)",
                    bone       : "var(--vespera-bone)",
                    parchment  : "var(--vespera-parchment)",
                    silent     : "var(--vespera-bone-silent)",
                    ink        : "var(--vespera-bone-ink)"
                }
            },
            fontFamily : {
                ornate : ["'Cinzel Decorative'", "serif"],
                cinzel : ["'Cinzel'", "serif"],
                serif  : ["'Cormorant Garamond'", "serif"],
                mono   : ["'Fira Code'", "monospace"]
            },
            boxShadow : {
                "ambient"      : "var(--vespera-shadow-ambient)",
                "glow-crimson" : "var(--vespera-glow-crimson)",
                "glow-gold"    : "var(--vespera-glow-gold)"
            }
        }
    }
};

(window as any).tailwind        = (window as any).tailwind || {};
(window as any).tailwind.config = vesperaTailwindConfig;