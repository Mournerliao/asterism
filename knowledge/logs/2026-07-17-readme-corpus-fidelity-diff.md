# README corpus fidelity differences

Issue #10 acceptance record. Categories: `css-fixable` · `runtime-dependent` · `acceptable`.

| Fixture | Observation | Kind | Disposition |
| --- | --- | --- | --- |
| media-relative | Parent-relative `../` image/link paths previously became `HEAD/../…` raw URLs | css-fixable → sanitizer | Shared `resolveRepoRelative` against repo root; escapes above root drop `src` / `href` |
| rich-fallback | video/iframe/object/embed/form/handlers removed | acceptable | Matches security contract; structure headings/lists retained |
| badges-centered | Inline `style` stripped; `align="center"` retained | acceptable | Presentation injection blocked; GitHub centering via align preserved |
| wide-table-code | Table/pre scroll inside canvas; page must not gain horizontal overflow | css-fixable | Covered by existing `readme-document-v1` `overflow-x: auto` on table/pre; verified in Cursor browser at 390 / 900 / 1200 |
| deep-outline / chinese-content | Outline ids stable; Chinese labels retained | acceptable | Outline engine already covers; browser confirmed Chinese headings/details |
| no-readme | No HTML body; recovery copy is product UI | runtime-dependent | Exercised via corpus lab stand-in (`role="status"`) + existing README recovery route tests |
| All HTML fixtures | Asterism does not clone GitHub page chrome / syntax highlighter runtime | acceptable | Spec: content-area fidelity, not permanent pixel identity |

## Browser visual review (Cursor built-in browser)

- Lab: `/dev/readme-corpus` (DEV-only)
- Viewports: desktop ~1200, tablet ~900, mobile ~390 — **no page horizontal overflow** on any fixture
- Themes: light (`rgb(245,246,248)`) / dark (`rgb(11,14,19)`) toggle verified
- Wide table/pre: local `overflow-x: auto` with content wider than client; page stays clipped
- Details / Chinese / badges / media relative-escape / rich fallbacks / no-README / skeleton path verified
- Lab theme/skeleton controls sized to **44px** touch targets; markdown `a` / `summary` keep `focus-visible` ring; reduced-motion CSS for document enter/exit present

## Acceptance checklist

- [x] Corpus covers ordinary GFM, deep outlines, badges/centered HTML, wide tables, multilingual code, media/relative paths, details, rich fallbacks, Chinese, no-README
- [x] Automated sanitizer/outline gate (`readme-corpus.test.ts`)
- [x] General rule fixed before fixture-specific workaround (image path normalize)
- [x] Dev lab `/dev/readme-corpus` for light/dark visual review
- [x] Browser visual review across desktop / tablet / mobile widths (Cursor built-in browser)
- [x] A11y spot-check (focus-visible on links/summary, status messaging, 44px lab controls)
- [x] Reduced-motion / skeleton path in lab
