FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

COPY chat-service-docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/chat-service-docker-entrypoint.sh

EXPOSE 5005

ENTRYPOINT ["chat-service-docker-entrypoint.sh"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]