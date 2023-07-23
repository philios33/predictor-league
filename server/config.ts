
require('dotenv').config({ path: __dirname + '/../.env' });

type Config = {
    mail : {
        host: null | string,
        user: null | string,
        password: null | string,
    }
    vapid: {
        public: string,
        private: string,
    } | null

    relyingPartyId: string,
    authOrigin: string,
}

const config: Config = {
    mail: {
        host: null,
        user: null,
        password: null,
    },
    vapid: null,
    relyingPartyId: "",
    authOrigin: "",
}

if (process.env.MAIL_HOST) {
    config.mail.host = process.env.MAIL_HOST;
    console.log("Using Mail Host: " + config.mail.host);
}
if (process.env.MAIL_USER) {
    config.mail.user = process.env.MAIL_USER;
    console.log("Using Mail User: " + config.mail.user);
}
if (process.env.MAIL_PASSWORD) {
    config.mail.password = process.env.MAIL_PASSWORD;
    console.log("Using Mail Password");
}

if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    config.vapid = {
        public: process.env.VAPID_PUBLIC,
        private: process.env.VAPID_PRIVATE,
    }
    console.log("Using VAP IDs for Web Push API");
}

if (process.env.RP_ID) {
    config.relyingPartyId = process.env.RP_ID;
}
if (process.env.AUTH_ORIGIN) {
    config.authOrigin = process.env.AUTH_ORIGIN;
}

if (config.relyingPartyId === "") {
    console.log("Missing RP_ID");
    process.exit(1);
}
if (config.authOrigin === "") {
    console.log("Missing AUTH_ORIGIN");
    process.exit(1);
}

// console.log("Process ENV", process.env);
// console.log("CONFIG", config);

export {
    config
};
