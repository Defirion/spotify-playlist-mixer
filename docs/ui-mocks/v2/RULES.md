# v2 rules: no AI tells

The v1 mocks (one level up) were reviewed against a list of well-known AI-generated-UI tells and every one failed several.
v2 is a rework. The functionality list and fake data in `../SPEC.md` still apply in full. The look must not hit ANY item below.

## The tells (all banned)

1. Purple-to-blue (or purple-to-pink) gradients. No gradients on UI chrome at all. Flat fills only.
   (Playlist cover art placeholders may use flat patterns or flat colour; no purple/blue/pink gradient washes.)
2. Inter on everything. Also avoid the new defaults that read the same way: Space Grotesk, Space Mono, Geist, Figtree, Manrope,
   Fraunces, Newsreader, Playfair, Plus Jakarta, DM Sans, Syne, Outfit, Sora. Use the typeface named in your brief, or a system stack.
3. Gradient text on headlines.
4. A little pill badge above a heading ("Introducing...", "New", "Beta", "Draft", "Live", "Side A"). No eyebrow pills, no status chips next to titles.
5. Glow / halo behind the hero. No frosted glass (no backdrop-filter anywhere), no blurred colour blobs, no text-shadow glow, no box-shadow glow.
6. An icon sitting inside a rounded square or circle. Avoid icon containers entirely. Prefer plain words on buttons. A bare inline glyph is OK
   only when it carries meaning that text can't (drag handle, remove ×, checkmark).
7. Three identical feature cards in a row; cards inside cards. At most one level of container. Presets are THREE items, so
   do NOT render them as three identical cards: use a list, a table, a segmented control, or a menu.
8. A coloured stripe down the side (or top) of a card, like an alert. No border-left/border-top accent bars. Source-playlist colour may appear
   as a full swatch, as a filled shape in a chart/timeline/meter, or as text colour, but never as a card side stripe.
9. A giant stat number with a tiny caption ("10,000+" over "users"). No hero-stat blocks. Totals are written as plain information in
   a sentence or a labelled row, e.g. "78 tracks, 5 h 02 m. That is 2 min over your 5 h target."
10. Tiny labels. Minimum font size 13px everywhere, no exceptions (including tables, kbd hints, timestamps). No letter-spaced ALL-CAPS micro
    headings. No decorative numbering ("01", "STEP 2", "CH 01", "I. II. III.", "No. 12", "Vol. IV"). Number things only when order matters to the user.
11. A pulsing green dot / "all systems operational" / fake status bars, fake session info, fake log lines, fake version numbers. Everything
    on screen must be something the real app can actually know. No animation that loops for decoration.
12. Marketing copy: "supercharge", "elevate", "seamless", "unlock", "effortless", "your workflow". And NO em dashes (—) in any copy. Use periods,
    commas, colons or parentheses. Write like a person explaining a tool to a friend: short, concrete, specific, sentence case.
13. The "escape" version: warm beige/cream background + italic serif display type is itself the 2025 cliché. Also avoid
    its siblings: neon-on-black "cyber", dark-mode-with-indigo-accent "Linear clone", pastel blobs, and brutalism-as-costume.

## What to do instead

- Start from the job at each step. Decide what the user needs to SEE and DECIDE, then give it hierarchy with size, weight, position and
  whitespace. Not decoration. If you can't say what an element is for, delete it.
- One accent colour, used for exactly one job (the primary action, or the current selection, not both).
- Colour as DATA: each source playlist has a colour, and it appears where the data appears (timeline, meter, tag text, swatch), never as ornament.
- Real contrast: body text at least 4.5:1. Real focus rings. Hit targets at least 40px on touch.
- Pick a concrete, domain-true visual reference (given in your brief) and commit to it. Don't blend styles.
- Honest density: tables for tabular things, sentences for explanations, a single control for a single decision.
- Cover art placeholders: generate flat, distinctive pattern tiles per playlist (stripes, grids, dots, shapes) in the playlist's colour on a
  contrasting flat ground.

## Required self-audit before you finish

Run these against your file and fix every hit (comments excluded; the design-notes block must pass too):

```
grep -c "—" file.html                         # must be 0 (em dash)
grep -ci "backdrop-filter" file.html          # must be 0
grep -ciE "gradient" file.html                # must be 0, unless you can justify a flat-looking use (say so in the notes)
grep -ciE "text-shadow|filter: *blur|drop-shadow" file.html   # 0 for glow; a 1px hard print offset is fine
grep -ciE "border-(left|right|top): *[0-9]+px solid var\(--(c|src|accent)" file.html   # no stripe-on-card patterns
grep -oE "font-size: *([0-9]|1[0-2])(\.[0-9]+)?px" file.html   # must print nothing (min 13px)
grep -cE "\bInter\b|Space Grotesk|Geist|Figtree|Manrope|Fraunces|Newsreader" file.html   # 0 unless it is your brief's named font
grep -ciE "pulse|infinite" file.html          # 0, no decorative looping animation
```

Also visually check at 1440px and 390px (headless Chrome; in Git Bash pass an ABSOLUTE --screenshot path):
`"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,1000 --screenshot="C:/abs/path/out.png" "http://127.0.0.1:4010/v2/yourfile.html"`
(a static server is already running on 127.0.0.1:4010 serving docs/ui-mocks). Read your PNGs, fix what looks off.
Real drag-reorder, live controls, Connect|Workspace switch and toasts must still work (test with real pointer events if you can).
Design-notes block: list palette (hex), fonts, 3 signature ideas, 1 trade-off, and one line "Tells I avoided and how".
