# FTP Contributions Pusher

## How to use

1. Make sure you have a populated images.js file (or generate one from ./scripts)
2. Add a `.env` with webhook and interval to use (see `.env.example`)
3. Add a `./pushed.log` file with images that have already been pushed (these use array indexes, so different per `images.js` file)
4. `npm i` to install dependencies
5. `./app.mjs` to run code
