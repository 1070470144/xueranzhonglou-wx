const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const modalSource = fs.readFileSync(
  path.join(__dirname, "../src/components/modals/ReminderModal.vue"),
  "utf8",
);

assert(
  modalSource.includes("smallTokenFields"),
  "Reminder modal should define all JSON small-token field aliases",
);
[
  "smallTokens",
  "tokenImages",
  "tokens",
  "smallToken",
  "tokenImage",
  "tokenUrl",
].forEach((field) => {
  assert(
    modalSource.includes(`"${field}"`),
    `Reminder modal should read role.${field} when building small token reminders`,
  );
});

assert(
  modalSource.includes("mapSmallTokenReminders(role)") &&
    modalSource.includes("...mapSmallTokenReminders(role)"),
  "Available reminders should include image-backed small tokens from role JSON",
);

assert(
  /isSmallToken:\s*true/.test(modalSource) &&
    /return tokens\.map\(\(\{ token, image \}, index\) => \(\{[\s\S]*image,[\s\S]*isSmallToken:\s*true/.test(
      modalSource,
    ),
  "Small token reminders should keep image data so the plus panel and placed token can render it",
);

assert(
  /const seenSmallTokenImages\s*=\s*new Set/.test(modalSource),
  "Small token reminders should dedupe repeated aliases like smallTokens and tokenImages",
);

const scriptSource = modalSource
  .slice(
    modalSource.indexOf("<script>") + "<script>".length,
    modalSource.indexOf("export default"),
  )
  .replace(/^import .+;\r?\n/gm, "");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${scriptSource}
globalThis.__mapSmallTokenReminders = mapSmallTokenReminders;
`,
  sandbox,
);

const reminders = sandbox.__mapSmallTokenReminders({
  id: "customalpha",
  name: "Custom Alpha",
  imageAlt: "custom",
  smallTokens: [
    { name: "Marked", image: "https://example.com/marked.png" },
    "https://example.com/string-token.png",
  ],
  tokenImages: ["https://example.com/marked.png"],
  tokens: [
    { label: "Label Token", url: "https://example.com/label.png" },
    { text: "Path Token", path: "https://example.com/path.png" },
  ],
  smallToken: "https://example.com/string-token.png",
});

assert.strictEqual(
  JSON.stringify(reminders.map((reminder) => reminder.image)),
  JSON.stringify([
    "https://example.com/marked.png",
    "https://example.com/string-token.png",
    "https://example.com/label.png",
    "https://example.com/path.png",
  ]),
  "Small token aliases should be flattened and deduped by image URL",
);
assert.strictEqual(
  JSON.stringify(reminders.map((reminder) => reminder.name)),
  JSON.stringify(["Marked", "Custom Alpha 2", "Label Token", "Path Token"]),
  "Small token reminders should prefer token names and otherwise use the role name",
);
assert(
  reminders.every(
    (reminder) => reminder.isSmallToken && reminder.role === "customalpha",
  ),
  "Small token reminders should be marked and keep the source role id",
);

console.log("reminder small token source tests passed");
