import React from 'react';
import { getLogin } from '../../lib/util';


function Home() {    
    const login = getLogin();

    return (
        <div className="home">
            <iframe 
                width="400" 
                height="300" 
                src="https://www.youtube.com/embed/OTvSGqB_27w" 
                seamless={true} 
                allow="fullscreen;" 
                allowFullScreen={true}>
                Predictor Season Preview 2023/24
            </iframe>
            {/*
            <iframe width="400" height="300" src="https://www.youtube.com/embed/zTQ8fSa-1nc">
                Predictor Season Review 2021/22    
            </iframe>
            */}
        </div>
    );
}

export default Home;
