const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "..", "src", "services", "bluffs.js");
const source = fs.readFileSync(sourcePath, "utf8");
const transformed = `${source.replace(/export const (\w+) =/g, "const $1 =")}
module.exports = { serializeBluffs, hydrateBluffs, buildBluffMessages };`;
const moduleRef = { exports: {} };

Function("module", transformed)(moduleRef);

const { serializeBluffs, hydrateBluffs, buildBluffMessages } = moduleRef.exports;

const official = { id: "washerwoman", name: "洗衣妇" };
const empty = {};
const custom = { id: "customrole", name: "自定义", isCustom: true };

const serialized = serializeBluffs([official, empty, custom]);
if (JSON.stringify(serialized) !== JSON.stringify([{ id: "washerwoman" }, custom])) {
  throw new Error(`Unexpected serialized bluffs: ${JSON.stringify(serialized)}`);
}

const roles = new Map([["washerwoman", official]]);
const hydrated = hydrateBluffs([{ id: "washerwoman" }, custom], roles);
if (hydrated[0] !== official || hydrated[1] !== custom) {
  throw new Error("Hydrated bluffs did not use known roles and preserve custom roles");
}

const messages = buildBluffMessages(
  [
    { id: "demon-a", role: { team: "demon" } },
    { id: "outsider", role: { team: "outsider" } },
    { id: "demon-b", role: { team: "demon" } }
  ],
  [{ id: "ravenkeeper" }],
  [{ id: "imp" }],
  2
);
const expected = {
  "demon-a": ["lunaticBluffs", [{ id: "ravenkeeper" }]],
  "demon-b": ["lunaticBluffs", [{ id: "imp" }]]
};
if (JSON.stringify(messages) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected bluff messages: ${JSON.stringify(messages)}`);
}

console.log("bluffs service tests passed");
