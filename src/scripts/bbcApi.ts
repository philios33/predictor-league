
import axios from "axios";
import moment from "moment-timezone";

export type FixtureResult = {
    homeTeam: string
    homeScore: number
    awayTeam: string
    awayScore: number
    dateIso: string
    statusComment: string
}

export default async function getFixturesResults(date: moment.Moment, lookupStatus: 'PreEvent' | 'PostEvent') : Promise<FixtureResult[]> {

    const todaysDate = date.tz("Europe/London").format("YYYY-MM-DD");

    const url = 'https://web-cdn.api.bbci.co.uk/wc-poll-data/container/sport-data-scores-fixtures';

    const relevant = [];

    const result = await axios({
        url,
        params: {
            selectedEndDate: todaysDate,
            selectedStartDate: todaysDate,
            todayDate: todaysDate,
            urn: 'urn:bbc:sportsdata:football:tournament-collection:collated',
            useSdApi: 'false'
        },
        headers: {
            origin: 'https://www.bbc.co.uk',
            referer: 'https://www.bbc.co.uk/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        },
        timeout: 5 * 1000,
        validateStatus: () => true,
    });

    if (result.status === 200) {
        for (const eg of result.data.eventGroups) {
            if (eg.displayLabel === 'Premier League') {
                for (const sg of eg.secondaryGroups) {
                    for (const event of sg.events) {
                        if (event.status === lookupStatus) {
                            // console.log('event', JSON.stringify(event, null, 4));
                            const homeTeam = event.home.fullName;
                            const homeScore = event.home.score;
                            const awayTeam = event.away.fullName;
                            const awayScore = event.away.score;
                            const dateIso = event.date.iso;
                            const statusComment = event.statusComment.value;
                            relevant.push({
                                homeTeam,
                                homeScore,
                                awayTeam,
                                awayScore,
                                dateIso,
                                statusComment,
                            })
                        }
                    }
                }
            }
        }

        // console.log('RELEVANT', relevant);
        return relevant;
    } else {
        throw new Error("Non 200 response: " + result.status + " for url: " + url);
    }
}