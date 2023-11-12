#!/bin/bash

# Please run this on a separate cron every 5 minutes during the afternoon and evening

cd "$(dirname "$0")"

docker exec predictor-league_predictor_1 node /home/node/serverDist/importFinalScores.js


