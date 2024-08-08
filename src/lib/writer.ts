
import { sheets } from '@googleapis/sheets';
const SheetsApi = sheets('v4');
import GoogleAuth from "./googleAuth";


// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
// const spreadsheetId2022 = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";
// const spreadsheetId2023 = "13z-8qvEYNwKUMC8nMVXN4wanSzcZT-e5oKQ3FjB8PSA";
const spreadsheetId = "1qInfh-sCxBbSMjBAxVdUZqkQ_Iz3DnsNe0IEo4Nhq74";

function getCellRefByMatch (homeTeam: string, awayTeam: string) : string {
    const teamsList = [
        "Arsenal",
        "Aston Villa",
        "AFC Bournemouth",
        "Brentford",
        "Brighton & Hove Albion",
        "Chelsea",
        "Crystal Palace",
        "Everton",
        "Fulham",
        "Ipswich Town",
        "Leicester City",
        "Liverpool",
        "Manchester City",
        "Manchester United",
        "Newcastle United",
        "Nottingham Forest",
        "Southampton",
        "Tottenham Hotspur",
        "West Ham United",
        "Wolverhampton Wanderers",
    ];

    const homeTeamIndex = teamsList.indexOf(homeTeam);
    if (homeTeamIndex === -1) {
        throw new Error("Unknown home team: " + homeTeam);
    }

    const awayTeamIndex = teamsList.indexOf(awayTeam);
    if (awayTeamIndex === -1) {
        throw new Error("Unknown away team: " + awayTeam);
    }

    const awayCol = String.fromCharCode(awayTeamIndex + 66); // Starts at col B (Arsenal) and B = ASCII 66
    const homeRow = homeTeamIndex + 3; // Starts at row 3 (Arsenal)
    return awayCol + homeRow.toString();
}



export const writeFixture = async (dryRun: boolean, gauth: GoogleAuth, homeTeam: string, awayTeam: string, weekId: string, fixtureTime: string) : Promise<void> => {

    const fixtureValue = weekId + "|" + fixtureTime;
    
    const cellRef = getCellRefByMatch(homeTeam, awayTeam);

    const range = 'Schedule!' + cellRef;

    console.log((dryRun ? "Not writing: " : "Writing: ") + fixtureValue + " at cell " + range);
    if (dryRun) {
        return;
    }
    const auth = gauth.jwtClient;
    // console.log("Writing data at ", cellRef, scoreValue);
    const result = await SheetsApi.spreadsheets.values.update({
        auth: auth,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[fixtureValue]]
        }
    });
    if (result.status === 200) {
        if (result.data.updatedCells !== 1) {
            console.error("Result data dump", result.data);
            throw new Error("Did not update 1 cell: " + result.data.updatedCells);
        }
        // OK
    } else {
        console.error(result);
        throw new Error("Result status was not 200");
    }
}
