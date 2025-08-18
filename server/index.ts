
import path from 'path';
import fs from 'fs';
import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import {v4 as uuid} from 'uuid';
import multer from 'multer';

import { getThisWeek, savePrediction, validatePlayerSecret } from '../src/lib/api';
import buildDetails from '../src/compiled/build.json';
import { Logger } from '../src/lib/logger';
import { config } from './config';

import getGoogleAuth from "../src/lib/googleAuthFactory";
import Notifications from "../src/lib/notifications";

// import socketIO from 'socket.io';
import { fetchUserNotificationSubscription, updateUserNotificationSubscription } from '../src/lib/subscription';
import ProfileEvents from '../src/lib/profileEvents';
import { getPieChartSVG } from './piechart';
import loadWebAuthN from './webAuthN';
import { signJWTForUser, validateJWTToUser } from './auth';

export {}

const logger = new Logger(true);

// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
// const spreadsheetId2022 = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";
// const spreadsheetId2023 = "13z-8qvEYNwKUMC8nMVXN4wanSzcZT-e5oKQ3FjB8PSA";
// const spreadsheetId2024 = "1qInfh-sCxBbSMjBAxVdUZqkQ_Iz3DnsNe0IEo4Nhq74";
const spreadsheetId = "1SsDfa6YwlFK0xm7vbO94AIoHGvDCzQSlAjUP6Y75DLI";
const gauth = getGoogleAuth();

const notificationSender = new Notifications(logger, gauth, spreadsheetId);
const profileEvents = new ProfileEvents(logger, gauth, spreadsheetId);


const DIST_DIR = path.join(__dirname, "..", "dist");
const SERVER_DIST_DIR = path.join(__dirname, "..", "serverDist");
const SRC_DIR = path.join(__dirname, "..", "src");
const PORT = 8081;
const app = express();

if (!fs.existsSync(__dirname + "/../uploads/incoming")) {
    fs.mkdirSync(__dirname + "/../uploads/incoming");
}

const upload = multer({ dest: __dirname + '/../uploads/incoming' });

app.disable('x-powered-by');

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

app.get("/manifest.json", function (req, res) {
    let fileContents = fs.readFileSync(path.join(SRC_DIR, "manifest.json")).toString();
    res.set("content-type", "application/json");
    res.send(fileContents);
});

app.get("/service.js", function (req, res) {
    if (config.vapid === null) {
        res.sendStatus(404);
        res.send("Must enable VAPID");
    } else {
        let fileContents = fs.readFileSync(path.join(SERVER_DIST_DIR, "service.js")).toString();
        fileContents = fileContents.replace("%%VAPID%%", config.vapid.public);
        fileContents = fileContents.replace("%%BUILDTIME%%", buildDetails.buildTime);

        res.set("content-type", "application/javascript");
        res.send(fileContents);
    }
});

app.post("/service/subscribe", async function(req, res) {
    try {
        let user = validateJWTToUser(req.headers.authorization);
        logger.writeEvent("PUSH_SUBSCRIPTION_RECEIVED", {user});
        await updateUserNotificationSubscription(gauth, user, req.body.subscription);
        res.send("OK");
    } catch(e: any) {
        logger.writeEvent("WEBSITE_ERROR", {
            location: "/service/subscribe",
            error: e.message
        });
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

app.post("/service/sendTestNofication", async function(req, res) {
    try {
        let user = validateJWTToUser(req.headers.authorization);
        
        const uniqueKey = "TEST-" + uuid();
        const notificationSub = await fetchUserNotificationSubscription(gauth, user);
        const meta = {
            type: "TEST-MESSAGE",
            player: user,
            title: "Example notification",
            message: "This is a test notification from the predictor website.",
            notificationSub,
            ttl: 60 * 60, // 1 hour is enough for a test
        }
        notificationSender.enqueueNotification(uniqueKey, meta);
        logger.writeEvent("TEST_NOTIFICATION", {triggeredBy: user});

        res.send(JSON.stringify({ok:true}));
    } catch(e: any) {
        logger.writeEvent("WEBSITE_ERROR", {
            location: "/service/sendTestNofication",
            error: e.message
        });
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

app.get("/service/subscription", async function(req, res) {
    try {
        let user = validateJWTToUser(req.headers.authorization);
        // console.log("Getting push subscription for " + user);

        const sub = await fetchUserNotificationSubscription(gauth, user);
        res.send({
            subscription: sub,
        });
    } catch(e: any) {
        logger.writeEvent("WEBSITE_ERROR", {
            location: "/service/subscription",
            error: e.message
        });
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

app.post("/service/serviceWorkerLog", async function(req, res) {
    logger.writeEvent("SW_LOG", {
        swBuild: req.body.buildAt,
        user: req.body.username,
        message: req.body.message,
    });
    res.send({ok:true});
});

// Profile

app.get("/service/profile", async function(req, res) {
    try {
        let user = validateJWTToUser(req.headers.authorization);

        const profile = profileEvents.getCurrentProfile(user);

        res.send({
            profile: profile,
        });
    } catch(e: any) {
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

app.get("/service/avatar/:username/:avatarId", async function(req, res) {
    // Get this avatar file, assume jpeg
    const avatarsDir = path.resolve(__dirname + "/../uploads/avatars");
    const fileName = req.params.username + "/" + req.params.avatarId + ".jpg";
    const imageFile = avatarsDir + "/" + fileName;
    if (fs.existsSync(imageFile)) {
        res.set("Content-Type", "image/jpeg");
        res.set("cache-control", "public, max-age=31536000, immutable"); // Since an image will never change its data
        res.sendFile(fileName, {root: avatarsDir});
    } else {
        res.status(404);
        res.send("Not found: " + imageFile);
    }
});

app.post("/service/avatar", upload.single("avatarImage"), async function(req, res) {
    try {
        let user = validateJWTToUser(req.headers.authorization);
        
        if (req.file) {
            if (req.file.mimetype === "image/jpg" || req.file.mimetype === "image/jpeg") {
                // Copy the file to user avatar space
                const id = uuid();
                const tmpPath = req.file.path;

                // Make avatars dir if doesn't exist
                if (!fs.existsSync(__dirname + "/../uploads/avatars")) {
                    fs.mkdirSync(__dirname + "/../uploads/avatars");
                }
                if (!fs.existsSync(__dirname + "/../uploads/avatars/" + user)) {
                    fs.mkdirSync(__dirname + "/../uploads/avatars/" + user);
                }

                const newPath = __dirname + "/../uploads/avatars/" + user + "/" + id + ".jpg";
                fs.copyFileSync(tmpPath, newPath);
                fs.unlinkSync(tmpPath);

                // Add row in profile events log to register the new avatar
                await profileEvents.enqueueProfileEvent({
                    occurredAt: new Date(),
                    username: user,
                    type: "NEW-AVATAR", 
                    meta: {
                        avatarId: id,
                    }
                });

                logger.writeEvent("NEW_AVATAR_UPLOADED", {
                    user: user,
                });

            } else {
                throw new Error("You must submit a image/jpeg, not a: " + req.file.mimetype);
            }
        } else {
            throw new Error("No avatar file was uploaded");
        }

        res.send({
            ok: true,
        });
    } catch(e: any) {
        logger.writeEvent("WEBSITE_ERROR", {
            location: "/service/avatar",
            error: e.message
        });
        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});

// Web Auth N stuff here

loadWebAuthN(app, logger, gauth);

// Other services

app.get("/version", async(req, res) => {
    res.send(buildDetails);
});

app.get("/piechart/:version/:correct/:incorrect", async(req, res) => {
    const correct = parseInt(req.params.correct);
    const incorrect = parseInt(req.params.incorrect);
    if (correct + incorrect > 0) {
        const svgText = getPieChartSVG(correct, incorrect);
        res.set("content-type", "image/svg+xml; charset=iso-8859-1");
        res.set("cache-control", "public, max-age=31536000, immutable");
        res.send(svgText);
    } else {
        res.status(500);        
        res.send({
            error: "Invalid inputs"
        });
    }
});

app.post("/service/loginService", async (req, res) => {
    try {
        // Validate the secret is correct for this player
        const name = req.body.username;
        const secret = req.body.password;

        await validatePlayerSecret(gauth, name, secret);

        // Sign a token that can be used with the other services (1 week)
        const tokenDetails = signJWTForUser(logger, name, 60 * 60 * 24 * 7);

        logger.writeEvent("LOGIN_SUCCESS", {
            ip: req.headers['x-real-ip'],
            subject: name,
        });

        res.send({
            token: tokenDetails.token,
            expiry: tokenDetails.expiry,
            username: name,
        });
    } catch(e: any) {
        logger.writeEvent("LOGIN_FAIL", {
            ip: req.headers['x-real-ip'],
            message: e.message,
        });

        console.error(e);
        res.status(500);        
        res.send({
            error: e.message
        });
    }
});



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
            ip: req.headers['x-real-ip'],
            user: user,
            by: origUser,
            week: weekId,
        });

        res.send(data);
    } catch(e: any) {

        logger.writeEvent("WEBSITE_ERROR", {
            location: req.url,
            ip: req.headers['x-real-ip'],
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
        
        logger.writeEvent("STORING_PREDICTION", {
            ip: req.headers['x-real-ip'],
            user: user,
            week: weekId,
            homeTeam: req.body.homeTeam,
            awayTeam: req.body.awayTeam,
            homeGoals: req.body.homeGoals,
            awayGoals: req.body.awayGoals,
            isBanker: req.body.isBanker,
        });

        const data = await savePrediction(gauth, weekId, user, req.body.homeTeam, req.body.awayTeam, req.body.homeGoals, req.body.awayGoals, req.body.isBanker);

        res.send(data);
    } catch(e: any) {
        logger.writeEvent("WEBSITE_ERROR", {
            location: req.url,
            ip: req.headers['x-real-ip'],
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
    let title = "Predictor 25-26";
    let description = "Predictor League 25-26";
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
    /*
    if (url === "/cup/mrEggCup2021") {
        title = "Mr Egg Memorial Egg Cup 2021";
        description = "Who will be the champion of egg?";
        image = "https://predictor.30yardsniper.co.uk/assets/mregg.jpg";
        imageWidth = "640";
        imageHeight = "480";
    }
    if (url === "/cup/mrChipsMemorialChipsCup2022") {
        title = "Mr Chips Memorial Chips Cup 2022/23";
        description = "Who will be the champion of chips?";
        image = "https://predictor.30yardsniper.co.uk/assets/mr_chips_640.jpg";
        imageWidth = "640";
        imageHeight = "480";
    }
    */

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

    /*
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
    */

    if (process.env["PROCESS_EVENTS"] !== "false") {
        await notificationSender.startup();
        await profileEvents.startup();
        console.log("Processing events");
    } else {
        console.warn("NOT processing events");
    }
    
    
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

