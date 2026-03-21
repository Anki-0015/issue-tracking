FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm ci
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["node", "dist/index.js"]
