FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
COPY backend ./backend
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
RUN npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --chown=node:node backend ./backend
COPY --chown=node:node frontend/src ./frontend/src
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "backend/server.js"]
