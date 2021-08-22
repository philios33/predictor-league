FROM node:14-alpine

WORKDIR /home/node/

COPY ./package*.json ./
RUN npm ci

COPY ./src ./src/
COPY ./server ./server/
COPY .babelrc tsconfig.json tsconfigServer.json webpack*.ts ./
COPY ./keys ./keys/


# TODO Break the cache here by copying a special file

RUN npm run buildData
RUN npm run buildResults
RUN npm run buildClient
RUN npm run buildServer

CMD ["node", "/home/node/serverDist/index.js"]
