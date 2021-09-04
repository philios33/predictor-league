
const config = {
    serviceEndpoint: "https://predictor.30yardsniper.co.uk/"
}

if (process.env.SERVICE_ENDPOINT) {
    config.serviceEndpoint = process.env.SERVICE_ENDPOINT;
}

export {
    config
};
