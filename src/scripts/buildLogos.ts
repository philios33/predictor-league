// Resize all of the png files in /src/logos to 24px high and store them in /src/compiled/logos-24/xxxx.png

import Jimp from 'jimp';
 
export {};

const pngFiles = [
    'arsenal', 
    'aston-villa', 
    'brentford', 
    'brighton', 
    'burnley', 
    'chelsea', 
    'crystal-palace', 
    'everton', 
    'leeds', 
    'leicester', 
    'liverpool', 
    'manchester-city', 
    'manchester-united', 
    'newcastle',
    'norwich', 
    'southampton', 
    'tottenham', 
    'watford', 
    'west-ham', 
    'wolves'
];

(async () => {
    try {
        for (const team of pngFiles) {
            (await Jimp.read(__dirname + '/../logos/' + team + '.png')).resize(Jimp.AUTO, 24).write(__dirname + '/../compiled/logos-24/' + team + '.png');
            (await Jimp.read(__dirname + '/../logos/' + team + '.png')).resize(Jimp.AUTO, 48).write(__dirname + '/../compiled/logos-48/' + team + '.png');
            console.log("Done " + team);
        }
        
    } catch(e) {
        console.error(e);
    }
})();
