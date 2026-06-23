const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(`${label} should include ${text}`);
  }
}

const aiConfigSchema = read(
  "xueran/uniCloud-aliyun/database/ai-configs.schema.json",
);
const userConfigSchema = read(
  "xueran/uniCloud-aliyun/database/user-ai-configs.schema.json",
);
const adminAiConfigSchema = read(
  "xueran-admin/uniCloud-aliyun/database/ai-configs.schema.json",
);
const adminUserConfigSchema = read(
  "xueran-admin/uniCloud-aliyun/database/user-ai-configs.schema.json",
);
const aiService = read(
  "xueran/uniCloud-aliyun/cloudfunctions/ai-service/index.obj.js",
);
const aiAdminService = read(
  "xueran-admin/uniCloud-aliyun/cloudfunctions/ai-admin-service/index.obj.js",
);
const adminConfigPage = read("xueran-admin/pages/admin/ai/config.vue");
const aiServicePackage = read(
  "xueran/uniCloud-aliyun/cloudfunctions/ai-service/package.json",
);

assertIncludes(aiConfigSchema, '"imageModel"', "admin AI schema");
assertIncludes(userConfigSchema, '"imageModel"', "user AI schema");
assertIncludes(adminAiConfigSchema, '"imageModel"', "xueran-admin AI schema");
assertIncludes(
  adminUserConfigSchema,
  '"imageModel"',
  "xueran-admin user AI schema",
);
assertIncludes(aiService, "imageModel", "ai-service config");
assertIncludes(aiService, "async generateRoleIcon", "ai-service exports");
assertIncludes(aiService, "/images/generations", "image generation endpoint");
assertIncludes(
  aiService,
  "AI_IMAGE_HTTP_TIMEOUT",
  "image generation HTTP timeout",
);
assertIncludes(
  aiService,
  "AI_IMAGE_HARD_TIMEOUT",
  "image generation hard timeout",
);
assertIncludes(
  aiService,
  "timeout: AI_IMAGE_HTTP_TIMEOUT",
  "image generation should use image-specific HTTP timeout",
);
assertIncludes(
  aiService,
  "AI_IMAGE_HARD_TIMEOUT",
  "role icon generation should use image-specific hard timeout",
);
assertIncludes(aiService, "function roleIconPrompt(role)", "role icon prompt");
assertIncludes(
  aiService,
  "function extractGeneratedImage",
  "role icon response extractor",
);
assertIncludes(
  aiService,
  "function imageErrorDetail",
  "role icon error detail extractor",
);
assertIncludes(
  aiService,
  "imageErrorDetail(response.data)",
  "role icon should include upstream image error response detail",
);
assertIncludes(
  aiService,
  "description",
  "role icon natural language description input",
);
assertIncludes(aiService, "role.team", "role icon team style input");
assertIncludes(aiService, "townsfolk", "role icon townsfolk style");
assertIncludes(aiService, "outsider", "role icon outsider style");
assertIncludes(aiService, "traveler", "role icon traveler style");
assertIncludes(aiService, "fabled", "role icon fabled style");
assertIncludes(
  aiService,
  "transparent background",
  "role icon transparent background",
);
assertIncludes(
  aiService,
  "single centered ink symbol",
  "role icon project symbol style",
);
assertIncludes(
  aiService,
  "Do not draw a parchment disk",
  "role icon should avoid generated token disk",
);
assertIncludes(
  aiService,
  "no black background",
  "role icon should avoid generated dark square background",
);
assertIncludes(
  aiService,
  "Do not include any text",
  "role icon should not render labels",
);
if (aiService.includes("aged beige parchment disk")) {
  throw new Error(
    "role icon prompt should not ask AI to generate the brown token background",
  );
}
assertIncludes(
  aiService,
  "image_url",
  "role icon should support image_url responses",
);
assertIncludes(
  aiService,
  "output",
  "role icon should support output responses",
);
assertIncludes(
  aiService,
  "result",
  "role icon should support result responses",
);
assertIncludes(aiService, "请输入图标描述", "role icon description validation");
if (aiService.includes("missing role ability")) {
  throw new Error("role icon generation should not require role ability");
}
if (aiService.includes("missing role name")) {
  throw new Error("role icon generation should not require role name");
}
assertIncludes(
  aiService,
  "const imageModel = cleanText(config.imageModel || 'gpt-image-2', 120)",
  "role icon image model fallback",
);
assertIncludes(
  aiService,
  "if (!config.baseUrl || !config.apiKey)",
  "role icon required image config",
);
assertIncludes(
  aiService,
  "const saved = await getUserConfig(auth.user._id)",
  "save AI config readback",
);
assertIncludes(
  aiService,
  "AI 生图模型保存失败",
  "save AI config image model verification",
);
if (
  aiService.includes("!config.baseUrl || !config.apiKey || !config.imageModel")
) {
  throw new Error(
    "role icon generation should not reject old configs without imageModel",
  );
}
assertIncludes(aiAdminService, "imageModel", "ai-admin-service config");
assertIncludes(adminConfigPage, "form.imageModel", "admin config page");
assertIncludes(adminConfigPage, "gpt-image-2", "admin config defaults");
assertIncludes(
  aiServicePackage,
  '"timeout": 180',
  "ai-service cloud function timeout",
);

console.log("test-ai-role-icon-source passed");
