
require('dotenv').config({ path: __dirname + '/../.env' });

type Config = {
    mail : {
        host: null | string,
        user: null | string,
        password: null | string,
    }
}

const config: Config = {
    mail: {
        host: null,
        user: null,
        password: null,
    }
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

console.log("Process ENV", process.env);
console.log("CONFIG", config);

export {
    config
};
