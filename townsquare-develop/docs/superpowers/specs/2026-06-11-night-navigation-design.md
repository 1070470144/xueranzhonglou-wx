# Storyteller Night Navigation Design

## Goal

Add a storyteller-only night navigation control to the room control drawer. The storyteller can choose First Night or Other Nights, then move to the previous or next acting character. The matching seated player is highlighted on the town square.

## User Experience

- The host room control shortcut area gains night navigation controls.
- The controls include:
  - A First Night / Other Nights mode switch.
  - Previous and Next buttons.
  - A compact current-action label showing the selected order, role name, and player name when available.
- The controls appear only for the host/storyteller.
- Switching between First Night and Other Nights resets the current action to no selection.
- Pressing Next with no selection moves to the first acting seat in the selected mode.
- Pressing Previous with no selection moves to the last acting seat in the selected mode.
- Previous and Next wrap around at the ends of the selected queue.
- If the selected mode has no seated acting characters, the controls show an empty/disabled state and do not highlight a seat.

## Night Action Queue

The queue is derived from the current seated players.

- First Night uses each player's `role.firstNight`.
- Other Nights uses each player's `role.otherNight`.
- Players without a role or without a positive order value are skipped.
- Entries are sorted by the selected order value ascending.
- Ties are sorted by seat index ascending, so duplicate night orders remain stable and predictable.
- The queue entry includes:
  - `seatIndex`
  - `player`
  - `role`
  - `order`
  - `mode`

Fabled entries are not highlighted because they do not map to a seat. They remain covered by the existing Night Order Sheet.

## State And Data Flow

Add a small Vuex state slice for night navigation.

- `mode`: `"first"` or `"other"`
- `currentSeatIndex`: `-1` when nothing is selected, otherwise the highlighted seat index

Add mutations for:

- Setting the mode, which resets `currentSeatIndex` to `-1`.
- Setting the current seat index.
- Clearing the current seat index.

Add a getter for the selected mode's queue. The room control drawer consumes it to drive the buttons and label. `Player.vue` consumes `currentSeatIndex` to apply a highlight class.

The navigation state is local to the storyteller's client and is not sent to players. It should not reuse `session.markedPlayer`, because that state already has game semantics and a different visual language.

## Components

### `RoomControlDrawer.vue`

- Add a compact night navigation block to the host shortcut area.
- Map the night navigation state and queue from Vuex.
- Implement `nextNightAction()` and `previousNightAction()` by moving through the derived queue.
- Disable previous/next when the queue is empty.

### `Player.vue`

- Add a `night-active` class when the player's seat index matches the Vuex `currentSeatIndex`.
- Style the highlight as a storyteller navigation cue, separate from role distribution, nomination, death, and marked-player visuals.

### `i18n/index.js`

Add labels for:

- Night navigation
- First Night
- Other Nights
- Previous
- Next
- No night actions

Chinese labels should match the existing room control tone.

## Error Handling And Edge Cases

- If roles are cleared or players change and the highlighted seat no longer exists in the queue, the current label falls back to the empty state, no seat is highlighted, and the next navigation click starts from the selected mode's boundary.
- If a highlighted player's role changes and remains in the selected queue, the label updates from the derived queue.
- If the selected mode changes, selection resets to avoid accidentally highlighting a stale player from the other mode.
- Spectators and normal players never see the host controls.

## Testing

Unit or source-level tests should cover:

- First Night queue sorting.
- Other Nights queue sorting.
- Players with missing roles or order `0` are skipped.
- Duplicate order values are sorted by seat index.
- Mode switching resets the current selection.
- Next and Previous wrap correctly.

Manual verification should cover:

- Host opens the room control drawer and sees the night navigation controls.
- Choosing First Night and pressing Next highlights the first acting player.
- Choosing Other Nights and pressing Next highlights the first other-night acting player.
- Previous wraps to the last acting player.
- Clearing roles removes the active highlight or shows the empty state.
