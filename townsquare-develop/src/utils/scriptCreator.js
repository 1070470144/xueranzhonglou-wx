const TEAM_ORDER = [
  "townsfolk",
  "outsider",
  "minion",
  "demon",
  "traveler",
  "fabled",
];

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
  if (role.officialId) return role.officialId;
  return {
    id: role.id,
    name: cleanText(role.displayName || role.name || role.zhName),
    image: cleanText(role.iconUrl || role.image || role.icon),
    ability: cleanText(role.displayAbility || role.ability || role.zhAbility),
    team: role.team,
  };
}

function shuffled(items, random) {
  const list = items.slice();
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function randomRoleSelection(roles, roleCounts, random = Math.random) {
  const counts = normalizeRoleCounts(roleCounts);
  return TEAM_ORDER.reduce((result, team) => {
    const roleIds = (Array.isArray(roles) ? roles : [])
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
  normalizeRoleCounts,
  randomRoleSelection,
  selectedRolesByTeam,
  validateRoleSelection,
};
