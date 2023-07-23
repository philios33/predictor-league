FROM node:16-alpine

WORKDIR /home/node/

RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*

USER node

COPY --chown=node:node ./package*.json ./
RUN npm config set python /usr/bin/python3
RUN npm ci

COPY --chown=node:node ./src ./src/
COPY --chown=node:node ./server ./server/
COPY --chown=node:node .babelrc tsconfig.json webpack*.ts ./
COPY --chown=node:node ./keys ./keys/

# Break the cache here by copying the special signals file to trigger a redeploy, even if code hasn't changed
COPY --chown=node:node ./signals/redeploy.txt ./signals/redeploy.txt

ARG LOCALDEV
ENV LOCALDEV=$LOCALDEV

RUN npm run buildAll

CMD ["node", "/home/node/serverDist/index.js"]
