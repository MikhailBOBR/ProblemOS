FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server ./server
COPY web ./web
COPY docs ./docs
COPY README.md ./

ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080
ENV DATA_FILE=/app/server/data/problem-os.json
ENV UPLOAD_ROOT=/app/server/data/uploads
ENV BACKUP_ROOT=/app/server/data/backups

EXPOSE 8080

CMD ["node", "server/src/index.js"]
