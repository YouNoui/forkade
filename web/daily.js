/* Shared by the browser and server: Singapore calendar and deterministic challenge. */
(function (root) {
  const games = ['skyhop', 'glass', 'demo', 'prism', 'match', 'wrecker'];
  const date = (now = Date.now()) => new Date(Number(now) + 8 * 3600000).toISOString().slice(0, 10);
  function challenge(now = Date.now()) {
    const day = date(now), index = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
    return { date: day, game: games[index % games.length], seed: 'forkade-daily-v1:' + day,
      next: Date.parse(day + 'T00:00:00+08:00') + 86400000 };
  }
  const api = { date, challenge, games };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ForkadeDaily = api;
})(typeof window === 'undefined' ? globalThis : window);
