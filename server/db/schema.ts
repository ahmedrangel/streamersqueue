import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const control = sqliteTable("control", {
  id: integer("id").primaryKey(),
  last_updated: text("last_updated"),
  renewing: integer("renewing").default(0),
});

export const participants = sqliteTable("participants", {
  puuid: text("puuid").primaryKey(),
  summoner_id: text("summoner_id"),
  riot_name: text("riot_name"),
  riot_tag: text("riot_tag"),
  is_ingame: integer("is_ingame").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  lp: integer("lp"),
  elo: text("elo"),
  tier: text("tier"),
  lol_picture: integer("lol_picture"),
  lol_region: text("lol_region"),
  position: integer("position"),
  position_change: integer("position_change").default(0),
  control: integer("control").references(() => control.id),
});

export const socials = sqliteTable("socials", {
  puuid: text("puuid").primaryKey().references(() => participants.puuid),
  twitch_id: text("twitch_id"),
  twitch_login: text("twitch_login"),
  twitch_display: text("twitch_display"),
  twitch_is_live: integer("twitch_is_live").default(0),
  twitch_picture: text("twitch_picture"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  country_flag: text("country_flag"),
});

export const matches = sqliteTable("matches", {
  match_id: text("match_id").primaryKey(),
  date: integer("date"),
  duration: integer("duration")
});

export const history = sqliteTable("history", {
  puuid: text("puuid").references(() => participants.puuid),
  match_id: text("match_id").references(() => matches.match_id),
  kills: integer("kills"),
  deaths: integer("deaths"),
  assists: integer("assists"),
  is_remake: integer("is_remake"),
  result: integer("result"),
  champion: integer("champion"),
  game_surrendered: integer("game_surrendered")
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.puuid, table.match_id] })
  };
});