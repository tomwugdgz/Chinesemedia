# Multi-stage build for mediaplaner
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码并执行生产打包
COPY . .
RUN npm run build

# 生产运行环境 (Nginx Alpine)
FROM nginx:alpine

# 拷贝构建产物与配置
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
