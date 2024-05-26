import "dotenv/config";

const response = await fetch(process.env.WORKER + "/delete", {
  method: "POST",
  body: JSON.stringify({
    riot_name: "RIOT_NAME",
    riot_tag: "RIOT_TAG",
    key: process.env.POST_KEY
  }),
});

const data = await response.json();

console.info(data);
