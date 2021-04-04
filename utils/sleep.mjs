export async function sleep(ms) {
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
