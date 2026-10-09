# Product: UI Style

Chosen style: soft and rounded (variant B of the order card mockup). Reference
mockup: https://claude.ai/artifact/E9QDunVRYjg3MaHwRicfYX

## Look

- One light theme. No dark theme, no theme switcher.
- Warm red accent, never blue or pale calm tones. Red is used only for the primary action, the active menu item, totals
  and dangerous actions, not for decoration.
- Interface language: English, no language switcher.

## Colors

| Role                                                          | Value                                                                       |
|---------------------------------------------------------------|-----------------------------------------------------------------------------|
| Accent (primary button, active menu text, totals)             | `#A8281F`                                                                   |
| Dark accent (text on red tint)                                | `#8F2119`                                                                   |
| Red tint (active menu item, totals strip)                     | `#FBE9E6`                                                                   |
| Page background                                               | `#FAF7F5`                                                                   |
| Cards, sidebar                                                | `#FFFFFF`                                                                   |
| Borders of cards and dividers                                 | `#EEE7E2`                                                                   |
| Border of a control (input, secondary button, select)         | `#8A817B` (contrast 3.8:1 against white, 3.6:1 against the page background) |
| Text                                                          | `#1C1917`                                                                   |
| Secondary text                                                | `#6B6560`                                                                   |
| Status `APPOINTMENT` badge (sand: planned, not yet accepted)  | background `#F3E4DC`, text `#7A4F3C`                                        |
| Status `WORK_ORDER` badge (khaki: accepted, waiting to start) | background `#EAE6C8`, text `#4F4A14`                                        |
| Status `IN_PROGRESS` badge (amber: work is under way)         | background `#FFF1D6`, text `#6B4200`                                        |
| Status `ON_HOLD` badge (plum: waiting for the customer)       | background `#EBDCE4`, text `#5E2D4B`                                        |
| Status `WAITING_FOR_PARTS` badge (orange: waiting for a part) | background `#FFE0C2`, text `#7A3E00`                                        |
| Status `READY` badge (light green: waiting for pickup)        | background `#DDEBD3`, text `#2F5A1E`                                        |
| Status `PAID` badge (deeper green: paid)                      | background `#C5E0C8`, text `#1F4D2B`                                        |
| Status `CLOSED` badge (lighter, neutral)                      | background `#EDE8E4`, text `#6B6560`                                        |
| Status `CANCELLED` badge (darker)                             | background `#D2C9C2`, text `#2F2A27`                                        |

The badge colors follow the lifecycle: warm neutrals before the work, amber while it is under way, plum and orange for
the two pauses (they share one board column and stay distinguishable), green once the vehicle is ready or paid, greys
for the final states. No badge is red: red is reserved for actions. Every text/background pair has a contrast ratio of
at least 4.5:1 (checked by calculation).

## Shape and type

- Font: Onest (supports Latin and Cyrillic). Sizes are the same on every screen width: body 16, secondary 15, small 14
  (only for what is not needed), key data (order number, status, amount) 18 to 20, page title 24 on a phone and 30 from
  768 px wide. Nothing is smaller than 14.
- Radius: 10 px for buttons and menu items, 14 px for cards, fully rounded pill for status badges.
- Cards: white with a soft shadow `0 1px 3px rgba(60,40,30,.08)`.
- Focus: a visible ring of 3 px in the text color with a 2 px offset on every focusable element.

## Layout

- Written for a phone first; the widths are: phone below 768 px, tablet 768 to 1023 px, desktop 1024 px and above.
- Menu: a bottom tab bar on a phone, a narrow column of icons with labels on a tablet, a left sidebar 220 px on a
  desktop; the menu items depend on the role.
- Order card content is limited to about 1000 px wide; lists use the full width. The content is one column on a phone.
- Page header: breadcrumb (on a phone a Back button), title, status badge, the actions allowed in the current status. On
  a phone the main action is fixed at the bottom of the screen, above the tab bar.

## Buttons

- Minimum 48 px high and wide, the main action of a screen 56 px, at least 8 px between two buttons (a mechanic works
  with dirty hands on a phone or a tablet).
- One primary (filled red) action per screen area.
- Secondary actions: white with a light border.
- Dangerous actions (cancel the order) are never filled: muted red outline.
- Show the actions the backend returns for this user and status; disable the ones it marks as not enabled.

## Prohibitions

- Do not fall back to the default blue theme of a component library: override its colors, radius and font.
- No hover-only behavior and no information in color alone: a status is its text plus its color.
- No animation that loops or lasts longer than 300 ms; feedback on a press is a color change.
- Do not edit this file without human approval.

## Open Questions

- None.
