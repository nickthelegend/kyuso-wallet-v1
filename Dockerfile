FROM node:20-alpine

WORKDIR /app

# Install build dependencies if needed for any native packages (though current package.json looks standard)
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4000

CMD ["node", "server/index.js"]
