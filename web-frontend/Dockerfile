# 星屿 Web 前端 - 多阶段构建
# 阶段1: Node.js 构建
FROM node:20-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段2: Nginx 运行时
FROM nginx:alpine
COPY --from=builder /build/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
