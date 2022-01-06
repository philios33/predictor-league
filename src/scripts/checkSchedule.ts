// Designed to run every 3 hours on a cron
// We grab all of the fixtures in the next 14 days from the BBC
// We get all of the upcoming fixtures due in the next 14 days and compare the kick off times
// Any matches that we don't have scheduled, we alert Phil since we don't know what week they are in.  This probably requires running scheduleMatches script.
// Any matches that we DO have the game week num for but incorrect time, we should be able to safely update the kickoff time, alert and redeploy.
// Any matches that we have scheduled, but are now postponed or disappeared, we should auto postpone and redeploy.

export {}
