# FTP Contributions Pusher

## How to use

1. Make sure you have a populated images.js file (or generate one from ./scripts)
2. Add a `.env` with preferred config (see `.env.example`)
3. Populate `storage/2d5d14f95af035cbd8437948de61f94c` with your initial subscriptions
4. Add any existing subscriptions push logs to log folder (configure from env)
5. `npm i` to install dependencies
6. `./app.mjs` to run code

### Populate `storage/2d5d14f95af035cbd8437948de61f94c`

We use `node-persist` to store subscriptions between startups, and when moving installation from one
location to another. This is, in practice, just very basic stringified json file.

There are currently no tools for adding new subscriptions (might make some simple CLI or bot
commands for managing them as needed), so populating this file is the main way to manage
subscriptions.

To get started copy the `2d5d14f95af035cbd8437948de61f94c.example` file to `storage/2d5d14f95af035cbd8437948de61f94c`. It contains examples of webhook and
channel type subscriptions. Minimal setup to just use webook:

1. Remove `discord-channel` line
2. Add a unique string to `hookId` on `discord-webook` line
3. Add the actual webook url to `hookUrl` on `discord-webook` line
4. Modify `interval` on `discord-webhook` line to preferred interval (ex 60000 for one image per minute, 60 seconds \* 1000 ms)
5. Merge everything to one line, making sure to remove empty spaces (where line breaks used to be)
6. On initial startup app will check for existing log file (to see which images might have already been pushed), then push first image
