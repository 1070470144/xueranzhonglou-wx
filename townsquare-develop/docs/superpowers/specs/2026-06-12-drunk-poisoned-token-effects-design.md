# Drunk And Poisoned Token Effects Design

## Context

The room view already highlights the current night action seat by adding a
`night-active` class to `Player.vue` and animating the center role token with a
yellow `drop-shadow` pulse.

Players can also receive reminder tokens from the center plus button below each
seat. These reminders are stored on the player as `player.reminders`. Different
source roles can create different reminder tokens that represent the same
status. For example, Pukka poison and Vigormortis poison have different source
roles, but both mean the player is poisoned.

## Goal

Show a visual effect on a player's center role token when that player's reminder
tokens indicate they are drunk or poisoned.

The effect appears only while the corresponding reminder token exists. Removing
the reminder removes the effect.

## Non-Goals

- Do not add new player state fields for drunk or poisoned.
- Do not create different visual effects for each poison or drunk source.
- Do not change reminder creation or removal flows.
- Do not show storyteller-only reminder state in public grimoire mode.

## Behavior

Each `Player.vue` instance computes status effects from `player.reminders`.

A player is treated as poisoned when any reminder matches poison semantics. A
player is treated as drunk when any reminder matches drunk semantics.

Poison and drunk matching use both reminder text and source role:

- Poison text signals include English `Poisoned` plus localized poison terms
  used by the app's Chinese reminder labels.
- Drunk text signals include English `Drunk` plus localized drunk terms used by
  the app's Chinese reminder labels.
- Poison source roles include roles whose reminder tokens can represent poison,
  such as `poisoner`, `pukka`, `vigormortis`, `nodashii`, `lleech`, `widow`,
  `snakecharmer`, and other script roles that use poison reminder text.
- Drunk source roles include roles whose reminder tokens can represent drunk,
  such as `drunk`, `sailor`, `innkeeper`, `courtier`, `philosopher`,
  `puzzlemaster`, `sweetheart`, and other script roles that use drunk reminder
  text.

The source role is kept for accurate classification and future extension, but
the visual output is status-based:

- Any poison reminder shows the poison effect.
- Any drunk reminder shows the drunk effect.
- If both statuses are present, a combined effect is shown instead of letting two
  separate CSS animations fight over the same `filter` property.

## Visual Design

The implementation should follow the existing night action highlight pattern:

- Add status classes to the player root, for example `poisoned-active`,
  `drunk-active`, or `drunk-poisoned-active`.
- Animate the center `.token` using `filter: drop-shadow(...)`.
- Poison uses a green toxic glow.
- Drunk uses a blue or blue-purple haze.
- Combined status alternates or blends the blue and green glows.

The existing yellow night action effect should keep working. If a player is both
the current night action and drunk or poisoned, the implementation must avoid
one animation silently overriding another. The simplest acceptable behavior is
to make status effects take priority over the night action glow for that token.

In public grimoire mode, these effects should be hidden just like reminder
tokens are hidden.

## Data Flow

1. The storyteller clicks a seat's center plus reminder button.
2. `ReminderModal.vue` adds the selected reminder object to
   `player.reminders`.
3. `Player.vue` recomputes whether the reminder list contains drunk or poison
   semantics.
4. The computed classes update on the player.
5. CSS applies or removes the corresponding token glow.

## Edge Cases

- Custom reminders should not trigger an effect unless their text clearly
  includes drunk or poison keywords.
- `Drunk 1`, `Drunk 2`, `Drunk 3`, and `Everyone drunk` all count as drunk.
- Multiple poison reminders still show one poison effect.
- A blank role token can still receive the effect if the player has a matching
  reminder, because the reminder belongs to the seat.
- Spectators should not gain access to hidden state through public grimoire
  rendering.

## Testing

Manual or source-level tests should cover:

- Adding a Poisoned reminder applies a poison class/effect.
- Removing the Poisoned reminder removes the poison class/effect.
- Adding a Drunk reminder applies a drunk class/effect.
- `Drunk 1`, `Drunk 2`, and `Drunk 3` are treated as drunk.
- Pukka, Vigormortis, No Dashii, Widow, Lleech, and Poisoner poison reminders
  all map to the poison effect.
- Drunk, Sailor, Innkeeper, Courtier, Philosopher, Puzzlemaster, and Sweetheart
  drunk reminders all map to the drunk effect.
- A player with both drunk and poison reminders receives the combined class.
- Public grimoire mode hides the status glow.
- Existing night navigation highlight still works for players without status
  reminders.
