
import axios from "axios";
import moment from "moment-timezone";

export type FinalScore = {
    homeTeam: string
    homeScore: number
    awayTeam: string
    awayScore: number
}

export default async function getFinalScores(date: moment.Moment) : Promise<FinalScore[]> {

    const todaysDate = date.tz("Europe/London").format("YYYY-MM-DD");

    const url = 'https://web-cdn.api.bbci.co.uk/wc-poll-data/container/sport-data-scores-fixtures';

    const finalScores = [];

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
            if (eg.displayLabel === 'English Premier League') {
                for (const sg of eg.secondaryGroups) {
                    for (const event of sg.events) {
                        if (event.status === 'PostEvent') {
                            // console.log('event', JSON.stringify(event, null, 4));
                            const homeTeam = event.home.fullName;
                            const homeScore = event.home.score;
                            const awayTeam = event.away.fullName;
                            const awayScore = event.away.score;
                            finalScores.push({
                                homeTeam,
                                homeScore,
                                awayTeam,
                                awayScore,
                            })
                        }
                    }
                }
            }
        }

        // console.log('FINAL SCORES', finalScores);
        return finalScores;
    } else {
        throw new Error("Non 200 response: " + result.status + " for url: " + url);
    }
}