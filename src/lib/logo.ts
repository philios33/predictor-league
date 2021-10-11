
import arsenal from '../compiled/logos-24/arsenal.png';
import astonVilla from '../compiled/logos-24/aston-villa.png';
import brentford from '../compiled/logos-24/brentford.png';
import brighton from '../compiled/logos-24/brighton.png';
import burnley from '../compiled/logos-24/burnley.png';
import chelsea from '../compiled/logos-24/chelsea.png';
import crystalPalace from '../compiled/logos-24/crystal-palace.png';
import everton from '../compiled/logos-24/everton.png';
import leeds from '../compiled/logos-24/leeds.png';
import leicester from '../compiled/logos-24/leicester.png';
import liverpool from '../compiled/logos-24/liverpool.png';
import manchesterCity from '../compiled/logos-24/manchester-city.png';
import manchesterUnited from '../compiled/logos-24/manchester-united.png';
import newcastle from '../compiled/logos-24/newcastle.png';
import norwich from '../compiled/logos-24/norwich.png';
import southampton from '../compiled/logos-24/southampton.png';
import tottenham from '../compiled/logos-24/tottenham.png';
import watford from '../compiled/logos-24/watford.png';
import westHam from '../compiled/logos-24/west-ham.png';
import wolves from '../compiled/logos-24/wolves.png';


export function getLogo24(team: string): any {

    const logos: {[key: string]: any} = {
        "Arsenal": arsenal,
        "Aston Villa": astonVilla,
        "Brentford": brentford,
        "Brighton & Hove Albion": brighton,
        "Burnley": burnley,
        "Chelsea": chelsea,
        "Crystal Palace": crystalPalace,
        "Everton": everton,
        "Leeds United": leeds,
        "Leicester City": leicester,
        "Liverpool": liverpool,
        "Manchester City": manchesterCity,
        "Manchester United": manchesterUnited,
        "Newcastle United": newcastle,
        "Norwich City": norwich,
        "Southampton": southampton,
        "Tottenham Hotspur": tottenham,
        "Watford": watford,
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
import brentford2 from '../compiled/logos-48/brentford.png';
import brighton2 from '../compiled/logos-48/brighton.png';
import burnley2 from '../compiled/logos-48/burnley.png';
import chelsea2 from '../compiled/logos-48/chelsea.png';
import crystalPalace2 from '../compiled/logos-48/crystal-palace.png';
import everton2 from '../compiled/logos-48/everton.png';
import leeds2 from '../compiled/logos-48/leeds.png';
import leicester2 from '../compiled/logos-48/leicester.png';
import liverpool2 from '../compiled/logos-48/liverpool.png';
import manchesterCity2 from '../compiled/logos-48/manchester-city.png';
import manchesterUnited2 from '../compiled/logos-48/manchester-united.png';
import newcastle2 from '../compiled/logos-48/newcastle.png';
import norwich2 from '../compiled/logos-48/norwich.png';
import southampton2 from '../compiled/logos-48/southampton.png';
import tottenham2 from '../compiled/logos-48/tottenham.png';
import watford2 from '../compiled/logos-48/watford.png';
import westHam2 from '../compiled/logos-48/west-ham.png';
import wolves2 from '../compiled/logos-48/wolves.png';


export function getLogo48(team: string): any {

    const logos: {[key: string]: any} = {
        "Arsenal": arsenal2,
        "Aston Villa": astonVilla2,
        "Brentford": brentford2,
        "Brighton & Hove Albion": brighton2,
        "Burnley": burnley2,
        "Chelsea": chelsea2,
        "Crystal Palace": crystalPalace2,
        "Everton": everton2,
        "Leeds United": leeds2,
        "Leicester City": leicester2,
        "Liverpool": liverpool2,
        "Manchester City": manchesterCity2,
        "Manchester United": manchesterUnited2,
        "Newcastle United": newcastle2,
        "Norwich City": norwich2,
        "Southampton": southampton2,
        "Tottenham Hotspur": tottenham2,
        "Watford": watford2,
        "West Ham United": westHam2,
        "Wolverhampton Wanderers": wolves2,
    }
    if (team in logos) {
        return logos[team];
    } else {
        return logos['Arsenal'];
    }
}