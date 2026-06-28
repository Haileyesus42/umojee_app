FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_BACKEND_URL
ARG VITE_BACKEND_URL_CLI
ARG VITE_FRONTEND_URL
ARG VITE_COMPANY_EMAIL

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BACKEND_URL_CLI=$VITE_BACKEND_URL_CLI
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_COMPANY_EMAIL=$VITE_COMPANY_EMAIL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
