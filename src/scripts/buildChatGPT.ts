
import fs from 'fs';
import { getChatGPTLatestGameWeek } from '../lib/predictor/chatGPT';

(async () => {
    const chatgpt = await getChatGPTLatestGameWeek();
    fs.writeFileSync(__dirname + "/../compiled/chatGPT.json", JSON.stringify(chatgpt, null, 4));
    console.log("Finished building data for Chat GPT endpoint");
})();

