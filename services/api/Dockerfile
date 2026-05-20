FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
# TypeScript build only emits .js into dist/. Copy the non-TS runtime assets
# (email templates, uploads, static files) into dist/ so the compiled code's
# path resolution (__dirname/../views/...) finds them.
RUN cp -r src/views dist/views \
    && cp -r src/clientsUploads dist/clientsUploads 2>/dev/null || true \
    && cp -r src/uploads dist/uploads 2>/dev/null || true

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 4001
CMD ["node", "dist/server.js"]
