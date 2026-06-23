const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "../src/components/modals/RoleLibraryModal.vue"),
  "utf8",
);

const detailStart = source.indexOf('class="role-detail-submodal"');
const previewStart = source.indexOf('class="role-image-preview-submodal"');
assert(detailStart >= 0, "role detail modal should exist");
assert(previewStart > detailStart, "image preview modal should follow detail modal");

const detailTemplate = source.slice(detailStart, previewStart);
const titleIndex = detailTemplate.indexOf('class="section-title"');
const galleryIndex = detailTemplate.indexOf('class="detail-gallery"');
const copyIndex = detailTemplate.indexOf('class="detail-copy"');

assert(
  !detailTemplate.includes('class="role-icon large"'),
  "role detail should not render a duplicate large icon above the image gallery",
);
assert(
  detailTemplate.includes('class="detail-gallery"'),
  "role detail should keep the role image gallery",
);
assert(
  detailTemplate.includes('class="image-download-button"'),
  "role detail should keep image download buttons",
);
assert(
  !detailTemplate.includes("detailRole.roleId || detailRole.id"),
  "role detail should not show internal kb role ids",
);
assert(
  titleIndex >= 0 && galleryIndex > titleIndex && galleryIndex < copyIndex,
  "role image gallery should render directly below the role name and before role copy",
);

console.log("role library detail source tests passed");
