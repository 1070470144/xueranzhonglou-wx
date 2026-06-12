const DEFAULT_OPTIONS = {
  startSeat: 1,
  direction: "forward",
  manualDrawEnabled: false,
  autoDrawEnabled: false,
  autoDrawSeconds: 30,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeDrawOptions = (options = {}, playerCount = 0) => {
  const maxSeat = Math.max(1, playerCount);
  const parsedStartSeat = Number.parseInt(options.startSeat, 10);
  const parsedSeconds = Number.parseInt(options.autoDrawSeconds, 10);
  return {
    startSeat: clamp(
      Number.isFinite(parsedStartSeat)
        ? parsedStartSeat
        : DEFAULT_OPTIONS.startSeat,
      1,
      maxSeat,
    ),
    direction: options.direction === "reverse" ? "reverse" : "forward",
    manualDrawEnabled: options.manualDrawEnabled === true,
    autoDrawEnabled: options.autoDrawEnabled === true,
    autoDrawSeconds:
      Number.isFinite(parsedSeconds) && parsedSeconds >= 5
        ? clamp(parsedSeconds, 5, 600)
        : DEFAULT_OPTIONS.autoDrawSeconds,
  };
};

const isEligiblePlayer = (player) =>
  !!player && (!player.role || player.role.team !== "traveler");

const buildDrawQueue = (players = [], startSeat = 1, direction = "forward") => {
  if (!players.length) return [];
  const step = direction === "reverse" ? -1 : 1;
  const startIndex = clamp(
    (Number.parseInt(startSeat, 10) || 1) - 1,
    0,
    players.length - 1,
  );
  const queue = [];
  for (let offset = 0; offset < players.length; offset++) {
    const index =
      (startIndex + step * offset + players.length) % players.length;
    if (isEligiblePlayer(players[index])) queue.push(index);
  }
  return queue;
};

const drawRoleFromPool = (pool = [], random = Math.random) => {
  if (!pool.length) return { roleId: "", remainingPool: [] };
  const index = clamp(Math.floor(random() * pool.length), 0, pool.length - 1);
  const remainingPool = pool.slice();
  const [roleId] = remainingPool.splice(index, 1);
  return { roleId, remainingPool };
};

export { buildDrawQueue, normalizeDrawOptions, drawRoleFromPool };
