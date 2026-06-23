const assert = require("assert");
const fs = require("fs");
const path = require("path");

const modalSource = fs.readFileSync(
  path.join(__dirname, "../src/components/modals/ScriptLibraryModal.vue"),
  "utf8",
);

const styleStart = modalSource.indexOf('<style scoped lang="scss">');
assert(styleStart >= 0, "script library modal should keep scoped styles");
const styleSource = modalSource.slice(styleStart);

assert(
  modalSource.includes('class="upload-form"') &&
    modalSource.includes('class="upload-cover-section"') &&
    modalSource.includes('class="upload-fields"') &&
    modalSource.includes('class="upload-action-row"'),
  "script upload panel should use a clear cover, fields, and action structure",
);

assert(
  /class="upload-field[\s\S]*?myScripts\.scriptType[\s\S]*?class="upload-field[\s\S]*?myScripts\.jsonFile/.test(
    modalSource,
  ),
  "script upload fields should use matching field wrappers for type and JSON file",
);

assert(
  /\.upload-form\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*0\.75em/.test(
    styleSource,
  ),
  "script upload form should use one vertical grid rhythm",
);

assert(
  /\.upload-cover-section\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*0\.45em/.test(
    styleSource,
  ),
  "cover upload section should be its own aligned block",
);

assert(
  /\.upload-fields\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(
    styleSource,
  ),
  "script type and JSON controls should align in two equal columns",
);

assert(
  /\.upload-action-row\s*\{[\s\S]*?justify-content:\s*space-between/.test(
    styleSource,
  ),
  "upload action row should reserve left status space and right submit action",
);

console.log("script upload layout source tests passed");
