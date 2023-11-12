#!/bin/bash

# Please run this on a separate cron, perhaps once a day at 11:00 (to start with at least)

cd "$(dirname "$0")"

docker exec predictor-league_predictor_1 node /home/node/serverDist/checkSchedule.js


