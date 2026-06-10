# Room Control Drawer UI Design

## Goal

Optimize the room control interface so it visually matches the room list lobby's dark register-board style while keeping the existing right-side drawer interaction and room control behavior.

## Scope

- Modify only `townsquare-develop/src/components/RoomControlDrawer.vue`.
- Preserve all existing Vue methods, store commits, modal toggles, and button behavior.
- Do not modify `RoomLobbyModal.vue` or any room list lobby code.
- Do not change socket, store, server, or i18n behavior.

## Design

The drawer remains a right-side panel, but becomes a room management register. It uses a dark wood-like surface, warm gold text, thin brown borders, compact rows, and squared controls inspired by the lobby list. The header highlights the room name and close button, summary metadata becomes stamp-like status cells, and the overview becomes a two-row register table.

Host quick actions become a two-column command grid. Foldable groups remain as `details` sections, but each group gets a register header and dark body. The player list becomes compact table-like rows with a small kick button. The danger section keeps a red accent without taking over the whole interface.

## Mobile Behavior

On small screens, the drawer uses nearly full viewport width. Action grids collapse to one column where needed, text truncates cleanly, and rows keep stable minimum heights so controls do not overlap.

## Verification

- Static inspection confirms only `RoomControlDrawer.vue` changed for implementation.
- The drawer still renders for host and non-host states because template conditions and methods are unchanged.
- CSS is scoped to `RoomControlDrawer.vue`, preventing lobby style changes.
