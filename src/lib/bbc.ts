import axios from "axios";
import moment from "moment-timezone";

type Match = {
    homeTeam: string
    awayTeam: string
    startTime: string
    eventStatus: string
}


const fetchPLMatches = async (dayText: string) : Promise<Array<any>> => {
    // const url = "https://push.api.bbci.co.uk/batch?t=%2Fdata%2Fbbc-morph-football-scores-match-list-data%2FendDate%2F" + dayText + "%2FstartDate%2F" + dayText + "%2Ftournament%2Fpremier-league%2Fversion%2F2.4.6?timeout=5";
    //const url = "https://web-cdn.api.bbci.co.uk/wc-poll-data/container/sport-data-scores-fixtures?selectedEndDate=" + dayText + "&selectedStartDate=" + dayText + "&todayDate=" + dayText + "&urn=urn%3Abbc%3Asportsdata%3Afootball%3Atournament%3Apremier-league"
    const url = "https://www.bbc.co.uk/wc-data/container/sport-data-scores-fixtures?selectedEndDate=" + dayText + "&selectedStartDate=" + dayText + "&todayDate=" + dayText + "&urn=urn%3Abbc%3Asportsdata%3Afootball%3Atournament%3Apremier-league"
    // console.log("Fetching from: " + url);
    const result = await axios({
        headers: {
            "cache-control": "no-cache",
        },
        url,
        timeout: 5 * 1000,
        validateStatus: () => true,
    });

    const matches: Array<Match> = [];
    if (result.status === 200) {
        // console.log("RESPONSE HEADERS", result.headers);
        const eventGroups = result.data.eventGroups;
        for (const eventGroup1 of eventGroups) {
            for (const eventGroup2 of eventGroup1.secondaryGroups) {
                for (const event of eventGroup2.events) {
                    // console.log("EVENT", event);
                    const homeTeam = event.home.fullName;
                    const awayTeam = event.away.fullName;
                    const startTime = moment(event.startDateTime).tz("Europe/London").format("D/M@HH:mm");
                    const eventStatus = event.status;
                    matches.push({
                        homeTeam,
                        awayTeam,
                        startTime,
                        eventStatus,
                    })
                }
            }
        }
        /*
        if (eventGroups.length > 0) {
            const eventDays = matchData[0].tournamentDatesWithEvents;
            for (const eventDayKey in eventDays) {
                const eventDay = eventDays[eventDayKey][0];
                for (const event of eventDay.events) {
                    // console.log("EVENT", event);
                    const homeTeam = event.homeTeam.name.full;
                    const awayTeam = event.awayTeam.name.full;
                    const startTime = moment(event.startTime).tz("Europe/London").format("D/M@HH:mm");
                    const eventStatus = event.eventStatus;
                    matches.push({
                        homeTeam,
                        awayTeam,
                        startTime,
                        eventStatus,
                    })
                }
            }
        }
        */
    } else {
        throw new Error("Non 200 status: " + result.status);
    }

    /*
    console.log("RESULT", JSON.stringify(matches, null, 4));
    process.exit(1);
    */

    return matches;
}

export const grabPLMatches = async (dates: Array<string>) : Promise<Array<any>> => {
    const matches: Array<any> = [];

    for(const thisDate of dates) {
        matches.push(...await fetchPLMatches(thisDate));
    }

    return matches;
}