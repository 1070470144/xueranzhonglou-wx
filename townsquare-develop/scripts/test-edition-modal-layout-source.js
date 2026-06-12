const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src/components/modals/EditionModal.vue"),
  "utf8",
);

assert(
  /::v-deep \.modal\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?height:\s*min\(82vh,\s*620px\);/.test(
    source,
  ),
  "script modal should use a fixed available height with flex layout",
);

assert(
  /::v-deep \.modal > \.slot\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex:\s*1 1 auto;[\s\S]*?overflow:\s*hidden;/.test(
    source,
  ),
  "script modal slot should fill the panel instead of clipping the gallery",
);

assert(
  /\.script-gallery\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*auto auto minmax\(0,\s*1fr\) auto;[\s\S]*?height:\s*100%;/.test(
    source,
  ),
  "gallery view should allocate remaining height to the script list",
);

assert(
  /\.script-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(15em,\s*1fr\)\);[\s\S]*?justify-content:\s*stretch;[\s\S]*?width:\s*100%;[\s\S]*?min-height:\s*0;[\s\S]*?max-height:\s*none;/.test(
    source,
  ),
  "script list should stretch cards across the full available display area",
);

console.log("edition modal layout source tests passed");
