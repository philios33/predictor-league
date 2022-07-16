import GoogleAuth from "./googleAuth";
import fs from 'fs';

export default function getGoogleAuth() : GoogleAuth {
    const credentialsFile1 = __dirname + "/../../keys/credentials.json";
    const credentialsFile2 = __dirname + "/../keys/credentials.json";
    let gauth: null | GoogleAuth = null;
    if (fs.existsSync(credentialsFile1)) {
        gauth = new GoogleAuth(credentialsFile1);
        console.log("Using credentials at ", credentialsFile1);
    } else if (fs.existsSync(credentialsFile2)) {
        gauth = new GoogleAuth(credentialsFile2);
        console.log("Using credentials at ", credentialsFile2);
    } else {
        throw new Error("Couldnt find the credentials file in any of the valid locations");
    }
    return gauth;
}
