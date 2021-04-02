#!/usr/bin/env node

import { images } from "./images.mjs";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import readline from "readline";
const appendFile = fs.promises.appendFile;
dotenv.config();

const PUSH_INTERVAL = process.env.PUSH_INTERVAL;
const HOOK_URL = process.env.HOOK_URL;

let pushedImages = [];
let pushedCount = 0;

async function readPushedImages() {
  return new Promise(async (resolve, reject) => {
    const fileStream = fs.createReadStream("./pushed.log");
    const rl = readline.createInterface({
      input: fileStream,
    });

    for await (const line of rl) {
      const id = parseInt(line.split(" | ")?.[0] || "", 10);

      if (id) {
        pushedImages.push(id);
      }
    }

    resolve();
  });
}

function publishImageInformation(image) {
  fetch(HOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          title: image.title,
          author: { name: image.creator },
          image: {
            url: image.url,
          },
          footer: {
            text: `Check out this masterwork of a competition entry, and others like it at ${image.source}\n\n (This message was automatically generated based on ftp path and filename)`,
          },
        },
      ],
    }),
  });
}

async function sleep(ms) {
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function main() {
  let candidate;
  do {
    candidate = Math.floor(Math.random() * images.length);
  } while (pushedImages.includes(candidate));

  const image = images[candidate];

  console.log(`Pushing image to discord webook: ${image?.url || image?.title}`);
  if (image && image.creator && image.url && image.title && image.source) {
    pushedImages.push(candidate);
    await appendFile(
      "./pushed.log",
      Buffer.from(`${candidate} | ${image.url}\n`)
    );
    publishImageInformation(image);
    pushedCount++;
  }

  console.log(
    `Waiting for ${
      PUSH_INTERVAL / 1000
    } seconds before pushing next image. We have pushed ${pushedCount} images in total.\n`
  );
  await sleep(PUSH_INTERVAL);
  main();
}

if (!PUSH_INTERVAL || !HOOK_URL) {
  console.error(
    "Both push interval and hook url needs to be configured, check your .env file"
  );
} else {
  console.log("Loading list of previously pushed images");
  await readPushedImages();
  pushedCount = pushedImages.length;
  console.log(`Found ${pushedCount} previously pushed images\n`);

  console.log(
    `Will push first image in 20 seconds.\nImages will be pushed every ${
      PUSH_INTERVAL / 1000
    } seconds.\nLast chance to abort!\n`
  );
  await sleep(20 * 1000);

  main();
}
