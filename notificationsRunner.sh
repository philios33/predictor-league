#!/bin/bash

# Please run this on a separate cron

cd "$(dirname "$0")"

docker exec predictor-league_predictor_1 node /home/node/serverDist/notificationsRunner.js


