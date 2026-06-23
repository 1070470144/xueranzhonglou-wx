# Web Role Library Design

## Goal

Add a web role library under the "My" menu. Users can browse official roles from the existing knowledge base, create personal custom roles from a single role JSON object, manage those custom roles from "My Uploads", and use custom roles in Script Creator.

## Approach

- Official roles continue to come from `ai-admin-service.listKnowledgeRoles`.
- Custom roles use new `script-service` methods backed by a user-owned `user-roles` collection.
- "Role List" is a new modal for browsing official/custom roles, filtering by source, team, and keyword, and creating custom roles.
- "My Uploads" gains tabs for scripts and roles. Each tab keeps separate pagination state and lazy loads only when opened.
- Script Creator loads official roles plus the current user's custom roles. Official roles export as IDs when available; custom roles export as full role objects through the existing `buildScriptJson` flow.

## Data Shape

Custom role documents store the normalized role JSON plus ownership metadata:

- `roleId`, `id`, `name`, `ability`, `team`, `image`, `iconUrl`
- optional night order fields such as `firstNight`, `otherNight`, reminders, and arbitrary extra role JSON fields
- `ownerUserId`, `ownerNickname`, `source: "user_custom"`, `status: "active"`
- `searchText`, `createTime`, `updateTime`

Role creation requires login and a JSON object with at least a role id, name, and team. The backend rejects duplicate custom role ids for the same user.

## UX

- Gear menu > My adds `Role List`.
- Role List has source tabs `All / Official / Custom`, a team filter, search, refresh, and a create button.
- Create opens a second modal with a JSON textarea. Submitting creates the role immediately and refreshes custom results.
- My Uploads has `Scripts / Roles` tabs. The roles tab lists custom roles with view and delete actions.
- Role detail views show all role images and parsed fields without raw JSON unless the create form is being used.

## Verification

- Build the web app after changes.
- Exercise role creation, role lazy loading, role deletion, and Script Creator custom-role selection from the UI or direct service calls where local cloud access is unavailable.
