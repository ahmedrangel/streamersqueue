import "dotenv/config";

const response = await fetch(process.env.WORKER + "/renewal", {
  method: "POST",
  body: JSON.stringify({
    key: process.env.POST_KEY
  }),
});

const data = await response.json();

console.info(data);
