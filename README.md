
# Predictor League

This is a website to help with predictor points calculations.  Players can login and save their predictions.  A results page shows the history of the standings as well as what every other player predicted.  Predictions are private and will not be displayed before a scheduled kick off time.  Schedule, scores and predictions are all held on a Google Sheet which is read by the builder.  There is a complicated points system which includes a banker (AKA joker) which you must play every week.  The banker multiplier is based on the standings at the start of that week.  Many edge cases exist relating to rescheduled games, e.g. What if a player played their banker on a cancelled game.  Fixtures cannot move from the week they were originally scheduled in.  All games in the EPL will eventually get played or a "default" score assigned by the Premier League.

## Docker commands

docker build -t predictor .

docker run -t -i -p 8081:8081 predictor

docker-compose up --build

## Other ideas

Lads Table
    Show a league table of points with a weeks slider so we can see trends in an interactive way

League Table
    Choose Type: Real, Phil's Predictions, Mike's predictions, etc
    Show a league table of the PL with a weeks slider

How can we give an alert that predictions need to be filled in soon?
    Have a top level coloured bar component that says:
        Warning: Please complete your week 2 predictions, Arsenal vs Brentford kicks off in 2 days, 4 hours
        OK: All of your predictions for the upcoming Week 2 & Week 7 matches are saved

PL table
    If final scores have come in since the end of last week, we are halfway through a week.  Add a checkbox for: Include X results since <end of previous weeks last match>
    Have a checkbox for "distinguish home & away"
    Show home/away form graphics

    Put current league positions next to the teams by using the data from the previous week (hide the positions if any matches have been played and the positions could be different)
    Nice to have a show table link next to each game (perhaps in the results column) which just takes you to the table and highlights the two teams playing.
        This can always be there since we have the checkbox.


## Role ideas

Most points - Heavyweight Title

Most perfect scores - Score king - He really knows the score
Most correct GD results - The statistician - He knows the goal difference
Most correct results - Pools master - He should play the pools more often

Most correct home win predictions - Home boy - He loves a home win
Most correct draw predictions - Draw master - He loves a draw
Most correct away win predictions - Away fan - He loves an away win

Most banker points - Confidence king - He loves to commit
Longest banker streak - Show boater - He just keeps getting them right

Highest weekly points - Top Gun - When he goes, he goes big
Lowest weekly points - Limbo champion - When he goes low, he goes very low

## Prize with description

Team belts - Best at predicting the score of Team XXX

The Arsenal Gun collection
The Aston Villa Villa
The Brentford Ford
The Brighton & Hove Alpen
The Burnley Burns ward (search simpsons burns ward)
The Chelsea Bun
The Crystal Palace Palace
The Everton Evergreen
The Leeds Dog lead
The Leicester Red Leicester
The Liverpool Swimming pool
The Manchester City Toilet
The Manchester United Unicycle
The Newcastle Castle
The Norwich City Canary Cage
The Southampton Plankton
The Tottenham Hotspur spurs
The Watford junction
The West Ham Ham
The Wolverhampton Wanderers Zimmer frame
