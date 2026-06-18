export const SCRIPT_POSTER_TEAMS = [
  { key: "townsfolk", label: "善良阵营·镇民", accent: "#0c83a6" },
  { key: "outsider", label: "善良阵营·外来者", accent: "#0c83a6" },
  { key: "minion", label: "邪恶阵营·爪牙", accent: "#8f1f24" },
  { key: "demon", label: "邪恶阵营·恶魔", accent: "#8f1f24" },
  { key: "traveller", label: "旅行者", accent: "#7a5a20" },
  { key: "fabled", label: "传奇角色", accent: "#7a5a20" },
];

const TEAM_KEYS = SCRIPT_POSTER_TEAMS.map((team) => team.key);

function coerceArray(input) {
  if (Array.isArray(input)) return input;
  if (input && Array.isArray(input.roles)) return input.roles;
  if (input && Array.isArray(input.characters)) return input.characters;
  throw new Error("JSON must be an array of roles or an object with roles");
}

function normalizeRole(role, index) {
  const team = TEAM_KEYS.includes(role.team)
    ? role.team
    : role.team === "traveler"
    ? "traveller"
    : "townsfolk";
  const image =
    role.image || role.icon || role.imageUrl || role.image_url || "";
  return {
    id: role.id || `role-${index}`,
    name: role.name || role.id || `角色 ${index + 1}`,
    team,
    image,
    imageAlt: role.imageAlt || role.image_alt || role.icon || "",
    ability: role.ability || "",
    firstNight: Number(role.firstNight || 0),
    otherNight: Number(role.otherNight || 0),
  };
}

export function normalizeScriptPosterData(input) {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;
  const items = coerceArray(parsed);
  const meta =
    items.find((item) => item && item.id === "_meta") ||
    (parsed && parsed.meta) ||
    {};
  const roles = items
    .filter((item) => item && item.id !== "_meta")
    .map(normalizeRole);
  const groups = SCRIPT_POSTER_TEAMS.reduce((acc, team) => {
    acc[team.key] = roles.filter((role) => role.team === team.key);
    return acc;
  }, {});

  return {
    title: meta.name || parsed.name || "未命名剧本",
    author: meta.author || parsed.author || "",
    logo: meta.logo || parsed.logo || "",
    almanac: meta.almanac || parsed.almanac || "",
    roles,
    groups,
    firstNight: roles
      .filter((role) => role.firstNight > 0)
      .sort((a, b) => a.firstNight - b.firstNight),
    otherNight: roles
      .filter((role) => role.otherNight > 0)
      .sort((a, b) => a.otherNight - b.otherNight),
  };
}

export function normalizeCurrentScriptPosterData({ edition, roles }) {
  const currentRoles = Array.from(
    (roles && roles.values && roles.values()) || [],
  );
  return normalizeScriptPosterData([
    {
      id: "_meta",
      name: (edition && (edition.name || edition.id)) || "未命名剧本",
      author: (edition && edition.author) || "",
      logo: (edition && edition.logo) || "",
      almanac: (edition && edition.almanac) || "",
    },
    ...currentRoles,
  ]);
}
