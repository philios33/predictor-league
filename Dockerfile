FROM node:16-alpine

WORKDIR /home/node/
USER node

COPY --chown=node ./package*.json ./
RUN npm ci

COPY --chown=node ./src ./src/
COPY --chown=node ./server ./server/
COPY --chown=node .babelrc tsconfig.json webpack*.ts ./
COPY --chown=node ./keys ./keys/

# Break the cache here by copying the special signals file to trigger a redeploy, even if code hasn't changed
COPY --chown=node ./signals/redeploy.txt ./signals/redeploy.txt

RUN npm run buildAll

CMD ["node", "/home/node/serverDist/index.js"]
