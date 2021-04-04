import fetch from "node-fetch";

function discordEmbedFormat(image) {
  return {
    title: image.title,
    author: { name: image.creator },
    image: {
      url: image.url,
    },
    footer: {
      text: `Check out this masterwork of a competition entry, and others like it at ${image.source}\n\n (This message was automatically generated based on ftp path and filename)`,
    },
  };
}

export function createPublisher({ discordClient }) {
  function publishToDiscordChannel({ subscription, image }) {
    const channel = discordClient?.channels.cache.get(subscription.channel);
    if (!channel) {
      console.warn(
        `Unable to get Discord-channel ${subscription.channel}, skipping`
      );
      return;
    }

    channel.send({
      embed: discordEmbedFormat(image),
    });
  }

  function publishToDiscordWebhook({ subscription, image }) {
    if (!subscription.hookUrl) {
      console.warn(`Unable to use Discord-webhook (no url defined), skipping`);
      return;
    }

    fetch(subscription.hookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [discordEmbedFormat(image)],
      }),
    }).catch((e) => {
      console.warn(
        `Error while trying to use Discord-webhook ${subscription.hookId}`
      );
    });
  }

  function publishImage({ subscription, image }) {
    switch (subscription.type) {
      case "discord-channel":
        publishToDiscordChannel({ subscription, image });
        break;

      case "discord-webhook":
        publishToDiscordWebhook({ subscription, image });
        break;

      default:
        console.error(
          "Unknown subscription type, have to skip publishing image."
        );
    }
  }

  return {
    publishImage,
  };
}
