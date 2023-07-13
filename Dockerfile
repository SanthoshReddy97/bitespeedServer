# Builds the nestjs project which will install dev dependencies too
FROM node:18-alpine as builder

WORKDIR /app

COPY .. .

RUN npm ci

RUN npm run build

# Here we only build the dependencies and build the production serevr
FROM node:current-alpine3.18

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

CMD [ "node", "dist/main.js" ]
