
import path from 'path';
import fs from 'fs';
import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import jwt from 'jsonwebtoken';

import { getThisWeek, savePrediction, validatePlayerSecret } from '../src/lib/api';
import GoogleAuth from '../src/lib/googleAuth';
import buildDetails from '../src/compiled/build.json';
import { Logger } from '../src/lib/logger';
import { config } from './config';

import socketIO from 'socket.io';
import { updateUserNotificationSubscription } from '../src/lib/subscription';

export {}

const logger = new Logger(true);

const credentialsFile = __dirname + "/../keys/credentials.json";
console.log("CREDENTIALS FILE PATH 1", credentialsFile);

const gauth = new GoogleAuth(credentialsFile);

const signingSecretFile = __dirname + "/../keys/signing.key";
const SECRET_SIGNING_KEY = fs.readFileSync(signingSecretFile);

const DIST_DIR = path.join(__dirname, "..", "dist");
const SERVER_DIST_DIR = path.join(__dirname, "..", "serverDist");
const PORT = 8081;
const app = express();

// Allow CORS
app.use(cors());

// Allow posting of json
app.use(express.json());

// Use gzip
app.use(compression());



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

app.get("/service.js", function (req, res) {
    if (config.vapid === null) {
        res.sendStatus(404);
        res.send("Must enable VAPID");
    } else {
        const fileContents = fs.readFileSync(path.join(SERVER_DIST_DIR, "service.js"));
        const replacedContents = fileContents.toString().replace("%%VAPID%%", config.vapid.public);
    
        res.set("content-type", "application/javascript");
        res.send(replacedContents);
    }
});

app.post("/subscribe", async function(req, res) {
    try {
        let user = validateJWTToUser(req.headers.authorization);
        console.log("Push subscription received for " + user);
        await updateUserNotificationSubscription(gauth, user, req.body);
        res.send("OK");
    } catch(e) {
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

app.post("/serviceWorkerLog", async function(req, res) {
    res.send({ok:true});
    console.log("SERVICE WORKER LOG: " + req.body.message);
});

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

const escapeHtml = (unsafe: string) : string => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const indexContent = fs.readFileSync(path.join(DIST_DIR, "index.html")).toString();
const getIndexFileWithMeta = (title: string, description: string, imagePath: null | string, imageWidth: null | string, imageHeight: null | string) : string => {
    let content = indexContent
        .replace(/%%TITLE%%/g, escapeHtml(title))
        .replace(/%%DESCRIPTION%%/g, escapeHtml(description));

    if (imagePath !== null) {
        if (imageWidth !== null && imageHeight !== null) {
            content = content.replace(/%%METAIMAGE%%/g, '<meta property="og:image" content="' + escapeHtml(imagePath) + '"><meta name="og:image:width" content="' + imageWidth + '"/><meta name="og:image:height" content="' + imageHeight + '"/>');
        } else {
            content = content.replace(/%%METAIMAGE%%/g, '<meta property="og:image" content="' + escapeHtml(imagePath) + '">');
        }
    } else {
        content = content.replace(/%%METAIMAGE%%/g, '');
    }

    return content;
}

const sendIndexPage = (req: express.Request, res: express.Response) => {
    let title = "Predictor 22-23";
    let description = "Predictor League 22-23";
    let image: null | string = null;
    let imageWidth: null | string = null;
    let imageHeight: null | string = null;

    const url = req.url;
    
    const predictionWeekRegExp = new RegExp("^/predictions/(\\d+)$");
    let matches = null;
    if (matches = predictionWeekRegExp.exec(url)) {
        const weekNum = matches[1];
        title = "Week " + weekNum + " predictions";
        description = "Get them in.";

        /*
        if (weekNum === "9") {
            description += " This Friday Arsenal take on Aston Villa in the Mr Egg memorial egg cup.";
        }
        if (weekNum === "10") {
            description += " Egg Cup Latest: Spurs vs Tottenham at the King Dave stadium.";
            image = "/assets/week10_mystery_player2.jpg";
        }
        if (weekNum === "11") {
            description += " Egg Cup Latest: Everyone is back in it!";
            image = "/assets/week10_mystery_player2.jpg";
        }
        if (weekNum === "13") {
            description = "NEWS: Match 6 of Egg cup confirmed by Jez";
            image = "https://predictor.30yardsniper.co.uk/assets/week13_mystery_player.jpg";
            imageWidth = "500";
            imageHeight = "394";
        }
        if (weekNum === "14") {
            description = "NEWS: Next PL match is Tuesday. Get them in NOW.";
            image = "https://predictor.30yardsniper.co.uk/assets/week14_mystery_player.jpg";
            imageWidth = "488";
            imageHeight = "420";
        }
        if (weekNum === "15") {
            description = "More football, already? YES";
            image = "https://predictor.30yardsniper.co.uk/assets/week15_mystery_player.jpg";
            imageWidth = "739";
            imageHeight = "415";
        }
        if (weekNum === "16") {
            description = "It's impossible to keep track of all the football! Get them in lads.";
            image = "https://predictor.30yardsniper.co.uk/assets/week16_david.jpg";
            imageWidth = "1086";
            imageHeight = "1051";
        }
        if (weekNum === "18") {
            description = "Back to game week 18!";
            image = "https://predictor.30yardsniper.co.uk/assets/Time_Circuits_BTTF.jpg";
            imageWidth = "853";
            imageHeight = "480";
        }
        */
    }
    if (url === "/cup/mrEggCup2021") {
        title = "Mr Egg Memorial Egg Cup 2021";
        description = "Who will be the champion of egg?";
        image = "https://predictor.30yardsniper.co.uk/assets/mregg.jpg";
        imageWidth = "640";
        imageHeight = "480";
    }

    const out = getIndexFileWithMeta(title, description, image, imageWidth, imageHeight);
    res.send(out);
}

app.get("/", function (req, res) {
    sendIndexPage(req, res);
});

// Serve all other files in the dist folder with long cache control
app.use(express.static(DIST_DIR, {
    maxAge: "1y",
    immutable: true,
}));

//Send index.html when the user tries to access any other page
app.get("*", function (req, res) {
    sendIndexPage(req, res);
});


(async () => {
    console.log("Logging in... index.ts");
    await gauth.start();
    console.log("Logged in!");


    const server = http.createServer(app);
    const io = new socketIO.Server(server, {
        serveClient: false
    });
    io.on('connection', (socket: any) => {
        let loginName = "unknown";
        const loginTime = new Date();
        socket.on("login", (data: any) => {
            logger.writeEvent("CLIENT_SOCKET_LOGIN", {...data, socketId: socket.id});
            if (data.login) {
                loginName = data.login.username;
            }
        });
        socket.on("disconnect", () => {
            const now = new Date();
            const durationSeconds = Math.round((now.getTime() - loginTime.getTime()) / 1000);
            logger.writeEvent("CLIENT_SOCKET_DISCONNECTED", {
                socketId: socket.id,
                user: loginName,
                duration: durationSeconds
            });
            
        })
    });
    
    server.listen(PORT);
    console.log("Listening on port " + PORT);

    // console.log("Env is", process.env);
    // console.log("Config is", config);

    logger.writeEvent("STARTUP_COMPLETE", {});
})();




// Required for control+C compatibility
process.on("SIGINT", () => {
    logger.writeEvent("SIGINT", {});
    process.exit(1);
})

