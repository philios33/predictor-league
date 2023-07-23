
# Predictor League

This is a website to help with predictor points calculations.  Players can login and save their predictions.  A results page shows the history of the standings as well as what every other player predicted.  Predictions are private and will not be displayed before a scheduled kick off time.  Schedule, scores and predictions are all held on a Google Sheet which is read by the builder.  There is a complicated points system which includes a banker (AKA joker) which you must play every week.  The banker multiplier is based on the standings at the start of that week.  Many edge cases exist relating to rescheduled games, e.g. What if a player played their banker on a cancelled game.  Fixtures cannot move from the week they were originally scheduled in.  All games in the EPL will eventually get played or a "default" score assigned by the Premier League.

## Docker commands

sudo docker build --build-arg LOCALDEV=yes -t predictor .

sudo docker run --rm --env-file .env -v `pwd`/signals:/home/node/signals -v `pwd`/logs:/home/node/logs -v `pwd`/uploads:/home/node/uploads --name predictor-league_predictor_1 -t -i -p 8081:8081 predictor

## Server startup command

sudo docker-compose up --build 

## Test sidecar scripts while running in docker

You can launch these with the local .sh scripts:

./liveScores.sh

./autoRedeploy.sh (Don't test this locally, unless you are using docker-compose)

./checkSchedule.sh

## Or manually natively

nodejs ./serverDist/checkSchedule.js


