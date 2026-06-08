export const serializeBluffs = (bluffs = []) =>
  bluffs
    .filter(role => role && role.id)
    .map(role => (role.isCustom ? role : { id: role.id }));

export const hydrateBluffs = (bluffs = [], roles = new Map()) =>
  bluffs.map(role => roles.get(role.id) || role);

export const buildBluffMessages = (
  players = [],
  demonBluffs = [],
  lunaticBluffs = [],
  lunaticBluffPlayerIndex = -1
) => {
  const serializedDemonBluffs = serializeBluffs(demonBluffs);
  const serializedLunaticBluffs = serializeBluffs(lunaticBluffs);
  return players.reduce((messages, player, index) => {
    if (!player.id || !player.role || player.role.team !== "demon") return messages;
    const useLunaticBluffs = index === lunaticBluffPlayerIndex;
    const bluffs = useLunaticBluffs ? serializedLunaticBluffs : serializedDemonBluffs;
    if (bluffs.length) {
      messages[player.id] = ["lunaticBluffs", bluffs];
    }
    return messages;
  }, {});
};
