FROM node:14-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:14-alpine

WORKDIR /usr/src/app
COPY --from=builder /usr/src/app /usr/src/app

CMD ["./app.mjs"]
