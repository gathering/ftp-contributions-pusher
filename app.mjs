#!/usr/bin/env node

import dotenv from "dotenv";
import winston from "winston";
import storage from "node-persist";
import p from "process";
import { images as rawImages } from "./images.mjs";
import { logImagePush, getStateFromPushLog } from "./utils/subscription.mjs";
import { withImageId, matchIdOrUrlWithImages } from "./utils/image-ids.mjs";
import { createPublisher } from "./utils/publish.mjs";
import { createDiscordClient } from "./utils/discord.mjs";
import { sleep } from "./utils/sleep.mjs";
dotenv.config();

const STARTUP_DELAY = 10 * 1000;
const LOG_PATH = process.env.LOG_PATH || "./logs";
const BOT_TOKEN = process.env.BOT_TOKEN;
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: `${LOG_PATH}/app.log`,
    }),
  ],
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
        winston.format.printf((i) =>
          winston.format
            .colorize()
            .colorize(
              i.level,
              `[${i.timestamp}] [${i.level}] ${[i.message, [i.type, i.id].filter(Boolean).join("-")]
                .filter(Boolean)
                .join(" - ")}`
            )
        )
      ),
    })
  );
}
console.log = (...args) => logger.info.call(logger, ...args);
console.info = (...args) => logger.info.call(logger, ...args);
console.warn = (...args) => logger.warn.call(logger, ...args);
console.error = (...args) => logger.error.call(logger, ...args);
console.debug = (...args) => logger.debug.call(logger, ...args);

p.on("SIGINT", () => {
  console.log("Closing");
  p.exit(0);
});

await storage.init({
  dir: "storage/",
  stringify: JSON.stringify,
  parse: JSON.parse,
  encoding: "utf8",
});

const images = rawImages.map(withImageId);
const subscriptions = (await storage.getItem("subscriptions")) || [];

let publisher;

function maintainImageQueue(subscription) {
  if (subscription.empty) {
    return subscription;
  }

  if (subscription.imageQueue.length) {
    return subscription;
  }

  const ids = images.map((i) => i.id);
  subscription.imageQueue = [];
  let i = ids.length - 1;

  for (i; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    const temp = ids[i];
    ids[i] = ids[j];
    ids[j] = temp;
  }

  ids.some((id) => {
    if (!subscription.pushedImages.includes(id)) {
      subscription.imageQueue.push(id);
    }
    if (subscription.imageQueue.length >= subscription.bufferSize) {
      return true;
    }

    return false;
  });

  if (subscription.imageQueue.length < subscription.bufferSize) {
    subscription.empty = true;
  }

  return subscription;
}

async function subscriptionMain(subscription, i) {
  if (Date.now() < subscription.interval + subscription.lastPush) {
    console.debug({
      message: "Interval not passed, skipping",
      type: subscription.type,
      id: subscription.channel || subscription.hookId,
      lastPush: subscription.lastPush,
    });
    return subscription;
  }

  let newSub = maintainImageQueue(subscription);

  const imageId = newSub.imageQueue.shift();
  const image = images.find((image) => image.id === imageId);

  if (!image && newSub.empty) {
    console.warn({
      message: "Subscription is not empty, skipping",
      type: newSub.type,
      id: newSub.channel || newSub.hookId,
    });
    return newSub;
  }

  console.log({
    message: "Pushing image",
    type: subscription.type,
    id: subscription.channel || subscription.hookId,
    imageId: image.id,
    imageUrl: image.url,
  });

  if (image && image.creator && image.url && image.title && image.source) {
    newSub.pushedImages.push(image.id);
    newSub.lastPush = Date.now();
    await logImagePush(
      `${LOG_PATH}/subscription_${newSub.type}_${newSub.channel || newSub.hookId}.log`,
      image
    );
    publisher.publishImage({
      subscription: newSub,
      image,
    });
  }

  return newSub;
}

async function main() {
  console.debug("Checking subscription statuses");
  await Promise.all(
    subscriptions.map(async (sub, i) => {
      subscriptions[i] = await subscriptionMain(sub, i);
    })
  );
  console.debug("Done checking subscription statuses");

  await storage.setItem("subscriptions", subscriptions);

  await sleep(10 * 1000);
  main();
}

async function init() {
  let discordClient;
  console.debug("Connecting to discord");
  discordClient = await createDiscordClient({
    token: BOT_TOKEN,
  })
    .then((e) => {
      console.log("Connected to discord");
      return e;
    })
    .catch((e) => {
      console.warn("Unable to connect to discord, webhooks will still work");
    });

  publisher = createPublisher({ discordClient });

  await Promise.all(
    // Combine status from storage with information from logs.
    // This is mainly useful to make sure we pick up what images have actually
    // been pushed in cases where information is missing from normal storage.
    subscriptions.map(async (sub, i) => {
      // Urls are useful if ids change, since they are essentially GUIDs
      const { ids, urls, lastPush } = await getStateFromPushLog(
        `${LOG_PATH}/subscription_${sub.type}_${sub.channel || sub.hookId}.log`
      );
      subscriptions[i] = {
        ...sub,
        pushedImages: Array.from(
          new Set([
            ...sub.pushedImages,
            ...matchIdOrUrlWithImages([...ids, ...urls], images).map((i) => i.id),
          ])
        ),
        lastPush: Math.max(lastPush, sub.lastPush),
      };

      console.log({
        message: "Loaded subscription from state and log",
        type: sub.type,
        id: sub.channel || sub.hookId,
        previouslyPushedImages: subscriptions[i].pushedImages.length,
      });
    })
  );

  // Store subscriptions after update from logfiles
  await storage.setItem("subscriptions", subscriptions);

  console.debug(
    `Will look for image to push in ${
      STARTUP_DELAY / 1000
    } seconds.\nImages will be pushed every X seconds based on the individual subscription.\nLast chance to abort!`
  );
  await sleep(STARTUP_DELAY);

  main();
}

init();
