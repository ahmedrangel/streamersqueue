export const fixRank = (elo, rank) => {
  const elo_name = elo.toLowerCase();
  if (elo_name === "challenger" || elo_name === "grandmaster" || elo_name === "master") {
    return "";
  }
  return rank;
};

export const controls = {
  lan: 1,
  las: 2,
  na: 3,
  euw: 4,
};