# Miniapp Carpool Feature Design

## Goal

Add a Blood on the Clocktower carpool board in the `xueran` mini program so players can post, browse, filter, and join online or offline game sessions by region, script, and time.

## Scope

- Modify the `xueran` mini program first.
- Keep the feature centered on listing and joining sessions.
- Support city/district region filtering, script filtering, time filtering, and online/offline filtering.
- Require a join request first, then let the host confirm before contact details are revealed.
- Do not add automated matching, chat, payments, or calendar sync in the first version.
- Add lightweight entry points on the home page and tool page so users can reach the carpool board quickly.

## Product Shape

The feature is a board of session posts rather than a matchmaking engine.

Users can:

- browse active carpool posts
- filter by city/district, script, time, and online/offline
- open a post to see full details
- send a join request
- view the status of their own posts and requests

Hosts can:

- create a post
- review join requests
- confirm or reject requests
- reveal contact details only after confirmation

## Recommended Approach

Use a board-style flow as the first release.

Why this approach:

- it matches the current mini program's content browsing model
- it is easy to understand for both hosts and players
- it keeps the first release small enough to ship and validate

Two other possible directions were considered:

1. Smart matching, where the system recommends sessions automatically.
2. Channel-based grouping, where each script or region has a persistent room.

Both are valid later, but they are heavier than needed for the first pass.

## Core User Flow

### Browse

The entry page shows a list of active carpool posts.

Each card should show:

- script name
- region
- start time
- online or offline
- current player count / target count
- short status such as open, full, or pending confirmation

### Filter

The filter bar supports:

- city / district
- time
- script
- online / offline

The publish form uses a concrete start time. The board filter can offer quick date ranges such as today, tomorrow, this week, and custom date.

### Post

The publish form should collect:

- title
- city
- district
- start time
- script
- online / offline
- player count
- notes

The first release should also include:

- beginner friendly
- host needed
- fee notes
- waiting list enabled
- contact method, hidden until the host confirms a request

### Join

Players submit a join request from the detail page.

The host then sees a request list and can:

- confirm
- reject
- cancel the post if needed

Only after confirmation should the post reveal contact information or group entry information.

## Data Model

Posts and join requests should have separate status models.

Post status:

- `open`: accepting requests
- `full`: no more requests
- `closed`: ended, cancelled, or manually closed by the host

Request status:

- `pending`: waiting on host review
- `confirmed`: accepted by the host
- `rejected`: rejected by the host
- `cancelled`: cancelled by the requester

Suggested fields:

- `regionCity`
- `regionDistrict`
- `scriptId`
- `scriptName`
- `startTime`
- `mode` (`online` / `offline`)
- `playerCount`
- `joinedCount`
- `status`
- `hostId`
- `hostName`
- `notes`
- `beginnerFriendly`
- `needStoryteller`
- `feeNotes`
- `waitingListEnabled`
- `contactMethod`

Join requests should store:

- `postId`
- `requesterId`
- `requesterName`
- `status`
- `requestTime`
- `confirmedTime`

The client should only show `contactMethod` to the host and confirmed requesters.

## Screens

### Board Page

This is the main entry.

It should be optimized for scanning, not storytelling. The first screen should show the list and filters immediately.

### Publish Page

A compact form for creating a new post.

### Detail Page

Shows the full post, current participants, request button, and host controls.

### My Page

Shows:

- my posts
- my requests
- confirmed requests
- closed posts

## Entry Points

### Home Page

The home page should add two quick-join modules:

- `Recent` sessions: a small feed of the newest open posts
- `Hot` sessions: a small feed of the most active or most requested posts

Each module should show a compact list item with:

- script name
- region
- time
- online or offline
- player count

Tap behavior:

- tap a list item to open the session detail page
- tap the module header to open the full board filtered to that category

These modules should feel like shortcuts, not a replacement for the full board.

### Tool Page

Add a `Carpool` entry to the existing tool list so users can reach the board from the utility hub.

The entry should open the same carpool board landing page as the home shortcuts.

## Error Handling

- If a user is not logged in, disable publish and join actions and route them to login.
- If a post is full, block new requests and show a short full-state message.
- If a request is already pending or confirmed, prevent duplicate requests.
- If a host closes a post, remove it from the open list but keep it in history.

## Verification

- Confirm the board page fits the current mini-program navigation and style.
- Confirm the publish form stays short enough for mobile use.
- Confirm join requests cannot jump straight to contact disclosure.
- Confirm the data shape is small enough to support list filtering without extra complexity.
