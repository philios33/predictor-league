// Schedule a weeks matches based on dates

import { grabPLMatches } from '../lib/bbc';
import GoogleAuth from "../lib/googleAuth";
import { getCachedMatchSchedule } from '../lib/predictor/cached';
import { writeFixture } from '../lib/writer';

export {}

// Week 27 Arsenal vs Liverpool will be blank if either team reach the FA Cup 5th round

console.log("Note: All matches are now scheduled, you shouldn't need to run this ever again");
const quitNow = () => {
    process.exit(1);
}
quitNow();

const dryRun: boolean = false;
const expectedMatches = 10;
const weekId: string = "38";
const dates: Array<string> = ["2022-05-22"];

// Note: This script now uses the cached match schedule, so make sure the cache is built with...
// Run: npm run buildData
// Run: npx ts-node ./src/scripts/scheduleMatches.ts


const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

const schedule = getCachedMatchSchedule();

(async () => {
    try {
        console.log("Logging in...");
        await gauth.start();
        console.log("Logged in!");

        const matches = await grabPLMatches(dates);

        console.log("MATCHES", matches);

        if (matches.length === expectedMatches) {
            console.log("SUCCESS, found " + expectedMatches + " matches for week: " + weekId);

            // Check that all teams have played 1 match in this week before writing the fixtures.
            let uniqueTeams: Record<string, number> = {};
            for (const match of matches) {
                if (match.homeTeam in uniqueTeams) {
                    throw new Error("This team is already playing another game this week: " + match.homeTeam);
                }
                uniqueTeams[match.homeTeam] = 1;
                if (match.awayTeam in uniqueTeams) {
                    throw new Error("This team is already playing another game this week: " + match.awayTeam);
                }
                uniqueTeams[match.awayTeam] = 1;
            }
            if (Object.keys(uniqueTeams).length !== (expectedMatches * 2)) {
                throw new Error("We would expect " + expectedMatches * 2 + " teams to be playing this week, but we found " + Object.keys(uniqueTeams).length);
            }

            // Check that we don't already have the matches scheduled in some other week!
            for (const match of matches) {
                if (match.homeTeam in schedule.matches) {
                    if (match.awayTeam in schedule.matches[match.homeTeam].against) {
                        const foundMatch = schedule.matches[match.homeTeam].against[match.awayTeam];
                        if (foundMatch.weekId !== weekId) {
                            throw new Error("We already found " + match.homeTeam + " vs " + match.awayTeam + " in week " + foundMatch.weekId + " so we cant put it in week " + weekId);
                        } else {
                            // Match is already scheduled, but in the same week so we should be able to safely overwrite it as long as the cache it up to date.
                        }
                    } else {
                        // OK, Not found
                    }
                } else {
                    // OK, Not found
                }
            }

            // Now write these to the fixtures spreadsheet if they look correct
            for (const match of matches) {
                await writeFixture(dryRun, gauth, match.homeTeam, match.awayTeam, weekId, match.startTime);
            }

            console.log("Script completed");

        } else {
            throw new Error("Error, found " + matches.length + " matches");
        }

    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();



