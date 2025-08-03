
import arsenal from '../compiled/logos-24/arsenal.png';
import astonVilla from '../compiled/logos-24/aston-villa.png';
import bournemouth from '../compiled/logos-24/bournemouth.png';
import brentford from '../compiled/logos-24/brentford.png';
import brighton from '../compiled/logos-24/brighton.png';
import burnley from '../compiled/logos-24/burnley.png';
import chelsea from '../compiled/logos-24/chelsea.png';
import crystalPalace from '../compiled/logos-24/crystal-palace.png';
import everton from '../compiled/logos-24/everton.png';
import fulham from '../compiled/logos-24/fulham.png';
import leeds from '../compiled/logos-24/leeds.png';
import liverpool from '../compiled/logos-24/liverpool.png';
import manchesterCity from '../compiled/logos-24/manchester-city.png';
import manchesterUnited from '../compiled/logos-24/manchester-united.png';
import newcastle from '../compiled/logos-24/newcastle.png';
import nottinghamForest from '../compiled/logos-24/nottingham-forest.png';
import sunderland from '../compiled/logos-24/sunderland.png';
import tottenham from '../compiled/logos-24/tottenham.png';
import westHam from '../compiled/logos-24/west-ham.png';
import wolves from '../compiled/logos-24/wolves.png';


export function getLogo24(team: string): any {

    const logos: {[key: string]: any} = {
        "Arsenal": arsenal,
        "Aston Villa": astonVilla,
        "AFC Bournemouth": bournemouth,
        "Brentford": brentford,
        "Brighton & Hove Albion": brighton,
        "Burnley": burnley,
        "Chelsea": chelsea,
        "Crystal Palace": crystalPalace,
        "Everton": everton,
        "Fulham": fulham,
        "Leeds United": leeds,
        "Liverpool": liverpool,
        "Manchester City": manchesterCity,
        "Manchester United": manchesterUnited,
        "Newcastle United": newcastle,
        "Nottingham Forest": nottinghamForest,
        "Sunderland": sunderland,
        "Tottenham Hotspur": tottenham,
        "West Ham United": westHam,
        "Wolverhampton Wanderers": wolves,
    }
    if (team in logos) {
        return logos[team];
    } else {
        return logos['Arsenal'];
    }
}


import arsenal2 from '../compiled/logos-48/arsenal.png';
import astonVilla2 from '../compiled/logos-48/aston-villa.png';
import bournemouth2 from '../compiled/logos-48/bournemouth.png';
import brentford2 from '../compiled/logos-48/brentford.png';
import brighton2 from '../compiled/logos-48/brighton.png';
import burnley2 from '../compiled/logos-48/burnley.png';
import chelsea2 from '../compiled/logos-48/chelsea.png';
import crystalPalace2 from '../compiled/logos-48/crystal-palace.png';
import everton2 from '../compiled/logos-48/everton.png';
import fulham2 from '../compiled/logos-48/fulham.png';
import leeds2 from '../compiled/logos-48/leeds.png';
import liverpool2 from '../compiled/logos-48/liverpool.png';
import manchesterCity2 from '../compiled/logos-48/manchester-city.png';
import manchesterUnited2 from '../compiled/logos-48/manchester-united.png';
import newcastle2 from '../compiled/logos-48/newcastle.png';
import nottinghamForest2 from '../compiled/logos-48/nottingham-forest.png';
import sunderland2 from '../compiled/logos-48/sunderland.png';
import tottenham2 from '../compiled/logos-48/tottenham.png';
import westHam2 from '../compiled/logos-48/west-ham.png';
import wolves2 from '../compiled/logos-48/wolves.png';


export function getLogo48(team: string): any {

    const logos: {[key: string]: any} = {
        "Arsenal": arsenal2,
        "Aston Villa": astonVilla2,
        "AFC Bournemouth": bournemouth2,
        "Brentford": brentford2,
        "Brighton & Hove Albion": brighton2,
        "Burnley": burnley2,
        "Chelsea": chelsea2,
        "Crystal Palace": crystalPalace2,
        "Everton": everton2,
        "Fulham": fulham2,
        "Leeds United": leeds2,
        "Liverpool": liverpool2,
        "Manchester City": manchesterCity2,
        "Manchester United": manchesterUnited2,
        "Newcastle United": newcastle2,
        "Nottingham Forest": nottinghamForest2,
        "Sunderland": sunderland2,
        "Tottenham Hotspur": tottenham2,
        "West Ham United": westHam2,
        "Wolverhampton Wanderers": wolves2,
    }
    if (team in logos) {
        return logos[team];
    } else {
        return logos['Arsenal'];
    }
}