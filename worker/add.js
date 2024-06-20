import "dotenv/config";

const response = await fetch(process.env.WORKER + "/add", {
  method: "POST",
  // body example
  body: JSON.stringify({
    riot_name: "Fallen IV",
    riot_tag: "LAN",
    region: "lan",
    twitch: "fallen_iv4",
    instagram: "falleniv4",
    twitter: "falleniv4",
    country_flag: "🇨🇴",
    key: process.env.POST_KEY
  })
});

const data = await response.json();

console.info(data);
