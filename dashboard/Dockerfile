FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY dashboard/ ./dashboard/
COPY packages/types/ ./packages/types/

RUN npm install --workspace=dashboard --workspace=@ledgermind/types
RUN npm run build --workspace=@ledgermind/types
RUN npm run build --workspace=dashboard

FROM node:20-alpine

RUN npm install -g serve

COPY --from=builder /app/dashboard/dist /app/dist

EXPOSE 3001

CMD ["serve", "-s", "/app/dist", "-l", "3001"]
