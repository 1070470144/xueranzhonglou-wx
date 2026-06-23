const assert = require("assert");
const fs = require("fs");
const path = require("path");

const modalSource = fs.readFileSync(
  path.join(__dirname, "../src/components/modals/RoleLibraryModal.vue"),
  "utf8",
);
const utilSource = fs.readFileSync(
  path.join(__dirname, "../src/utils/roleLibrary.js"),
  "utf8",
);
const serviceSource = fs.readFileSync(
  path.join(
    __dirname,
    "../../xueran/uniCloud-aliyun/cloudfunctions/script-service/index.js",
  ),
  "utf8",
);

const createStart = modalSource.indexOf('class="role-create-submodal"');
const detailStart = modalSource.indexOf('class="role-detail-submodal"');
assert(createStart >= 0, "role create modal should exist");
assert(
  detailStart > createStart,
  "role detail modal should follow create modal",
);

const createTemplate = modalSource.slice(createStart, detailStart);

assert(
  !createTemplate.includes("createJson"),
  "create role modal should not expose the old raw JSON textarea",
);
[
  "createForm.id",
  "createForm.name",
  "createForm.team",
  "createForm.ability",
  "createForm.image",
  "createForm.smallTokens",
  "createForm.firstNight",
  "createForm.firstNightReminder",
  "createForm.otherNight",
  "createForm.otherNightReminder",
].forEach((binding) => {
  assert(
    createTemplate.includes(binding),
    `create role modal should bind ${binding}`,
  );
});

assert(
  createTemplate.includes('type="file"') &&
    createTemplate.includes("handleCreateImageUpload") &&
    createTemplate.includes("handleCreateTokenUpload"),
  "create role modal should upload both role image and small token images",
);
assert(
  modalSource.includes("generateCreateRoleId") &&
    modalSource.includes("buildCreateRoleJson"),
  "create role modal should generate a readonly id and build JSON from form fields",
);
assert(
  modalSource.includes("uploadScriptCoverImage"),
  "create role modal should reuse the existing image upload service",
);
assert(
  serviceSource.includes("smallTokens") &&
    serviceSource.includes("tokenImages"),
  "script-service should store and return small token image arrays",
);
[
  "firstNight",
  "firstNightReminder",
  "otherNight",
  "otherNightReminder",
].forEach((field) => {
  assert(
    modalSource.includes(field) && serviceSource.includes(field),
    `create role flow should store and return ${field}`,
  );
});
assert(
  utilSource.includes("smallTokens") && utilSource.includes("tokenImages"),
  "role library image normalization should include small token image arrays",
);

console.log("role library create source tests passed");
