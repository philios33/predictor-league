// Testing web push notification

import webpush from 'web-push';

import { config } from "./config";

if (config.vapid === null) {
    console.error("Missing VAPID");
    process.exit(1);
}

webpush.setVapidDetails(
    'mailto:phil@code67.com',
    config.vapid.public,
    config.vapid.private
);

const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/ekMj9ADaVQ4:APA91bGNSFDtBRfCC8K7W3pbz9fSCQ5HqZs-OSPQhDcAL7aYNaHibnWuxBRxRQ-MdhfCXZiGW3RFe_hnxhKcU05LkTEyGguyxsfF7DvnTVV7F0qni9ylffigktD4KtD7ntgP1qr3CGxg',
    expirationTime: null,
    keys: {
      p256dh: 'BPhV0hdxxWcu9XXeUji_JjCelF-Eh3HIyXtEAxBYowHKRnDUSFmDV6mGEiaHYahwCOeSfb3sJWPiarsB_a7OUBA',
      auth: '0KUj31EuBCNPQNzkoh94Sw'
    }
  }

const data = {
    title: "Some title",
    body: "This is a test",
    // icon: "",
    // image: "",
    url: "https://predictor.30yardsniper.co.uk/predictions",
    actions: [{action: "open_url", title: "Enter predictions"}]
};

webpush.sendNotification(sub, JSON.stringify(data));

