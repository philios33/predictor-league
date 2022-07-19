#!/bin/bash

# Please run this on a separate cron
# Note: This is now obsolete as the notifications runner is now part of the main server process
cd "$(dirname "$0")"

docker exec predictor-league_predictor_1 node /home/node/serverDist/notificationsRunner.js


