const assert = require("assert");
const fs = require("fs");
const path = require("path");

const roleModalSource = fs.readFileSync(
  path.join(__dirname, "../src/components/modals/RoleModal.vue"),
  "utf8",
);

assert(
  /::v-deep \.token \.ability\s*\{[\s\S]*?left:\s*50%;[\s\S]*?transform:\s*translateX\(-50%\);/.test(
    roleModalSource,
  ),
  "role picker token ability tooltip should be centered over the token",
);

assert(
  /::v-deep \.token \.ability\s*\{[\s\S]*?bottom:\s*calc\(100% \+/.test(
    roleModalSource,
  ),
  "role picker token ability tooltip should render above the token instead of off the right edge",
);

assert(
  /::v-deep \.token \.ability\s*\{[\s\S]*?max-width:\s*min\(18em, calc\(100vw - 2em\)\);/.test(
    roleModalSource,
  ),
  "role picker token ability tooltip should fit inside narrow screens",
);

assert(
  /::v-deep \.token \.ability:before\s*\{[\s\S]*?top:\s*100%;[\s\S]*?left:\s*50%;[\s\S]*?border-top-color:\s*black;/.test(
    roleModalSource,
  ),
  "role picker tooltip arrow should point down toward the hovered token",
);

console.log("role picker tooltip source tests passed");
