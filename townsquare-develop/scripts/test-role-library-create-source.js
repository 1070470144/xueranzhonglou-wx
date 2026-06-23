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
const styleStart = modalSource.indexOf('<style scoped lang="scss">');
assert(styleStart >= 0, "role library modal should keep scoped styles");
const styleSource = modalSource.slice(styleStart);

assert(
  !createTemplate.includes("createJson"),
  "create role modal should not expose the old raw JSON textarea",
);
assert(
  createTemplate.includes('class="create-section create-basic-section"') &&
    createTemplate.includes('class="create-section create-night-section"') &&
    createTemplate.includes('class="create-section create-media-section"') &&
    createTemplate.includes('class="create-section create-token-section"'),
  "create role modal should group fields into basic, night, image, and token sections",
);
assert(
  createTemplate.includes('class="create-section-title"'),
  "create role modal should label each grouped section",
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
  createTemplate.includes('class="form-control-row image-control-row"') &&
    createTemplate.includes('class="token-grid-header"') &&
    createTemplate.includes('class="token-action-row"'),
  "create role media controls should use aligned image and token control rows",
);
assert(
  createTemplate.includes("createForm.smallTokens[index].name") &&
    createTemplate.includes("createForm.smallTokens[index].image"),
  "create role modal should allow entering both small token text and image",
);
assert(
  /\.create-section\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*0\.48em/.test(
    styleSource,
  ),
  "create role sections should use a compact vertical rhythm",
);
assert(
  /\.form-control-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content/.test(
    styleSource,
  ),
  "image URL and upload controls should align with a stable button column",
);
assert(
  /\.image-control-row\s+\.upload-button\s*\{[\s\S]*?width:\s*7\.6em/.test(
    styleSource,
  ),
  "create role image upload button should stay compact",
);
assert(
  /\.token-row,\s*\.token-grid-header\s*\{[\s\S]*?grid-template-columns:\s*minmax\(6em,\s*0\.42fr\)\s+minmax\(0,\s*1fr\)\s+2\.2em/.test(
    styleSource,
  ),
  "small token rows should align text, image URL, and remove action columns",
);
assert(
  /\.form-field input,\s*\.form-field select,\s*\.form-field textarea,\s*\.token-row input,\s*\.upload-button,\s*\.remove-token-button\s*\{[\s\S]*?min-height:\s*1\.575em/.test(
    styleSource,
  ),
  "create role inputs and buttons should share a compact control height",
);
assert(
  /\.form-field input,\s*\.form-field select,\s*\.token-row input,\s*\.upload-button,\s*\.remove-token-button\s*\{(?=[\s\S]*?box-sizing:\s*border-box)(?=[\s\S]*?height:\s*1\.575em)[\s\S]*?\}/.test(
    styleSource,
  ),
  "create role token inputs and buttons should use the same fixed visual height",
);
assert(
  modalSource.includes("generateCreateRoleId") &&
    modalSource.includes("buildCreateRoleJson"),
  "create role modal should generate a readonly id and build JSON from form fields",
);
assert(
  modalSource.includes("normalizeCreateToken") &&
    modalSource.includes("token.image") &&
    modalSource.includes("token.name"),
  "create role modal should preserve small token text while building role JSON",
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
assert(
  serviceSource.includes("cleanUserRoleTokenList") &&
    serviceSource.includes("name: cleanUserRoleText") &&
    serviceSource.includes("image: cleanUserRoleText"),
  "script-service should preserve small token text and image objects",
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
