FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5005

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
