import "dotenv/config";

const response = await fetch(process.env.WORKER + "/add", {
  method: "POST",
  body: JSON.stringify({
    riot_name: "Mechs",
    riot_tag: "6969",
    region: "lan",
    twitch: "lolmechs",
    instagram: "mechslol",
    twitter: "MechsLOL",
    country_flag: "🇨🇴",
    key: process.env.POST_KEY
  }),
});

const data = await response.json();

console.info(data);
