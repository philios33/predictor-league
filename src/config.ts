
const config = {
    serviceEndpoint: "https://predictor.30yardsniper.co.uk/"
}

if (process) {
    if (process.env) {
        if (process.env.SERVICE_ENDPOINT) {
            config.serviceEndpoint = process.env.SERVICE_ENDPOINT;
        }
    }
}

export {
    config
};
