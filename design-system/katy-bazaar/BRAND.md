# Katy Bazaar & Halal Meat — Brand Book

Derived from the shop's own sign, not invented. Every colour below was **measured off the
photograph** (`public/logo-sign.png`) and then adjusted only where WCAG forced it. Each entry
records its measured contrast, so a future change can be checked rather than argued about.

Source photograph: white script lettering with a purple neon glow on a dark plum ground, and a
green glow under "& Halal Meat".

## The palette

### Purple — the primary

| token | hex | on white | note |
|---|---|---|---|
| `--color-primary` | `#7b04c5` | **7.88:1** | the sign's purple, unmodified |
| `--color-primary-dark` | `#5f0399` | 10.72:1 | hover / active |
| `--color-secondary` | `#a855f7` | 3.96:1 | **decorative or large text only** — fails 1.4.3 for body copy |

The sign's purple needed no adjustment. At 7.88:1 it is a *better* contrast than the green it
replaces (`#047857`, 5.48:1), so this rebrand improved legibility rather than trading it away.

### Green — the accent, and the one real trap

| token | hex | on white | on plum | note |
|---|---|---|---|---|
| `--color-accent` | `#37863f` | **4.52:1** | 3.83:1 | the sign's green, darkened for text |
| `--color-accent-dark` | `#2b6b31` | 6.46:1 | 2.68:1 | hover / active |
| `--color-accent-neon` | `#58d564` | **1.89:1 — FAILS** | **9.16:1** | the sign's *actual* green |

**The greens and purples do not swap freely between light and dark ground.** This is the single
easiest mistake to make with this palette:

```
purple #7b04c5   7.88:1 on white    2.20:1 on plum
green  #58d564   1.89:1 on white    9.16:1 on plum
```

Each is legible on exactly one ground. So purple carries the light surfaces, and the neon green is
reserved for dark ones. `--color-accent-neon` is named that way to make its misuse obvious in a
diff: if you see it as text on a white card, that is a bug.

### The sign's own ground

| token | hex | note |
|---|---|---|
| `--color-sign` | `#27122f` | the plum measured from the photo — header |
| `--color-sign-deep` | `#1b0c21` | a step darker — announcement bar, footer |
| `--color-on-sign` | `#fefdf9` | the script white — **17.00:1** on plum |

### Neutrals

| token | hex | note |
|---|---|---|
| `--color-background` | `#faf7fc` | page ground, faintly plum-tinted |
| `--color-surface` | `#ffffff` | cards |
| `--color-foreground` | `#1c1022` | plum-tinted near-black — 17.25:1 on background |
| `--color-muted-foreground` | `#6b5a76` | secondary text — 5.90:1 |
| `--color-border` | `#ece4f1` | **dividers only** — 1.24:1, below the 3:1 that 1.4.11 requires of controls |
| `--color-field` | `#8b7896` | form-control boundaries — 4.02:1, satisfies 1.4.11 |

## Why the header is dark

The logo is **white script**. On a light ground its lettering is invisible, so it cannot be dropped
onto a white header — the asset carries its own plum ground and needs the surface behind it to
match. The header and footer therefore use `--color-sign`, which is also what the shop actually
looks like from the street.

This is a constraint of the artwork, not a style preference. A light-header variant would need a
differently-coloured lockup, which does not exist yet.

## Assets

| file | what it is |
|---|---|
| `public/logo-sign.png` | 1229×429. The sign, trimmed of its black photo border and padded on its own `#27122f` so the final `r` of "Bazaar" is not flush to the edge. |
| `public/mark-sign.png` | 512×512. The `K` monogram, for the browser tab. |
| `public/logo.svg`, `public/mark.svg` | the previous scaffold lockup — retained, unused |

### Known limitations of the current artwork

- **It is a photograph, not a vector.** It will soften when scaled up and cannot be recoloured. A
  vector redraw is the right next step if the shop has one, or can commission one.
- **The source was cropped tight** — the artwork ran to the right edge of the original file
  (content x 0–1140 of 1141 px), so the padding here is synthetic rather than part of the original
  composition.
- **There is no light-ground variant**, which is what forces the dark header above.
- **No transparent version.** Making the plum transparent would leave white script invisible on
  light surfaces, so it would not help.

## Typography

Unchanged, and still appropriate: **Rubik** for display, **Nunito Sans** for body. The sign's
lettering is a brush script that no web font matches closely; using the artwork for the wordmark
and a clean sans for everything else avoids a bad imitation.

## Checking a change

Contrast is not a matter of taste and should not be re-litigated by eye. To verify any new value:

```
node -e '
const lum=h=>{h=h.replace("#","");const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const r=(a,b)=>{const[x,y]=[lum(a),lum(b)];return((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
console.log(r("#7b04c5","#ffffff"))'
```

Thresholds: **4.5:1** for body text (1.4.3), **3:1** for large text and for control boundaries
(1.4.11).
