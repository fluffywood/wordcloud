FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
COPY docs ./docs
RUN npm run build

FROM node:22-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5173 \
    WORDCLOUD_DATA_FILE=/app/data/wordcloud.json

WORKDIR /app
COPY server.mjs ./
COPY src/config ./src/config
COPY src/lib/text.js ./src/lib/text.js
COPY --from=build /app/dist ./dist

VOLUME ["/app/data"]
EXPOSE 5173
CMD ["node", "server.mjs"]
