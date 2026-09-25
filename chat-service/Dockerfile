FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# npm install's Prisma postinstall hook doesn't reliably fire in Docker's
# build layering, leaving node_modules/.prisma/client as unusable stubs —
# generate explicitly so the image always ships a real, correctly-targeted
# (native to this container's platform) query engine.
RUN npx prisma generate

EXPOSE 5005

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
