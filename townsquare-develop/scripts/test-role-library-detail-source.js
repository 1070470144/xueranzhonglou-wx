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
assert(
  previewStart > detailStart,
  "image preview modal should follow detail modal",
);

const detailTemplate = source.slice(detailStart, previewStart);
const titleIndex = detailTemplate.indexOf('class="section-title"');
const mediaIndex = detailTemplate.indexOf('class="detail-media"');
const galleryIndex = detailTemplate.indexOf('class="detail-image-gallery"');
const tokenIndex = detailTemplate.indexOf('class="detail-token-gallery"');
const copyIndex = detailTemplate.indexOf('class="detail-copy"');

assert(
  !detailTemplate.includes('class="role-icon large"'),
  "role detail should not render a duplicate large icon above the image gallery",
);
assert(
  detailTemplate.includes('class="detail-image-section"') &&
    detailTemplate.includes('class="detail-token-section"'),
  "role detail should render separate sections for role images and small tokens",
);
assert(
  detailTemplate.includes("roleMainImages(detailRole)") &&
    detailTemplate.includes("roleSmallTokens(detailRole)"),
  "role detail should use separate image and token data sources",
);
assert(
  !/v-for="\(image, index\) in roleImages\(detailRole\)"/.test(detailTemplate),
  "role detail should not mix role images and small tokens in one gallery",
);
assert(
  detailTemplate.includes('class="detail-image-gallery"'),
  "role detail should keep the main role image gallery",
);
assert(
  detailTemplate.includes('class="detail-token-gallery"') &&
    detailTemplate.includes('class="detail-token-name"') &&
    detailTemplate.includes("token.name || detailRole.displayName"),
  "role detail should render small tokens with their text labels",
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
  titleIndex >= 0 &&
    copyIndex > titleIndex &&
    mediaIndex > copyIndex &&
    galleryIndex > mediaIndex &&
    tokenIndex > galleryIndex,
  "role detail should show role copy first, then separated image and token sections",
);

assert(
  source.includes("roleMainImages(role)") &&
    source.includes("roleSmallTokens(role)"),
  "role detail should expose helpers for main images and small tokens",
);

console.log("role library detail source tests passed");
