const TEAM_ORDER = [
  "townsfolk",
  "outsider",
  "minion",
  "demon",
  "traveler",
  "fabled",
];
const officialRoles = require("../roles.json");
const { translateOfficialReminders } = require("./reminderTranslations");

const DEFAULT_ROLE_COUNTS = {
  townsfolk: 13,
  outsider: 4,
  minion: 4,
  demon: 4,
  traveler: 0,
  fabled: 0,
};

function cleanText(value) {
  return String(value || "").trim();
}

function cleanNightOrder(value) {
  const order = Number.parseInt(value, 10);
  return Number.isFinite(order) ? Math.max(0, order) : 0;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeOfficialKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function roleImageOfficialKey(role) {
  const image = cleanText(role && (role.iconUrl || role.image || role.icon));
  if (!image) return "";
  if (!/clocktower-wiki\.gstonegames\.com/i.test(image)) return "";
  const matches = image.match(/\/([^/?#]+)\.png(?:[/?#]|$)/gi);
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

function officialRoleForExport(role) {
  const imageKey = roleImageOfficialKey(role);
  if (imageKey) return officialRolesByKey[imageKey] || null;
  return null;
}

function cleanImageList(...values) {
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
    add(
      value.url ||
        value.fileId ||
        value.fileID ||
        value.path ||
        value.src ||
        value.thumbnail ||
        value.tempFilePath,
    );
  };
  values.forEach(add);
  return Array.from(new Set(images));
}

function cleanJsonValue(value) {
  if (!value) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
}

function addCleanText(json, key, value) {
  const text = cleanText(value);
  if (text) json[key] = text;
}

function addCleanJson(json, key, value) {
  const cleanValue = cleanJsonValue(value);
  if (Array.isArray(cleanValue)) {
    if (cleanValue.length) json[key] = cleanValue;
    return;
  }
  if (
    cleanValue &&
    typeof cleanValue === "object" &&
    Object.keys(cleanValue).length
  ) {
    json[key] = cleanValue;
  }
}

function roleIdsForTeam(selectedRoles, team) {
  return Array.isArray(selectedRoles && selectedRoles[team])
    ? selectedRoles[team].filter(Boolean)
    : [];
}

function normalizeRoleCounts(counts = {}) {
  return TEAM_ORDER.reduce((result, team) => {
    const value = Number(counts[team]);
    result[team] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return result;
  }, {});
}

function customRoleJson(role) {
  if (!role || !role.id) return null;
  const officialRole = officialRoleForExport(role) || {};
  const tokenImages = cleanImageList(
    role.smallTokens,
    role.tokenImages,
    role.tokens,
    role.smallToken,
    role.tokenImage,
    role.tokenUrl,
  );
  const json = {
    id: cleanText(role.roleId || role.id),
    name: cleanText(role.displayName || role.name || role.zhName),
    image: cleanText(role.iconUrl || role.image || role.icon),
    ability: cleanText(role.displayAbility || role.ability || role.zhAbility),
    team: role.team,
    firstNight: cleanNightOrder(
      firstDefined(
        role.firstNight,
        role.firstNightOrder,
        role.first_night,
        role.first_night_order,
        officialRole.firstNight,
      ),
    ),
    firstNightReminder: cleanText(
      firstDefined(
        role.firstNightReminder,
        role.first_night_reminder,
        role.firstNightText,
        role.first_night_text,
        officialRole.firstNightReminder,
      ),
    ),
    otherNight: cleanNightOrder(
      firstDefined(
        role.otherNight,
        role.otherNightOrder,
        role.other_night,
        role.other_night_order,
        officialRole.otherNight,
      ),
    ),
    otherNightReminder: cleanText(
      firstDefined(
        role.otherNightReminder,
        role.other_night_reminder,
        role.otherNightText,
        role.other_night_text,
        officialRole.otherNightReminder,
      ),
    ),
  };
  if (tokenImages.length) {
    json.smallTokens = tokenImages;
    json.tokenImages = tokenImages;
    json.smallToken = tokenImages[0];
    json.tokenImage = tokenImages[0];
  }
  addCleanJson(
    json,
    "reminders",
    firstDefined(
      role.reminders,
      translateOfficialReminders(officialRole.reminders),
    ),
  );
  addCleanJson(
    json,
    "remindersGlobal",
    firstDefined(
      role.remindersGlobal,
      translateOfficialReminders(officialRole.remindersGlobal),
    ),
  );
  addCleanJson(json, "tokens", role.tokens);
  const setup = firstDefined(role.setup, officialRole.setup);
  if (typeof setup === "boolean") {
    json.setup = setup;
  }
  addCleanText(json, "title", role.title);
  addCleanText(json, "englishName", role.englishName);
  addCleanText(json, "roleType", role.roleType);
  addCleanText(json, "category", role.category);
  addCleanText(json, "content", role.content);
  addCleanText(json, "script", role.script);
  addCleanText(json, "sourceUrl", role.sourceUrl);
  addCleanJson(json, "sections", role.sections);
  addCleanJson(json, "scripts", role.scripts);
  addCleanJson(json, "abilityTypes", role.abilityTypes);
  addCleanJson(json, "tags", role.tags);
  return json;
}

function shuffled(items, random) {
  const list = items.slice();
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function isCustomRole(role) {
  return !!(
    role &&
    (role.sourceType === "custom" ||
      role.sourceType === "public_custom" ||
      role.sourceType === "mine" ||
      role.source === "user_custom" ||
      role.source === "custom" ||
      role.source === "public_custom" ||
      role.source === "mine")
  );
}

function filterRolesForRandomSelection(roles, includeCustomRoles = false) {
  const list = Array.isArray(roles) ? roles : [];
  if (includeCustomRoles) return list;
  return list.filter((role) => !isCustomRole(role));
}

function randomRoleSelection(
  roles,
  roleCounts,
  random = Math.random,
  options = {},
) {
  const candidateRoles = filterRolesForRandomSelection(
    roles,
    !!options.includeCustomRoles,
  );
  const counts = normalizeRoleCounts(roleCounts);
  return TEAM_ORDER.reduce((result, team) => {
    const roleIds = candidateRoles
      .filter((role) => role && role.team === team && role.id)
      .map((role) => role.id);
    result[team] = shuffled(roleIds, random).slice(0, counts[team]);
    return result;
  }, {});
}

function selectedRolesByTeam() {
  return TEAM_ORDER.reduce((result, team) => {
    result[team] = [];
    return result;
  }, {});
}

function canExportScript(authSession) {
  return !!(authSession && authSession.user);
}

function validateRoleSelection(selectedRoles, roleCounts) {
  const counts = normalizeRoleCounts(roleCounts);
  return TEAM_ORDER.map((team) => ({
    team,
    expected: counts[team],
    actual: roleIdsForTeam(selectedRoles, team).length,
  })).filter((item) => item.actual !== item.expected);
}

function buildScriptJson({ name, author, selectedRoles, roleById = {} }) {
  const roles = TEAM_ORDER.reduce(
    (list, team) =>
      list.concat(
        roleIdsForTeam(selectedRoles, team)
          .map((id) => {
            const role =
              roleById instanceof Map ? roleById.get(id) : roleById[id];
            return role ? customRoleJson(role) : id;
          })
          .filter(Boolean),
      ),
    [],
  );
  return [
    {
      id: "_meta",
      name: cleanText(name) || "Custom Script",
      author: cleanText(author),
    },
    ...roles,
  ];
}

module.exports = {
  DEFAULT_ROLE_COUNTS,
  TEAM_ORDER,
  buildScriptJson,
  canExportScript,
  filterRolesForRandomSelection,
  normalizeRoleCounts,
  randomRoleSelection,
  selectedRolesByTeam,
  validateRoleSelection,
};
