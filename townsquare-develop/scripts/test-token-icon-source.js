const assert = require("assert");
const fs = require("fs");
const path = require("path");

const tokenPath = path.join(__dirname, "../src/components/Token.vue");
const tokenSource = fs.readFileSync(tokenPath, "utf8");
const tokenAssetPath = path.join(__dirname, "../src/assets/token1.png");
const tokenBlockStart = tokenSource.indexOf(".token {");
const tokenBlockBackground = tokenSource.indexOf("background:", tokenBlockStart);
const tokenBlockBackgroundLine = tokenSource
  .slice(tokenBlockBackground, tokenSource.indexOf("\n", tokenBlockBackground))
  .trim();

assert(
  tokenSource.includes("roleIconImage(role)") &&
    /const jsonImage\s*=\s*role\.image\s*\|\|\s*role\.icon\s*\|\|\s*role\.imageUrl\s*\|\|\s*role\.image_url/.test(
      tokenSource,
    ),
  "Token should resolve icon images from JSON fields before using bundled assets",
);

assert(
  /return \([\s\S]*jsonImage\s*\|\|[\s\S]*require\(["']\.\.\/assets\/icons\/["'] \+ \(role\.imageAlt \|\| role\.id\) \+ ["']\.png["']\)/.test(
    tokenSource,
  ),
  "Token should keep the bundled local icon as a fallback when JSON has no image",
);

assert(
  tokenSource.includes("backgroundImage: `url(${roleIconImage(role)})`"),
  "Token template should use the shared roleIconImage resolver for token icons",
);

assert(
  tokenBlockBackgroundLine === 'background: url("../assets/token1.png") center center;',
  "Role token background should use the local token1.png asset",
);

assert(
  tokenSource.includes(':class="tokenClasses"') &&
    /tokenClasses:\s*function\s*\(\)\s*\{[\s\S]*this\.role\.id/.test(
      tokenSource,
    ) &&
    /tokenClasses:\s*function\s*\(\)\s*\{[\s\S]*empty:\s*!this\.role\.id/.test(
      tokenSource,
    ),
  "Token should mark seats without a role as empty",
);

assert(
  /\.token\.empty\s*\{[\s\S]*background:\s*url\("\.\.\/assets\/token1\.png"\)\s+center\s+center;/.test(
    tokenSource,
  ),
  "Empty seat token should use the local token1.png background",
);

assert(fs.existsSync(tokenAssetPath), "token1.png should be stored locally");

console.log("token icon source tests passed");
