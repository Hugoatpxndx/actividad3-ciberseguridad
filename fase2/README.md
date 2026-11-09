# Fase 2 · Seguridad de contenedores con Docker + Trivy

![Docker](https://img.shields.io/badge/Docker-29.9-2496ED?logo=docker&logoColor=white)
![Trivy](https://img.shields.io/badge/Trivy-0.76-1904DA)
![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=nodedotjs&logoColor=white)

Comparación de una imagen vulnerable (`node:14`) contra una imagen corregida (`node:18-alpine`).

## Resultado del escaneo

| Imagen | SO | Paquetes Node/npm | Total | Críticas | Altas |
|---|---:|---:|---:|---:|---:|
| `act3-app:node14` | 566 | 29 | **595** | **23** | **572** |
| `act3-app:node18` | 0 | 0 | **0** | **0** | **0** |

**Mitigación aplicada:** actualización a `node:18-alpine`, `apk upgrade`, build multi-stage, eliminación de `npm`/`npx` del runtime y ejecución con usuario `node`.

## Archivos

| Archivo | Descripción |
|---|---|
| `Dockerfile.vulnerable` | Imagen base `node:14`, usada para el primer escaneo |
| `Dockerfile` | Imagen final `node:18-alpine`, multi-stage y sin npm |
| `evidencias/trivy-node14.txt` | Reporte completo de la imagen vulnerable |
| `evidencias/trivy-node18.txt` | Reporte final sin vulnerabilidades |
| `evidencias/docker-build-node14.txt` | Build de la imagen vulnerable |
| `evidencias/docker-build-node18.txt` | Build de la imagen corregida |
| `evidencias/prueba-contenedor.txt` | Prueba de ejecución y healthcheck |

## Ejecución

```bash
# Imagen vulnerable
docker build -f Dockerfile.vulnerable -t act3-app:node14 .
trivy image --severity CRITICAL,HIGH act3-app:node14

# Imagen corregida
docker build -f Dockerfile -t act3-app:node18 .
trivy image --severity CRITICAL,HIGH act3-app:node18

# Prueba
docker run --rm -p 3001:3000 act3-app:node18
curl http://localhost:3001/health
```

## Dockerfile final

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:18-alpine
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
ENV NODE_ENV=production
USER node
CMD ["node", "server.js"]
```

> **Nota:** la actividad pide `node:18`. A noviembre de 2026 Node 18 ya está fuera de soporte; en un proyecto real se recomienda `node:22-alpine` o superior. Se mantuvo `node:18` para cumplir la comparación solicitada.
