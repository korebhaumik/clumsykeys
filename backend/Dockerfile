FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@12.18.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm --filter clumsy-keys-server install --frozen-lockfile

COPY backend/src backend/src
COPY backend/tsconfig.json backend/tsconfig.json
RUN pnpm --filter clumsy-keys-server build
RUN pnpm --filter clumsy-keys-server --prod deploy /runtime

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=1440

COPY --from=build /runtime/package.json ./package.json
COPY --from=build /runtime/build ./build
COPY --from=build /runtime/node_modules ./node_modules

USER node
EXPOSE 1440
CMD ["node", "build/app.js"]
