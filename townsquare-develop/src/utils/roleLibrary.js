const officialRoles = require("../roles.json");
const { translateOfficialReminders } = require("./reminderTranslations");

export const ROLE_SOURCE_ALL = "all";
export const ROLE_SOURCE_OFFICIAL = "official";
export const ROLE_SOURCE_CUSTOM = "custom";
export const ROLE_SOURCE_PUBLIC_CUSTOM = "public_custom";
export const ROLE_SOURCE_MINE = "mine";

export const ROLE_TEAM_ORDER = [
  "townsfolk",
  "outsider",
  "minion",
  "demon",
  "traveler",
  "fabled",
];

export function normalizeRoleTeam(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();
  if (!text) return "";
  if (ROLE_TEAM_ORDER.includes(text)) return text;
  if (
    text.includes("townsfolk") ||
    text.includes("town") ||
    text.includes("镇民")
  ) {
    return "townsfolk";
  }
  if (text.includes("outsider") || text.includes("外来")) return "outsider";
  if (text.includes("minion") || text.includes("爪牙")) return "minion";
  if (text.includes("demon") || text.includes("恶魔")) return "demon";
  if (
    text.includes("traveler") ||
    text.includes("traveller") ||
    text.includes("旅行")
  ) {
    return "traveler";
  }
  if (text.includes("fabled") || text.includes("传奇")) return "fabled";
  return "";
}

export function normalizeRoleImageArray(...values) {
  const images = [];
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === "string") {
      const text = value.trim();
      if (text) images.push(text);
      return;
    }
    if (typeof value !== "object") return;
    const url =
      value.image ||
      value.url ||
      value.fileId ||
      value.fileID ||
      value.path ||
      value.src ||
      value.thumbnail ||
      value.tempFilePath;
    if (url) add(url);
  };
  values.forEach(add);
  return Array.from(new Set(images));
}

export function normalizeRoleTokenArray(...values) {
  const tokens = [];
  const seen = new Set();
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === "string") {
      const image = value.trim();
      if (image && !seen.has(image)) {
        seen.add(image);
        tokens.push({ name: "", image });
      }
      return;
    }
    if (typeof value !== "object") return;
    const image = String(
      value.image ||
        value.url ||
        value.fileId ||
        value.fileID ||
        value.path ||
        value.src ||
        value.thumbnail ||
        value.tempFilePath ||
        "",
    ).trim();
    if (!image || seen.has(image)) return;
    seen.add(image);
    tokens.push({
      name: String(
        value.name || value.label || value.text || value.title || "",
      ).trim(),
      image,
    });
  };
  values.forEach(add);
  return tokens;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function roleField(role, key) {
  return role && (role[key] !== undefined ? role[key] : role[String(key)]);
}

function roleImageValue(role) {
  return firstDefined(
    roleField(role, "iconUrl"),
    roleField(role, "image"),
    roleField(role, "icon"),
    roleField(role, "avatar"),
    roleField(role, "2"),
  );
}

function normalizeOfficialKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function roleImageOfficialKey(role) {
  const image = roleImageValue(role) || "";
  if (!/clocktower-wiki\.gstonegames\.com/i.test(String(image || ""))) {
    return "";
  }
  const matches = String(image).match(/\/([^/?#]+)\.png(?:[/?#]|$)/gi);
  if (!matches || !matches.length) return "";
  const lastMatch = matches[matches.length - 1];
  return normalizeOfficialKey(lastMatch.replace(/^\/|\.png.*$/gi, ""));
}

const officialRolesByKey = officialRoles.reduce((result, role) => {
  [role.id, role.name].forEach((value) => {
    const key = normalizeOfficialKey(value);
    if (key && !result[key]) result[key] = role;
  });
  return result;
}, {});

function matchedOfficialRole(role) {
  const imageKey = roleImageOfficialKey(role);
  return imageKey ? officialRolesByKey[imageKey] || null : null;
}

export function normalizeRoleForLibrary(
  role,
  sourceType = ROLE_SOURCE_OFFICIAL,
) {
  const officialRole =
    sourceType === ROLE_SOURCE_OFFICIAL ? matchedOfficialRole(role) : null;
  const rawId =
    role &&
    firstDefined(
      role.roleId,
      role.id,
      role._id,
      roleField(role, "0"),
      role.name,
    );
  const id = String(rawId || "").trim();
  const displayName =
    role &&
    firstDefined(
      role.displayName,
      role.name,
      roleField(role, "1"),
      role.title,
      id,
    );
  const displayAbility =
    (role &&
      firstDefined(
        role.displayAbility,
        role.ability,
        roleField(role, "3"),
        role.skill,
        "",
      )) ||
    "";
  const team = normalizeRoleTeam(
    role &&
      firstDefined(
        role.team,
        roleField(role, "12"),
        role.roleType,
        role.category,
        role.type,
      ),
  );
  const icon = roleImageValue(role) || "";
  const docId = role && (role.docId || role._id || role.id);
  const tokenImages = normalizeRoleTokenArray(
    role && role.smallTokens,
    role && role.tokenImages,
    role && role.tokens,
    role && role.smallToken,
    role && role.tokenImage,
    role && role.tokenUrl,
    role && role.token,
  );
  const firstToken = (tokenImages[0] && tokenImages[0].image) || "";
  return {
    ...(role || {}),
    id,
    roleId: role && (role.roleId || role.id || id),
    docId,
    displayName,
    displayAbility,
    team,
    icon,
    iconUrl: role && (role.iconUrl || icon),
    image: role && (role.image || icon),
    smallTokens: tokenImages,
    tokenImages,
    smallToken: firstToken,
    tokenImage: firstToken,
    tokenUrl: (role && role.tokenUrl) || firstToken,
    firstNight: firstDefined(
      role && role.firstNight,
      roleField(role, "5"),
      officialRole && officialRole.firstNight,
    ),
    firstNightReminder: firstDefined(
      role && role.firstNightReminder,
      roleField(role, "6"),
      officialRole && officialRole.firstNightReminder,
    ),
    otherNight: firstDefined(
      role && role.otherNight,
      roleField(role, "7"),
      officialRole && officialRole.otherNight,
    ),
    otherNightReminder: firstDefined(
      role && role.otherNightReminder,
      roleField(role, "8"),
      officialRole && officialRole.otherNightReminder,
    ),
    reminders: firstDefined(
      role && role.reminders,
      roleField(role, "9"),
      officialRole && translateOfficialReminders(officialRole.reminders),
    ),
    remindersGlobal: firstDefined(
      role && role.remindersGlobal,
      roleField(role, "10"),
      officialRole && translateOfficialReminders(officialRole.remindersGlobal),
    ),
    setup: firstDefined(
      role && role.setup,
      roleField(role, "11"),
      officialRole && officialRole.setup,
    ),
    sourceType,
    officialId:
      sourceType === ROLE_SOURCE_OFFICIAL
        ? (officialRole && officialRole.id) || id
        : "",
  };
}

export function roleMatchesKeyword(role, keyword) {
  const text = String(keyword || "")
    .trim()
    .toLowerCase();
  if (!text) return true;
  return [
    role && role.id,
    role && role.roleId,
    role && role.name,
    role && role.displayName,
    role && role.englishName,
    role && role.displayAbility,
    role && role.ability,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(text);
}

export function roleImageList(role) {
  const images = [];
  const add = (value) => {
    if (!value) return;
    if (typeof value === "string") {
      images.push(value);
      return;
    }
    if (typeof value !== "object") return;
    const url =
      value.image ||
      value.url ||
      value.fileId ||
      value.fileID ||
      value.path ||
      value.src ||
      value.thumbnail ||
      value.tempFilePath;
    if (url) images.push(url);
  };
  [
    roleImageValue(role),
    role && role["2"],
    role && role.smallTokens,
    role && role.tokenImages,
    role && role.tokens,
    role && role.smallToken,
    role && role.tokenImage,
    role && role.tokenUrl,
    role && role.images,
    role && role.thumbnails,
  ].forEach((value) => {
    if (Array.isArray(value)) value.forEach(add);
    else add(value);
  });
  return Array.from(new Set(images.filter(Boolean)));
}
