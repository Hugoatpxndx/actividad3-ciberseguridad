# Etapa 1: instalar solo dependencias de producción
FROM node:18-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Etapa 2: imagen final mínima
FROM node:18-alpine

# Actualiza paquetes del sistema y elimina npm/npx del runtime:
# la aplicación no los necesita y así se reduce la superficie de ataque.
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm \
              /usr/local/bin/npx \
              /usr/local/bin/corepack

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./

ENV NODE_ENV=production
EXPOSE 3000
USER node

CMD ["node", "server.js"]
