FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/

# Copy frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Copy database schema
COPY database/ ./database/

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]
