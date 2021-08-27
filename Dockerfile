FROM node:14-alpine

WORKDIR /home/node/

COPY ./package*.json ./
RUN npm ci

COPY ./src ./src/
COPY ./server ./server/
COPY .babelrc tsconfig.json webpack*.ts ./
COPY ./keys ./keys/

# Break the cache here by copying the special signals file to trigger a redeploy, even if code hasn't changed
COPY ./signals/redeploy.txt ./signals/redeploy.txt

RUN npm run buildData
RUN npm run buildResults
RUN npm run buildClient
RUN npm run buildServer

CMD ["node", "/home/node/serverDist/index.js"]
