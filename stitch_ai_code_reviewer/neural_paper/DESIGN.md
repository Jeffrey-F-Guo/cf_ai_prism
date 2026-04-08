# Design System Specification: The Academic Modernist

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**
This design system rejects the frantic, cluttered nature of modern interfaces in favor of a "Curated Editorial" experience. It is designed to feel like a high-end academic journal—thoughtful, authoritative, and spacious. We move beyond the "template" look by utilizing intentional asymmetry, oversized margins, and a strict adherence to tonal layering.

The goal is to provide a "breath of fresh air" for the user. We achieve this by treating the screen not as a grid of boxes, but as a singular piece of fine stationery where information is allowed to float, breathe, and command attention through typography rather than structural lines.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a warm, organic "Neural Paper" base, punctuated by a singular "Intelligence" accent.

### Surface Hierarchy & Nesting
We utilize a **"Physical Layering"** model. Imagine sheets of vellum stacked upon one another.
- **Base Layer (`surface` / `#fbf9f6`):** The canvas. Used for the widest margins and background.
- **Sectioning (`surface_container_low` / `#f5f3f0`):** Used for large content blocks or sidebars.
- **Component Layer (`surface_container_lowest` / `#ffffff`):** Used for active cards or input areas to create a "bright" lift against the cream background.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background shifts. If a section needs to end, change the background color from `surface` to `surface_container_low`. If a card needs to stand out, use `surface_container_lowest` with a diffused shadow. 

### The "Glass & Gradient" Rule
To elevate the system from "flat" to "premium," use **Glassmorphism** for floating elements (like navigation bars or hovering menus).
- **Glass Token:** `surface` at 70% opacity with a `24px` backdrop-blur.
- **Soul Gradients:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#2a14b4) to `primary_container` (#4338ca) at a 135° angle to add depth and "intelligence."

---

## 3. Typography
The typographic voice is an intentional dialogue between the classic academic (`notoSerif`) and the functional modern (`publicSans`).

- **Display & Headlines (`notoSerif`):** Used for high-level storytelling and page titles. The high-contrast serif evokes reliability and deep thought.
- **Titles & Body (`publicSans`):** Used for UI labels, interface instructions, and long-form reading. This ensures the interface feels "smart" and accessible.
- **Hierarchy as Identity:** Use extreme scale. A `display-lg` (3.5rem) headline should often be paired with generous top margins (64px+) to create an editorial "Cover Page" feel before dropping into dense information.

---

## 4. Elevation & Depth
In this design system, depth is a whisper, not a shout.

### Tonal Layering
Avoid shadows where color shifts can do the work. A `surface_container_highest` (#e4e2df) element nested inside a `surface` (#fbf9f6) background creates a natural, recessed "well" effect without a single drop shadow.

### Ambient Shadows
When an element must float (e.g., a primary Modal or a Popover):
- **Shadow Style:** Use a three-tier diffused shadow.
- **Specs:** `Y: 16px, Blur: 32px, Spread: -4px`.
- **Color:** Use `on_surface` (#1b1c1a) at **4% to 6% opacity**. This mimics natural light hitting thick paper.

### The "Ghost Border" Fallback
If accessibility requirements (WCAG) demand a border, use a **Ghost Border**:
- **Token:** `outline_variant` (#c7c4d7).
- **Opacity:** Apply at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `xl` (1.5rem) roundness, white text. No shadow.
- **Secondary:** `surface_container_high` fill with `primary` text.
- **Tertiary:** Pure text with `primary` color, 600 weight. Use for low-priority actions.

### Cards & Lists
- **The Divider Ban:** Never use horizontal lines to separate list items. Use 16px–24px of vertical whitespace or alternating subtle background shifts (`surface` to `surface_container_low`).
- **Nesting:** Cards should use `xl` roundness (24px) to feel organic and "held."

### Input Fields
- **Style:** Subtle `surface_container_low` background. 
- **States:** On focus, transition the background to `surface_container_lowest` and apply a 1px "Ghost Border" at 40% opacity using the `primary` indigo color.
- **Labeling:** Use `label-md` in `on_surface_variant` (#464554) placed 8px above the input.

### Signature Component: The "Curator’s Tray"
A specialized container for the system. A floating bottom-bar or side-sheet using the **Glassmorphism** rule. It serves as a persistent space for "thought-collection" or secondary navigation, separating "Intellectual Work" from "Interface Navigation."

---

## 6. Do’s and Don’ts

### Do:
- **Embrace Asymmetry:** Align a headline to the left but keep the body copy in a narrower, centered column to mimic high-end magazine layouts.
- **Use Wide Margins:** Use a minimum of 48px padding for containers to maintain a "Calm" personality.
- **Optical Rounding:** Use `xl` (24px) for large containers and `md` (12px) for smaller elements like chips.

### Don’t:
- **Don’t use 100% Black:** Always use `on_surface` (#1b1c1a). Pure black is too aggressive for the "Neural Paper" philosophy.
- **Don’t Over-Shadow:** If more than two elements on a screen have shadows, the layout is too busy. Lean on tonal layering instead.
- **Don’t use High-Contrast Dividers:** If you feel the need to "split" the page, use a change in background color, not a line.