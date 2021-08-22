
import path from 'path';
import fs from 'fs';
import express from 'express';
import compression from 'compression';
import jwt from 'jsonwebtoken';

import { getThisWeek, savePrediction, validatePlayerSecret } from '../src/lib/api';
import GoogleAuth from '../src/lib/googleAuth';
import moment from 'moment-mini';

const credentialsFile = __dirname + "/../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

const signingSecretFile = __dirname + "/../keys/signing.key";
const SECRET_SIGNING_KEY = fs.readFileSync(signingSecretFile);

const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = 8081;
const app = express();

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

        res.send({
            token
        });
    } catch(e) {
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

const validateJWTToUser = (token?: string) => {
    if (token) {
        const decoded = jwt.verify(token, SECRET_SIGNING_KEY, {
            algorithms: ['HS256'],
            audience: 'predictor',
            complete: true,
        }) as jwt.Jwt;
        return decoded.payload.sub;
    } else {
        throw new Error("Not logged in");
    }
}

// These two do the reading and writing to the spreadsheet
app.get("/service/getThisWeek/:id", async (req, res) => {
    try {
        const user = validateJWTToUser(req.headers.authorization);
        const weekId = req.params.id;
        const data = await getThisWeek(gauth, weekId, user);
        res.send(data);
    } catch(e) {
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
        const weekId = req.params.weekId;
        const data = await savePrediction(gauth, weekId, user, req.body.homeTeam, req.body.awayTeam, req.body.homeGoals, req.body.awayGoals, req.body.isBanker);
        res.send(data);
    } catch(e) {
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
    console.log("Logging in...");
    await gauth.start();
    console.log("Logged in!");
    app.listen(PORT);
    console.log("Listening on port " + PORT);
})();




// Required for control+C compatibility
process.on("SIGINT", () => {
    process.exit(1);
})

