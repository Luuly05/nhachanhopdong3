# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of application
COPY . .

# Check src/main.tsx exists
RUN test -f /app/src/main.tsx || (echo "ERROR: src/main.tsx is missing..." && exit 1)

# Build static assets
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
