import Discord from "discord.js";

async function initDiscordClient({ token }) {
  const client = new Discord.Client();

  function handleMessage(message) {
    if (message.author === client.user) {
      return;
    }
    if (message.content === "ping") {
      message.reply("ping");
    }

    console.log("got message", message.content);
  }

  return new Promise((resolve, reject) => {
    client.on("ready", () => {
      resolve(client);
    });

    client.on("message", handleMessage);

    client.login(token).catch((e) => reject(e));
  });
}

export async function createDiscordClient({ token }) {
  const discordClient = await initDiscordClient({ token });

  return discordClient;
}
