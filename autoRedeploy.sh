#!/bin/bash

cd "$(dirname "$0")"

docker exec predictor-league_predictor_1 node /home/node/serverDist/redeployChecker.js

retVal=$?
if [ $retVal -eq 5 ]; then
    echo "5 returned, do a redeploy..."
    source redeploy.sh
else
    echo "$retVal returned, not deploying"
fi

