
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import jwt from 'jsonwebtoken';

import { getThisWeek, savePrediction, validatePlayerSecret } from '../src/lib/api';
import GoogleAuth from '../src/lib/googleAuth';
import buildDetails from '../src/compiled/build.json';
import { Logger } from '../src/lib/logger';


export {}

const logger = new Logger(true);

const credentialsFile = __dirname + "/../keys/credentials.json";
console.log("CREDENTIALS FILE PATH 1", credentialsFile);

const gauth = new GoogleAuth(credentialsFile);

const signingSecretFile = __dirname + "/../keys/signing.key";
const SECRET_SIGNING_KEY = fs.readFileSync(signingSecretFile);

const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = 8081;
const app = express();

// Allow CORS
app.use(cors());

// Allow posting of json
app.use(express.json());

// Use gzip
app.use(compression());

// Only send index.html when user accesses the root page
app.get("/", function (req, res) {
    // No cache
    res.sendFile(path.join(DIST_DIR, "index.html"));
});

/*
// Robots page
app.get("/robots.txt", function (req, res) {
    // No cache
    res.sendFile(path.join(DIST_DIR, "robots.txt"));
});

// Fav icon
app.get("/favicon.ico", function (req, res) {
    // No cache
    res.sendFile(path.join(DIST_DIR, "favicon.ico"));
});

// Sitemap
app.get("/sitemap.xml", function (req, res) {
    // No cache
    res.sendFile(path.join(DIST_DIR, "sitemap.xml"));
});
*/

// Serve all other files in the dist folder with long cache control
app.use(express.static(DIST_DIR, {
    maxAge: "1y",
    immutable: true,
}));

// Other services

app.get("/version", async(req, res) => {
    res.send(buildDetails);
});

app.post("/loginService", async (req, res) => {
    try {
        // Validate the secret is correct for this player
        const name = req.body.username;
        const secret = req.body.password;

        await validatePlayerSecret(gauth, name, secret);

        // Sign a token that can be used with the other services
        const token = jwt.sign({
            // sec: secret, // No need to put the secret inside of the token, since we can validate the token to assume the user is authorized to edit.
        }, SECRET_SIGNING_KEY, {
            algorithm: 'HS256',
            expiresIn: '1y',
            audience: 'predictor',
            issuer: 'predictor',
            subject: name,
        });

        logger.writeEvent("LOGIN_SUCCESS", {
            ip: req.headers['real-ip'],
            subject: name,
        });

        res.send({
            token
        });
    } catch(e) {
        logger.writeEvent("LOGIN_FAIL", {
            ip: req.headers['real-ip'],
            message: e.message,
        });

        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

const validateJWTToUser = (token?: string): string => {
    if (token) {
        const decoded = jwt.verify(token, SECRET_SIGNING_KEY, {
            algorithms: ['HS256'],
            audience: 'predictor',
            complete: true,
        }) as jwt.Jwt;
        if (!decoded.payload.sub) {
            throw new Error("Missing sub");
        }
        return decoded.payload.sub;
    } else {
        throw new Error("Not logged in");
    }
}

// These two do the reading and writing to the spreadsheet
app.get("/service/getThisWeek/:id", async (req, res) => {
    try {
        let user = validateJWTToUser(req.headers.authorization);
        // let user = "Lawro";

        let origUser = user;
        const weekId = req.params.id;

        // Special case where there is a param called playerName and the user is phil or mike, we allow to view the predictions
        if (user === "Phil" || user === "Mike") {
            if (req.query.playerName) {
                // console.log(user + " is loading the predictions of " + req.query.playerName);
                user = req.query.playerName as string;
            }
        }

        const data = await getThisWeek(gauth, weekId, user);

        logger.writeEvent("LOAD_PREDICTIONS_SUCCESS", {
            ip: req.headers['real-ip'],
            user: user,
            by: origUser,
            week: weekId,
        });

        res.send(data);
    } catch(e) {

        logger.writeEvent("LOAD_PREDICTIONS_FAIL", {
            ip: req.headers['real-ip'],
            message: e.message,
        });

        console.error(e);
        if (e.message === "Not logged in") {
            res.status(401);
        } else {
            res.status(500);
        }
        res.send({
            error: e.message
        });
    }
});

app.post("/service/postPrediction/:weekId", async (req, res) => {
    try {
        const user = validateJWTToUser(req.headers.authorization);
        // const user = "Lawro";
        const weekId = req.params.weekId;
        const data = await savePrediction(gauth, weekId, user, req.body.homeTeam, req.body.awayTeam, req.body.homeGoals, req.body.awayGoals, req.body.isBanker);

        logger.writeEvent("SAVE_PREDICTION_SUCCESS", {
            ip: req.headers['real-ip'],
            user: user,
            week: weekId,
            homeTeam: req.body.homeTeam,
            awayTeam: req.body.awayTeam,
            homeGoals: req.body.homeGoals,
            awayGoals: req.body.awayGoals,
            isBanker: req.body.isBanker,
        });

        res.send(data);
    } catch(e) {
        logger.writeEvent("SAVE_PREDICTION_FAIL", {
            ip: req.headers['real-ip'],
            message: e.message,
        });

        console.error(e);
        if (e.message === "Not logged in") {
            res.status(401);
        } else {
            res.status(500);
        }
        
        res.send({
            error: e.message
        });
    }
});


//Send index.html when the user tries to access any other page
app.get("*", function (req, res) {
    res.sendFile(path.join(DIST_DIR, "index.html"));
});

(async () => {
    console.log("Logging in... index.ts");
    await gauth.start();
    console.log("Logged in!");
    app.listen(PORT);
    console.log("Listening on port " + PORT);

    logger.writeEvent("STARTUP_COMPLETE", {});
})();




// Required for control+C compatibility
process.on("SIGINT", () => {
    logger.writeEvent("SIGINT", {});
    process.exit(1);
})

