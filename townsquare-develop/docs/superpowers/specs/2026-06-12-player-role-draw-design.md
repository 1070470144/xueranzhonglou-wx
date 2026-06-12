# Player Role Draw Design

## Scope

Add an optional simulated role draw flow for room games. When enabled, the storyteller still chooses the roles for the game, but players draw from that configured role pool instead of receiving pre-assigned roles immediately.

The existing direct role assignment and send behavior remains the default when the setting is off.

## Storyteller Settings

The settings menu adds a local toggle for simulated player role draw. The i18n label is "模拟玩家抽取角色". When disabled, the app uses the current flow: assign roles to seats, then send those assigned roles.

When enabled, the storyteller can start a draw from the room control drawer after choosing the script roles. Before starting, the storyteller chooses:

- Start seat number.
- Direction: forward or reverse.
- Whether the storyteller can manually draw for the current player. Default: on.
- Auto-draw timeout. Default: off, with 30 seconds as the default duration when enabled.

The start button validates that the configured role pool has exactly one role for each eligible non-traveler seated player. If the counts do not match, the draw does not start and the storyteller is asked to fix the role selection first.

## Draw Queue

The draw queue is generated from seated non-traveler players, starting at the selected seat number and moving in the selected direction. Empty seats and traveler seats are skipped.

Only the current queue entry may draw. After a successful draw, the flow advances to the next undrawn player. When every queued player has drawn, the draw ends automatically.

If the current player disconnects, the queue stays on that player. When manual draw is enabled, the storyteller can draw for that player; otherwise the flow waits for the player to reconnect or for auto draw to expire.

## Player Experience

When it is a player's turn, the player client shows a left-side draw invitation panel, following the voice invitation interaction pattern. The panel includes:

- A title using the "轮到你抽取角色" i18n label.
- The number of roles remaining.
- A countdown when auto-draw is enabled.
- A primary button using the "抽取角色" i18n label.

Players who are not currently allowed to draw do not see the draw invitation. The room control drawer shows passive draw progress to all room participants.

Clicking the draw button randomly selects one role from the remaining storyteller-configured pool, removes it from the pool, assigns it to that player's seat, and hides the invitation.

## Storyteller Controls

During an active draw, the room control drawer shows:

- The current player.
- Remaining role count.
- Draw direction and start seat.
- Draw progress.
- A button using the "帮当前玩家随机抽取" i18n label when manual storyteller draw is enabled.
- Countdown status when auto-draw is enabled.

Manual draw uses the same role pool and assignment path as player draw. It stops the current countdown and immediately advances to the next queued player.

## Auto Draw

When auto-draw is enabled, each turn starts a countdown. If the player draws before the timer ends, the timer is cleared. If time expires, the system draws one random role for the current player automatically.

Auto draw never creates a new random role list. It only consumes one role from the storyteller-configured pool.

## State and Synchronization

The draw state is part of room-synchronized game state so storyteller and player clients agree on:

- Whether a draw is active.
- The remaining role pool.
- Queue order and current queue index.
- Which seats have already drawn.
- Draw settings for direction, start seat, manual draw, and auto draw.

The actual role assignment continues to use the existing player role mutation and socket sync path so downstream features such as night order, story log, reminders, and private role delivery keep working.

## Completion and Cancellation

The draw completes automatically when all queued players have roles. Clearing players, clearing roles, changing the role pool, leaving the room, or starting a new assignment cancels any active draw.

After completion, the draw flow triggers the same private-role send used by the existing flow so each seated player receives their assigned role. The storyteller can still use the existing send-character action again later.

## Testing

Source-level tests should cover:

- Settings menu toggle and persistence.
- Starting a draw only when role pool and eligible player counts match.
- Queue generation from arbitrary start seats in forward and reverse order.
- Player draw consuming one role, assigning it to the current seat, and advancing the queue.
- Storyteller manual draw using the same path as player draw.
- Auto draw firing after the configured timeout and not firing after a player/manual draw.
- Existing direct role assignment behavior remaining unchanged when the setting is off.
