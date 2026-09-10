FROM node:22-alpine

WORKDIR /app

# Habilita pnpm (viene con Node vía corepack, no hay que instalarlo aparte)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiamos solo los manifiestos primero para aprovechar la cache de Docker:
# si no cambias dependencias, no vuelve a instalar en cada build.
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# El resto del código se monta como volumen en dev (ver docker-compose.dev.yml),
# así que este COPY solo importa para builds sin volumen (ej. producción).
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--", "--host", "0.0.0.0"]
