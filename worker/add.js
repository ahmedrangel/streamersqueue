import "dotenv/config";

const response = await fetch(process.env.WORKER + "/add", {
  method: "POST",
  // body example
  body: JSON.stringify({
    riot_name: "Agurin",
    riot_tag: "EUW",
    region: "euw",
    twitch: "agurin",
    instagram: "agurinlol",
    twitter: "Agurinlol",
    country_flag: "🇩🇪",
    key: process.env.POST_KEY
  })
});

const data = await response.json();

console.info(data);
