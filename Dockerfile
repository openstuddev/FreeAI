FROM node:20-bookworm-slim AS base

WORKDIR /app

# better-sqlite3 needs build tools at install time.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# data/ is mounted at runtime; create the dir so the path exists pre-mount.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
