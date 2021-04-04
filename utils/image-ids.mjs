import { dirname, basename } from "path";

// This ignores any existing id on image obj
export const generateImageId = ({ url }) => {
  let id = [];
  if (url.includes("ftp.gathering.org")) {
    const parts = dirname(url).split("/");

    const year = parts[4] || "unknown";
    const compo = parts.pop() || "unkown";
    const filename = basename(url).split(".").slice(0, -1).join(".");

    id = [year, compo, filename];
  }

  return id
    .map((part) => part.replace(/[\W-_\ ]/g, ""))
    .join("-")
    .toLowerCase();
};

export const withImageId = (image) => ({
  id: generateImageId(image),
  ...image,
});

export const matchIdOrUrlWithImages = (ids = [], images = []) => {
  const imageMap = {};
  images.forEach((image) => {
    imageMap[image.id] = image;
    imageMap[image.url] = image;
  });

  return ids.reduce((matched, id) => {
    if (imageMap[id]) {
      matched.push(imageMap[id]);
    }
    return matched;
  }, []);
};
