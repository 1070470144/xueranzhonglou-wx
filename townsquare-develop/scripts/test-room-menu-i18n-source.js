const assert = require("assert");
const fs = require("fs");
const path = require("path");

const menuSource = fs.readFileSync(path.join(__dirname, "../src/components/Menu.vue"), "utf8");
const i18nSource = fs.readFileSync(path.join(__dirname, "../src/i18n/index.js"), "utf8");

[
  "room.openLobby",
  "toggleModal('roomLobby')",
  "toggleModal('roomControl')",
  "room.manage",
  "room.current"
].forEach(needle => assert(menuSource.includes(needle), `missing ${needle}`));

assert(
  menuSource.includes("isRoomSession()") || menuSource.includes("isRoomSession {"),
  "menu should expose an isRoomSession helper"
);

const templateSource = menuSource.slice(
  menuSource.indexOf("<template>"),
  menuSource.indexOf("</template>")
);

[
  "menu.copyPlayerLink",
  "menu.sendCharacters",
  "menu.randomize",
  "menu.selectScript",
  "menu.chooseAssign",
  "menu.addFabled"
].forEach(needle => assert(!templateSource.includes(needle), `${needle} should be removed from gear menu`));

assert(!templateSource.includes('tab === \'players\''), "players tab should be removed from gear menu");
assert(!templateSource.includes('tab === \'characters\''), "characters tab should be removed from gear menu");
assert(!templateSource.includes('tab = \'players\''), "players tab icon should be removed from gear menu");
assert(!templateSource.includes('tab = \'characters\''), "characters tab icon should be removed from gear menu");

[
  "room:",
  "title:",
  "Room Lobby",
  "房间大厅",
  "showCreate",
  "chooseScript",
  "roomControl",
  "copyPlayerLink",
  "roomSettings",
  "dangerActions",
  "room_not_found",
  "invalid_password",
  "invalid_script_json",
  "kicked",
  "closed"
].forEach(needle => assert(i18nSource.includes(needle), `missing ${needle}`));

console.log("room menu i18n source tests passed");
