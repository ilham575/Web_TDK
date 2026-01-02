# Multi-stage Dockerfile to build React app and serve with nginx

FROM node:18-alpine AS builder
WORKDIR /app

# install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --silent --legacy-peer-deps || npm install --silent --legacy-peer-deps

# copy source and build
COPY . .
# allow injecting the API base at build-time so CRA picks up REACT_APP_* vars
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
