# Auto Bluffs and Settings Menu Design

## Scope

This change does not add a "clear all" action and does not change existing room socket synchronization behavior.

## Role Assignment Bluffs

When the storyteller uses the role selection modal and confirms assignment, the app will also populate demon bluffs and lunatic bluffs. Each bluff list is generated from roles in the active script that are not currently seated after assignment.

The target composition is two townsfolk and one outsider. If no outsider candidate exists, the third slot uses a townsfolk candidate. If there are not enough candidates, the app fills as many slots as it can without duplicating roles.

The app will not auto-select the lunatic bluff target. Existing send behavior remains unchanged: lunatic bluffs are only sent when a lunatic bluff target seat is selected.

## Settings Menu

The gear menu gets a dedicated settings tab. These items move from the grimoire tab to the settings tab:

- Character visibility
- Night order
- Zoom
- Background image
- Custom image opt-in
- Disable animations
- Sound mute
- Language

The grimoire tab keeps game/grimoire actions such as night/day switching, story log, game record, and spectator player name changes.

## Status Effect Toggle

The settings tab adds a local "status effects" toggle for drunk and poisoned token effects. It defaults to enabled and persists in local storage. Turning it off only suppresses drunk/poisoned visual classes; reminder tokens and all game data remain unchanged.

Night navigation yellow highlighting remains highest priority and is not disabled by this setting.

## Testing

Source-level tests will cover:

- Settings menu migration and i18n keys.
- Local persistence for the status effect toggle.
- Player classes respecting the status effect toggle while keeping night priority.
- Role assignment calling bluff auto-fill logic and generating two townsfolk plus one outsider when possible.
