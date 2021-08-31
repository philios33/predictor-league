
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
