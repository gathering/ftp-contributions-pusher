import fs from "fs";
import readline from "readline";
const appendFile = fs.promises.appendFile;

export const logImagePush = async (path, image) => {
  if (!path) {
    console.error("No path specified when trying to write pushed image to log, skipping");
  }

  await appendFile(path, Buffer.from(`${[image.id, image.url, Date.now()].join(" | ")}\n`));

  return true;
};

export const getStateFromPushLog = async (path) => {
  const ids = [];
  const urls = [];
  const whens = [];

  if (!fs.existsSync(path)) {
    console.warn(`No existing log file found at ${path}, no historic state recovered from log`);
    return {
      ids,
      urls,
      lastPush: 0,
    };
  }

  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({
    input: fileStream,
  });

  for await (const line of rl) {
    const [id, url, when] = line.split(" | ");

    ids.push(id);
    urls.push(url);
    whens.push(parseInt(when || "0", 10));
  }

  return {
    ids,
    urls,
    lastPush: whens.reduce((max, when) => (when > max ? when : max), 0),
  };
};
