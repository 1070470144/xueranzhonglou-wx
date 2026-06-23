# Settings and AI Role Icon Design

## Goal

Add a Townsquare settings entry that replaces the current top-right "My" identity label with "Settings" and opens a modal for profile and AI configuration. The same AI configuration must be shared with the existing mini-program and admin backend instead of creating a separate Townsquare-only API key store.

## Existing Context

The workspace has one shared uniCloud backend. The mini-program already uses `ai-service.getUserConfig` and `ai-service.saveUserConfig` to read and write personal AI settings. The backend stores default admin settings in `ai-configs` and personal user settings in `user-ai-configs`.

Both existing schemas already support:

- `enabled`
- `provider`
- `baseUrl`
- `model`
- `apiKey`

The existing cloud function masks the API key before returning config to clients and preserves the previous key when a masked value is submitted.

## Product Behavior

The top-right menu should show "Settings" instead of using the user nickname as the visible entry label. Opening it shows a modal with a left navigation column and a right content area.

The modal has two sections:

- Profile: edit nickname and avatar using the existing auth/user profile patterns.
- AI config: edit the user's personal AI settings.

The AI config form should include:

- Enable personal AI config
- Provider, default `openai-compatible`
- Base URL for the user's relay/proxy service
- API Key
- Chat model, default `gpt-4o-mini`
- Image model, default `gpt-image-2`

The form must make it clear through UI state, not long instructional text, that leaving a masked API key unchanged preserves the stored key.

## Data Ownership

Townsquare must not store API keys in local storage or in a separate Townsquare table. It should call the shared backend and reuse `user-ai-configs`.

The backend should extend the existing AI config shape with `imageModel`. Admin default config can also support `imageModel` so users without personal AI settings can still generate role icons if the global backend config is enabled.

Resolution order for icon generation should match AI Q&A:

1. Enabled personal config with `baseUrl`, `apiKey`, and `imageModel`.
2. Enabled admin default config with `baseUrl`, `apiKey`, and `imageModel`.
3. Return a clear configuration error.

The existing `model` field remains the chat model. `imageModel` is only for image generation.

## Role Icon Generation

The role library creation/editing flow should add an AI icon action for custom roles. The user can generate an icon from the current role fields, preview it, then apply it to that role.

The frontend sends role metadata only:

- Chinese name
- English id/name when available
- Team/type
- Ability text
- Reminder tokens if useful

The backend builds the prompt and calls the image endpoint through the configured relay/base URL. The returned image should be uploaded or persisted through the existing backend/storage flow before being applied to the role `image`/`icon` field, so the role keeps working after refresh.

Generated icons should target the existing token style: centered, high-contrast Blood on the Clocktower-like role icon, transparent or clean background when supported, no extra text in the image.

## Components and Interfaces

Townsquare frontend:

- Add a `SettingsModal` component registered with the existing modal system.
- Update `Menu.vue` so the top-right entry opens the settings modal and displays the localized settings label.
- Add a small AI service wrapper in `townsquare-develop/src/services/` for shared `ai-service` calls.
- Extend the role library modal with generate, preview, apply, loading, and error states.

Shared backend:

- Extend `ai-service.getUserConfig` and `saveUserConfig` to include `imageModel`.
- Add a role icon generation method to `ai-service`.
- Extend `ai-configs` and `user-ai-configs` schemas with `imageModel`.

Admin backend:

- Extend the default AI config page with `imageModel`, default `gpt-image-2`.

## Error Handling

If the user is not logged in, the settings modal can show profile login state and disable AI save/generation actions.

If AI is not configured, icon generation should fail with a short actionable error.

If the relay or model fails, show the backend error without exposing the API key.

If generated image persistence fails, do not overwrite the existing role icon.

## Testing and Verification

Add focused source-level tests or scripts for:

- Settings modal registration and menu trigger.
- AI service wrapper exposing get/save config and role icon generation.
- Backend config public shape includes masked API key and `imageModel`.
- Role library AI icon UI has generate, preview, and apply states.

Run the relevant Townsquare verification commands from `townsquare-develop/`, especially lint. For uni-app cloud function changes, use syntax checks where practical and document any HBuilderX-only verification that cannot run in this environment.
