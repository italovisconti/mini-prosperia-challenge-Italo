# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json .
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache graphicsmagick ghostscript
COPY --from=builder /app/dist ./dist
COPY package*.json .
COPY .env ./.env
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/server.js"]
