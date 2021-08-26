#!/bin/bash

cd "$(dirname "$0")"

docker exec -i -t predictor-league_predictor_1 node /home/node/serverDist/redeployChecker.js

retVal=$?
if [ $retVal -eq 5 ]; then
    echo "5 returned, do a redeploy..."
    #git pull
    #docker-compose build
    #docker-compose up -d
else
    echo "$retVal returned, not deploying"
fi

