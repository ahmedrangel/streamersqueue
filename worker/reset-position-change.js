import "dotenv/config";

const response = await fetch(process.env.WORKER + "/reset-position-change", {
  method: "POST",
  body: JSON.stringify({
    key: process.env.POST_KEY
  }),
});

const data = await response.text();

console.info(data);