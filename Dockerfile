FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json ./

RUN npm install --registry=https://registry.npmmirror.com

# 复制项目文件
COPY . .

# 构建生产版本
RUN npm run build

# 生产镜像
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/.output ./.output

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", ".output/server/index.mjs"]
