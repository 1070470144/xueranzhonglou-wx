const assert = require("assert");
const fs = require("fs");
const path = require("path");

const modalPath = path.join(__dirname, "../src/components/modals/RoomLobbyModal.vue");
const controlPath = path.join(__dirname, "../src/components/RoomControlDrawer.vue");
const appSource = fs.readFileSync(path.join(__dirname, "../src/App.vue"), "utf8");
const modalSource = fs.readFileSync(modalPath, "utf8");
const controlSource = fs.existsSync(controlPath) ? fs.readFileSync(controlPath, "utf8") : "";

[
  "room-lobby",
  "room-toolbar",
  "room-heading",
  "create-button",
  "room-actions",
  "room-empty",
  "room-badge",
  "room-lobby-grid",
  "room-list-column",
  "room-preview-panel",
  "selectedPreviewRoom",
  "previewRoom",
  "selectPreviewRoom",
  "room-row-card",
  "room-empty-illustration",
  "filteredRooms",
  "roomsPerPage",
  "pagedRooms",
  "totalPages",
  "currentPage",
  "goToPage",
  "roomSearch",
  "visibilityFilter",
  "hostName",
  "room.status",
  "hostDisplayName",
  "guestHostName",
  "maxPlayers",
  "normalizeMaxPlayers",
  "room.note",
  "create-note-field",
  "create-basic-row",
  "create-script-action",
  "room-note-cell",
  "room.showCreate",
  "mode === 'list'",
  "room.joinRoom",
  "room.connectedPlayers",
  '"openModalOverlay", "edition"',
  "createRoom()",
  "invalid_room_name",
  "password_required",
  "joinRoom()",
  "updateRoom()",
  "kick(playerId)",
  "room/requestList",
  "room/create",
  "room/join",
  "room/update",
  "room/kick"
].forEach(needle => assert(modalSource.includes(needle), `missing ${needle}`));

assert(!modalSource.includes("padding-right: 58px"), "toolbar should not rely on a narrow padding next to modal controls");

assert(!modalSource.includes("room.scriptJson"), "room lobby should not ask users to paste JSON");
assert(!modalSource.includes("scriptJson"), "room lobby should not manage raw script JSON");
assert(!modalSource.includes("锛"), "room lobby should not contain mojibake punctuation");

assert(!modalSource.includes("room-list-header"), "room lobby should no longer render a table header");

assert(modalSource.includes("<span>钟楼大厅</span>"), "room lobby topline should use the shorter hall label");
assert(!modalSource.includes("线上集会 · 钟楼大厅"), "room lobby topline should not show the old gathering prefix");

assert(!modalSource.includes("hall-footer-note"), "room lobby list tools should not show the spectator explanatory note");
assert(!modalSource.includes('grid-area: note'), "room lobby list tools should not reserve a note row");
assert(!modalSource.includes("footer-join-placeholder"), "room lobby toolbar should not render a non-functional join placeholder");
assert(
  modalSource.includes("--hall-glass-panel") &&
    modalSource.includes("--hall-glass-surface") &&
    modalSource.includes("--hall-glass-core") &&
    !/\.room-lobby-list\s*\{[\s\S]*?opacity\s*:/.test(modalSource),
  "room lobby should use transparent surfaces around the hall without fading text and controls"
);
assert(
  modalSource.includes('class="button icon-button hall-refresh" @click="refresh"'),
  "room lobby toolbar should keep the functional refresh action"
);

assert(
  modalSource.includes("{ 'room-lobby-list': mode === 'list' || mode === 'create' || mode === 'join' }") &&
    modalSource.includes('v-if="mode === \'list\' || mode === \'create\' || mode === \'join\'"') &&
    modalSource.includes('class="room-submodal-layer"') &&
    modalSource.includes('@click.self="backToList"'),
  "room creation should be a secondary overlay above the hall list, not a full modal replacement"
);

const createTitleBlock = modalSource.match(/<div class="create-room-title">([\s\S]*?)<\/div>\s*<p v-if="room\.error"/);
assert(createTitleBlock, "room creation should render a dedicated title bar");
assert(
  createTitleBlock[1].includes('class="button icon-button create-room-close"') &&
    createTitleBlock[1].includes('@click="backToList"') &&
    (createTitleBlock[1].includes('icon="times"') || createTitleBlock[1].includes('icon="times-circle"')) &&
    !createTitleBlock[1].includes('icon="undo"') &&
    !createTitleBlock[1].includes('icon="sync-alt"'),
  "room creation title bar should only keep a top-right close button"
);

assert(
  modalSource.includes('class="room-section room-form create-room-form"') &&
    modalSource.includes('class="create-room-scroll"') &&
    modalSource.includes('class="create-room-footer"') &&
    modalSource.includes('class="create-field-grid"') &&
    modalSource.includes('class="create-basic-row"') &&
    modalSource.includes('create-name-field') &&
    modalSource.includes('create-host-field') &&
    modalSource.includes('create-player-count-field') &&
    modalSource.includes('create-note-field') &&
    modalSource.includes('create-room-error') &&
    modalSource.includes('create-script-card') &&
    modalSource.includes('create-primary-action'),
  "room creation view should use a dedicated hall-style register layout"
);

assert(
  /<div class="create-room-scroll">[\s\S]*?class="create-field-grid"[\s\S]*?class="room-script-row script-card create-script-card"[\s\S]*?<\/div>\s*<div class="create-room-footer">[\s\S]*?create-primary-action/.test(modalSource),
  "private room creation should keep the create button in a fixed footer below the scrollable fields"
);

assert(
  modalSource.includes('class="create-room-scroll join-room-scroll"') &&
    modalSource.includes('class="create-room-footer join-room-footer"') &&
    /<div class="create-room-scroll join-room-scroll">[\s\S]*?selected-room-card[\s\S]*?joinForm\.playerName[\s\S]*?joinForm\.password[\s\S]*?<\/div>\s*<div class="create-room-footer join-room-footer">[\s\S]*?@click="joinRoom"/.test(modalSource),
  "private room join should keep the join button in a fixed footer below the scrollable fields"
);

assert(
  /<div class="create-basic-row">[\s\S]*?create-name-field[\s\S]*?create-host-field[\s\S]*?<\/div>/.test(modalSource),
  "room name and storyteller fields should share the first row in the create dialog"
);

assert(
  !/<div class="field-block featured-field create-name-field">/.test(modalSource),
  "room name field should not keep featured-field styling when it is paired with storyteller"
);

assert(
  /\.create-basic-row\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(modalSource) &&
    /\.create-basic-row \.field-block\s*\{[\s\S]*?align-content:\s*center;[\s\S]*?min-height:\s*5\.1em/.test(modalSource) &&
    /\.create-basic-row \.field-block\s*\{[\s\S]*?grid-template-rows:\s*max-content 2\.5em/.test(modalSource) &&
    /\.create-basic-row \.field-block label\s*\{[\s\S]*?margin:\s*0;[\s\S]*?line-height:\s*1;/.test(modalSource) &&
    /\.create-basic-row \.field-block input,[\s\S]*?\.create-basic-row \.readonly-field\s*\{[\s\S]*?height:\s*2\.5em;[\s\S]*?min-height:\s*2\.5em/.test(modalSource) &&
    /\.create-basic-row \.readonly-field\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;/.test(modalSource),
  "room name and storyteller fields should use equal column width, label rhythm, block height, and input height"
);

assert(
  modalSource.includes('class="button create-script-action" @click="chooseScript"') &&
    modalSource.includes('$t("room.script")') &&
    modalSource.includes('$t("room.chooseScript")') &&
    modalSource.includes('this.$store.commit("openModalOverlay", "edition")') &&
    /\.create-script-card\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) max-content;[\s\S]*?grid-template-rows:\s*max-content max-content/.test(modalSource) &&
    /\.create-script-card > span\s*\{[\s\S]*?grid-column:\s*1 \/ -1/.test(modalSource) &&
    /\.create-script-action\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*2;[\s\S]*?justify-self:\s*end;[\s\S]*?align-self:\s*end/.test(modalSource) &&
    !modalSource.includes('room.scriptAutoUse'),
  "create dialog script area should place the choose script action in the bottom-right corner"
);

assert(
  modalSource.includes('type="number"') &&
    modalSource.includes(':min="1"') &&
    modalSource.includes(':max="20"') &&
    modalSource.includes('updateCreate(\'maxPlayers\'') &&
    modalSource.includes('maxPlayers: this.normalizeMaxPlayers(this.room.createForm.maxPlayers)'),
  "room creation should let hosts choose a player count capped at 20 and submit the normalized value"
);

assert(
  modalSource.includes('<span>{{ $t("room.note") }}</span>') &&
    modalSource.includes('class="room-note-cell"') &&
    modalSource.includes(':title="item.note"') &&
    modalSource.includes('item.note || "-"'),
  "room lobby should render a dedicated note column with clipped text and full hover text"
);

assert(
  modalSource.includes(':value="createForm.note"') &&
    modalSource.includes('maxlength="80"') &&
    modalSource.includes("updateCreate('note'") &&
    modalSource.includes('note: current.note || ""') &&
    modalSource.includes('item.note'),
  "room creation and management should edit notes and include notes in lobby search"
);

assert(
  modalSource.includes('v-if="room.error && mode !== \'create\'"') &&
    modalSource.includes('v-if="room.error" class="room-error create-room-error"'),
  "room creation errors should appear inside the secondary create dialog"
);

assert(
  /\.create-room-form\s*\{[\s\S]*?--create-form-panel:[\s\S]*?border:\s*2px solid #3d2e26;[\s\S]*?background:\s*var\(--create-form-panel\)/.test(modalSource) &&
    /\.create-field-grid\s*\{[\s\S]*?grid-template-columns:[\s\S]*?border:\s*1px solid #3d2e26/.test(modalSource) &&
    /\.create-primary-action\s*\{[\s\S]*?border:\s*1px solid #d4af37;[\s\S]*?background:\s*linear-gradient/.test(modalSource),
  "room creation view should visually match the room list surface and gold action style"
);

assert(
  /\.room-submodal-layer\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?place-items:\s*center;[\s\S]*?\}/.test(modalSource) &&
    /\.create-room-form\s*\{[\s\S]*?width:\s*min\(560px,\s*calc\(100vw - 2\.5em\)\);/.test(modalSource) &&
    /\.create-room-form\s*\{[\s\S]*?grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto;/.test(modalSource) &&
    /\.create-room-form\s*\{[\s\S]*?height:\s*min\(620px,\s*calc\(100vh - 7em\)\);/.test(modalSource) &&
    /\.create-room-form\s*\{[\s\S]*?max-height:\s*calc\(100vh - 7em\);/.test(modalSource) &&
    /\.room-lobby \.create-room-form\s*\{[\s\S]*?gap:\s*0;/.test(modalSource) &&
    /\.create-room-title\s*\{[\s\S]*?grid-row:\s*1;[\s\S]*?position:\s*relative;[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;/.test(modalSource) &&
    /\.create-room-error\s*\{[\s\S]*?grid-row:\s*2;/.test(modalSource) &&
    /\.create-room-scroll\s*\{[\s\S]*?grid-row:\s*3;[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/.test(modalSource) &&
    /\.create-room-footer\s*\{[\s\S]*?grid-row:\s*4;[\s\S]*?position:\s*relative;[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*flex-end;/.test(modalSource) &&
    /\.create-room-close\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*0\.65em;[\s\S]*?top:\s*50%;/.test(modalSource),
  "room creation overlay should be compact, centered, and sized like a secondary dialog"
);

assert(
  modalSource.includes('class="room-filter-heading"') && modalSource.includes('class="hall-filter-trigger"'),
  "room visibility filter should share the same visual style as the table headings"
);

assert(
  modalSource.includes('.hall-filter-trigger:focus') &&
    modalSource.includes('box-shadow: none') &&
    modalSource.includes('line-height: 1'),
  "room visibility filter should align with header text and suppress the blue focus ring"
);

assert(
  /\.room-register-bar > span\s*\{[\s\S]*?display:\s*flex;[\s\S]*?height:\s*100%;[\s\S]*?align-items:\s*center;[\s\S]*?line-height:\s*1;[\s\S]*?\}/.test(modalSource) &&
    /\.room-filter-heading\s*\{[\s\S]*?height:\s*100%;[\s\S]*?align-self:\s*stretch;[\s\S]*?\}/.test(modalSource),
  "room register headings should share one vertical alignment model so the visibility column does not sit taller"
);

assert(
  /\.hall-filter-trigger span\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?\}/.test(modalSource) &&
    !/\.room-register-bar span\s*\{/.test(modalSource),
  "room visibility label should stay on one line and not inherit header-cell layout"
);

assert(!modalSource.includes('<select v-model="visibilityFilter"'), "room visibility header should not use a native select control");
assert(
  modalSource.includes('class="hall-filter-trigger"') &&
    modalSource.includes('class="room-filter-menu"') &&
    modalSource.includes('v-for="option in visibilityOptions"') &&
    modalSource.includes('setVisibilityFilter(option.value)'),
  "room visibility header should use a custom dropdown that does not change header height"
);

assert(
  modalSource.includes('class="button pagination-prev"') &&
    modalSource.includes('class="pagination-pages"') &&
    modalSource.includes('class="button pagination-next"') &&
    modalSource.includes('grid-template-columns: max-content minmax(0, 1fr) max-content'),
  "pagination arrows should sit at the far left and far right of the list footer"
);

assert(
  modalSource.indexOf("room-list-column") < modalSource.indexOf("room-preview-panel"),
  "room lobby should render list column before preview panel"
);

assert(
  modalSource.includes('v-for="item in pagedRooms"') && modalSource.includes("selectPreviewRoom(item)"),
  "room rows should select a preview room"
);

assert(
  modalSource.includes("roomsPerPage: 50") && modalSource.includes("filteredRooms.slice(start, start + this.roomsPerPage)"),
  "room lobby should paginate rooms with 50 rooms per page"
);

assert(
  modalSource.includes("filterRoom(item)") && modalSource.includes("item.hostName"),
  "room lobby search should include storyteller names"
);

assert(appSource.includes("<RoomLobbyModal />"));
assert(appSource.includes('import RoomLobbyModal from "@/components/modals/RoomLobbyModal";'));

[
  "room-control-drawer",
  "roomControl",
  "room.isHost",
  "copySessionUrl",
  "chooseScript",
  "assignRoles",
  "distributeRoles",
  "clearRoles",
  "clearPlayers",
  "setRoomStatus",
  "updateRoomNote",
  "saveRoomNote",
  "room.createForm.note",
  "room.waiting",
  "room.playing"
].forEach(needle => assert(controlSource.includes(needle), `missing room control ${needle}`));

assert(appSource.includes("<RoomControlDrawer />"));
assert(appSource.includes('import RoomControlDrawer from "@/components/RoomControlDrawer";'));

console.log("room ui source tests passed");
