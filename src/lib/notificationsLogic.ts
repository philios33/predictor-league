
// Contains logic for fetching the current active notifications such as prediction soft/hard warnings
// Later on, we might want to create more types of notifications here

//import moment from "moment-mini";
import moment from "moment-timezone";
import GoogleAuth from "./googleAuth";
import { Notification } from "./notifications";
import { getPlayerNames } from "./players";
// import { getCachedResults } from "../lib/predictor/cachedResults";
import { getAllUserPredictions } from "./predictor/predictions";
import { PredictionFixture, UserPredictions } from "./types";
import { fetchUserNotificationSubscription } from "./subscription";
import { getCachedMatchSchedule } from "./predictor/cached";

const allPlayers = getPlayerNames();
// const results = getCachedResults();
// We can't use the cached results to fetch the upcoming matches, that is silly
const fixtures = getCachedMatchSchedule();

type ScheduledFixture = {
    homeTeam: string
    awayTeam: string
    kickOff: Date
    weekId: string
}

export async function runNotificationsLogic(gauth: GoogleAuth, enqueueNotification: (uniqueKey: string, meta: any) => Promise<void>) {

    // Get all user predictions now
    const playerPredictions: Record<string, UserPredictions> = {};
    for(const player of allPlayers) {
        const playerData = await getAllUserPredictions(gauth, player);
        playerPredictions[player] = playerData;
    }
    
    const upcomingMatches: Array<ScheduledFixture> = [];
    const upcomingDays = 4;
    const now = moment();
    const todaysDate = now.format("YYYY-MM-DD");
    const upcomingLimit = moment().add(upcomingDays, "days");

    // This just gets the upcoming kickoffs
    for (const homeTeam in fixtures.matches) {
        const awayTeams = fixtures.matches[homeTeam].against;
        for (const awayTeam in awayTeams) {
            const thisMatch = awayTeams[awayTeam];
            const kickOff = new Date(thisMatch.kickOff);
            if (upcomingLimit.isAfter(kickOff) && now.isBefore(kickOff)) {
                upcomingMatches.push({
                    homeTeam,
                    awayTeam,
                    kickOff,
                    weekId: thisMatch.weekId,
                });
            }
        }
    }

    upcomingMatches.sort((a, b) => {
        return a.kickOff.getTime() - b.kickOff.getTime();
    });

    const softLimit = moment().add(1, "days"); // Soft
    const hardLimit = moment().add(2, "hours"); // Hard

    // console.log("Checking predictions for the next " + upcomingMatches.length + " matches which occur betweeen now and the next " + upcomingDays + " days");
    
    // console.log(JSON.stringify(upcomingMatches, null, 4));
    

    for (const player of allPlayers) {
        // console.log("Doing player: " + player);
        const predictions = playerPredictions[player];
        let predicted = 0;
        const unpredicted: Array<ScheduledFixture> = [];
        for (const match of upcomingMatches) {
            // console.log("Doing match: " + match.homeTeam + " vs " + match.awayTeam);
            if (match.homeTeam in predictions.homeTeams && match.awayTeam in predictions.homeTeams[match.homeTeam].against) {
                // const prediction = predictions.homeTeams[match.homeTeam].against[match.awayTeam];
                // console.log("We have this prediction", prediction);
                // We have this prediction
                predicted++;
            } else {
                unpredicted.push(match);
            }
        }

        if (unpredicted.length > 0) {
            // New notification is necessary
            let title: string | null = null;
            let message: string | null = null;
            let type: string | null = null;
            let uniqueKey: string | null = null;

            const firstUnpredictedKickoff = new Date(unpredicted[0].kickOff);
            if (hardLimit.isAfter(firstUnpredictedKickoff)) {
                type = "PREDICTION-REMINDER-HARD";
                uniqueKey = type + "_" + player + "_" + todaysDate;
                // Within hard limit
                if (unpredicted.length === 1) {
                    // Only 1 is missing
                    const unpredictedMatch = unpredicted[0];
                    title = "Missing Upcoming Prediction";
                    message = "Warning: You haven't predicted " + unpredictedMatch.homeTeam + " vs " + unpredictedMatch.awayTeam + " yet and it kicks off at " + moment(unpredictedMatch.kickOff).tz("Europe/London").format("h:mm A") + ".  Missed predictions score -1 points each.";
                } else {
                    // Many missing
                    title = "Missing Upcoming Predictions";
                    message = "WARNING: You haven't filled in predictions for " + unpredicted.length + " upcoming matches and the next match kicks off at " + moment(unpredicted[0].kickOff).tz("Europe/London").format("h:mm A") + ", please check the website.  Missed predictions score -1 points each.";
                }

            } else if (softLimit.isAfter(firstUnpredictedKickoff)) {
                // Within soft limit
                type = "PREDICTION-REMINDER-SOFT";
                uniqueKey = type + "_" + player + "_" + todaysDate;
                title = "Predictor Reminder";
                message = "Please fill in your predictor predictions.  You have entered " + predicted + " of " + upcomingMatches.length + " predictions for fixtures occurring within the next " + upcomingDays + " days.  Please check the website.";

            } else {
                // Unpredicted matches are far away, no notification required for this player
                // console.log("This unpredicted fixture is far away: " + firstUnpredictedKickoff);
            }

            if (uniqueKey !== null && type !== null) {

                const notificationSub = await fetchUserNotificationSubscription(gauth, player);

                // console.warn("Will enqueue notification: " + uniqueKey);
                // process.exit(1);
                
                await enqueueNotification(uniqueKey, {
                    type,
                    player,
                    title,
                    message,
                    notificationSub,
                    ttl: 3 * 24 * 60 * 60, // Just use a TTL of 3 days so that notifications don't get too stale
                    // We don't really want to timeout a notification after the relevant time period since we want to show that a notification is there.
                });
                
            }
        } else {
            // console.log("Player has no unpredicted fixtures");
        }
    }
}

