const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const modalSource = read("src/components/modals/Modal.vue");
const appSource = read("src/App.vue");
const loginSource = read("src/components/modals/LoginModal.vue");
const playerNameSource = read("src/components/modals/PlayerNameModal.vue");
const announcementSource = read("src/components/modals/AnnouncementModal.vue");
const gameRecordSource = read("src/components/modals/GameRecordModal.vue");
const storyLogSource = read("src/components/modals/StoryLogModal.vue");
const voteHistorySource = read("src/components/modals/VoteHistoryModal.vue");
const gameStateSource = read("src/components/modals/GameStateModal.vue");

assert(
  modalSource.includes("--modal-panel") &&
    modalSource.includes("--modal-surface") &&
    modalSource.includes("--modal-line") &&
    modalSource.includes("#3d2e26") &&
    modalSource.includes("#dcc4a1") &&
    modalSource.includes("font-family: \"STKaiti\", \"KaiTi\", \"STSong\", \"SimSun\", serif"),
  "base modal should expose the same clocktower visual tokens as the room lobby"
);

assert(
  /\.modal\s*\{[\s\S]*?border:\s*2px solid var\(--modal-line\);[\s\S]*?border-radius:\s*2px;[\s\S]*?background:\s*var\(--modal-panel\)/.test(modalSource) &&
    /> \.slot\s*\{[\s\S]*?padding:\s*1em;[\s\S]*?overflow:\s*auto;/.test(modalSource) &&
    /h3\s*\{[\s\S]*?color:\s*#fff8e7;[\s\S]*?letter-spacing:\s*0\.1em;/.test(modalSource),
  "base modal should use a compact framed panel, padded scrollable body, and unified headings"
);

assert(
  /\.button\s*\{[\s\S]*?border:\s*1px solid #8b6508;[\s\S]*?border-radius:\s*2px;[\s\S]*?background:\s*#2a1c09;/.test(appSource) &&
    /&\.demon\s*\{[\s\S]*?border-color:\s*#d4af37;[\s\S]*?background:\s*linear-gradient/.test(appSource) &&
    /&\.townsfolk\s*\{[\s\S]*?border-color:\s*#5f789f;/.test(appSource),
  "global buttons should use the shared hard-edged gold/dark action style"
);

assert(
  loginSource.includes(".web-login") &&
    loginSource.includes("border: 1px solid #3d2e26") &&
    loginSource.includes("background: rgba(18, 15, 13, 0.86)") &&
    playerNameSource.includes(".player-name-modal") &&
    playerNameSource.includes("border: 1px solid rgba(124, 94, 70, 0.88)"),
  "login and player-name forms should use the shared modal field treatment"
);

assert(
  announcementSource.includes("border: 1px solid #3d2e26") &&
    announcementSource.includes("background: rgba(18, 15, 13, 0.86)") &&
    announcementSource.includes("border-radius: 2px") &&
    voteHistorySource.includes("border: 1px solid #3d2e26") &&
    gameStateSource.includes("border: 1px solid rgba(124, 94, 70, 0.88)"),
  "record/list utility modals should inherit the clocktower table and field treatment"
);

assert(
  gameRecordSource.includes("--record-panel") &&
    gameRecordSource.includes("border: 2px solid #3d2e26") &&
    storyLogSource.includes("--story-panel") &&
    storyLogSource.includes("border-left: 2px solid #3d2e26"),
  "custom drawer/panel modals should use matching clocktower panel tokens"
);

console.log("modal style source tests passed");
