FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npm install

EXPOSE 5005

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
