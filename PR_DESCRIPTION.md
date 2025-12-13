# Fix text clipping in gradient headings

## Issue
Fixed text clipping issue where descenders (letters like "g" and "y") were being cut off in gradient text headings using `bg-clip-text`.

## Changes
- Added `overflow-visible` to parent containers
- Set `lineHeight: '1.3'` and `paddingBottom: '0.25rem'` to headings with gradient text
- Fixed clipping in:
  - "My CATs" heading (y was clipped)
  - "Loading Your CATs" title (g was clipped)
  - "Token Management" heading (g was clipped)

## Files Modified
- `web/src/app/my-cats/page.tsx`
- `web/src/components/ui/loading-state.tsx`
- `web/src/app/[cat]/InteractionClient.tsx`

Fixes #95

