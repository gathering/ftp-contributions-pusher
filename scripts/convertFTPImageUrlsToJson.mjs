#!/usr/bin/env node

import { writeFileSync, readFileSync } from "fs";
import { dirname, basename } from "path";

const urls = readFileSync("./ftp-image-urls").toString("utf8");

function titleCase(title = "") {
  const words = title.split(" ");
  return words
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.substr(1))
    .join(" ");
}

function removePlacement(string = "") {
  return string.replace(/^\d{0,3}\s?[\.\-\s]?/, "");
}

// Parses files of 'this_is_my_title_by_kari_normann_aka_kari' patterns
function parseWithByPattern(filename = "") {
  const parts = filename.replace(/[_|-]/g, " ").split(" by ");
  return {
    title: titleCase(removePlacement(parts?.[0])),
    creator: parts?.[1] || "",
  };
}

// Parses files of 'TGXX_This_Is_My_Title_KariNormann' patterns
function parseWithCreatorSuffixPattern(filename = "") {
  const parts = filename.split(/[_|-]/);
  return {
    title: parts.slice(1, -1).join(" "),
    creator: parts.slice(-1).join(" "),
  };
}

// Parses files of 'kari_normann_-_this_is_my_title' and similar patterns
function parseWithSeparator(
  filename = "",
  titleFirst = true,
  separator = " - "
) {
  const parts = filename.replace(/_/g, " ").split(separator);
  if (parts.length !== 2) {
    return { title: "", creator: "" };
  }
  return {
    title: titleCase(parts?.[titleFirst ? 0 : 1]),
    creator: titleCase(parts?.[titleFirst ? 1 : 0]),
  };
}

function parseCreditsFromUrl(url = "") {
  const year = parseInt(url.split("/")?.[4] || "", 10);
  const filename = basename(url).split(".").slice(0, -1).join(".");

  if (/[_-\s]by[_-\s]/.test(filename)) {
    return parseWithByPattern(filename);
  } else if (filename.includes("_-_")) {
    if (year <= 2006) {
      return parseWithSeparator(filename, false);
    }
    return parseWithSeparator(filename, true);
  } else if (!filename.includes("-") && filename.includes("_")) {
    return parseWithCreatorSuffixPattern(filename);
  } else if ([2011, 2012].includes(year) && /^\d{0,3} /.test(filename)) {
    return parseWithSeparator(removePlacement(filename), true, "-");
  }
}

const images = urls
  .split("\n")
  .map((url) => {
    const image = {
      url: url.replace(/ /g, "%20"),
      source: dirname(url),
    };

    const { creator, title } = parseCreditsFromUrl(url) || {};

    // Don't consider partial credits (either just title or just name as good enough)
    if (creator && title) {
      image.creator = creator;
      image.title = title;
    }

    return image;
  })
  // Remove any item without author credits
  .filter(({ creator }) => !!creator && creator !== "Unknown");

images.push({
  title: "TG22 tema-teaser",
  creator: "Rick Astley",
  url:
    "https://ia801602.us.archive.org/11/items/Rick_Astley_Never_Gonna_Give_You_Up/Rick_Astley_Never_Gonna_Give_You_Up.mp4",
  source: "https://archive.org/details/Rick_Astley_Never_Gonna_Give_You_Up",
});

writeFileSync("images.json", Buffer.from(JSON.stringify(images)));
