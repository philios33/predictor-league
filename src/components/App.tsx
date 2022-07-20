import React, { useEffect, useState } from 'react';
import './App.scss';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link
  } from "react-router-dom";

import buildDetails from '../compiled/build.json';
import Results from './pages/Results';
import Predictions from './pages/Predictions';
import PredictionsWeek from './pages/PredictionsWeek';
import Home from './pages/Home';

import './pages/pages.scss';
import Login from './pages/Login';
import { startVersionChecking, stopVersionChecking } from '../lib/versionChecker';
import { getLogin } from '../lib/util';

/*
import logoSmall from '../assets/logo_small.jpg';
import logo500 from '../assets/logo_500w.png';
import logoFull from '../assets/logo.png';
*/
import logoSmall from '../assets/logo_2022_300.jpg';
import logo500 from '../assets/logo_2022_500.jpg';
import logoFull from '../assets/logo_2022_1000.jpg';

import alanImage from '../assets/partridge_192.jpg';

import Cup from './pages/Cup';
import { Tables } from './pages/Tables';
import Notifications from './pages/Notifications';

import { Howl } from 'howler';
import goalSoundSource from '../assets/sounds/goal.mp3';
import idiotSoundSource from '../assets/sounds/idiot.mp3';
import monkeyTennisSoundSource from '../assets/sounds/monkey-tennis.mp3';
const goalSound = new Howl({ src: [goalSoundSource] });
const idiotSound = new Howl({ src: [idiotSoundSource] });
const monkeyTennisSound = new Howl({ src: [monkeyTennisSoundSource] });


const GithubUrl = "https://github.com/philios33/predictor-league";

function App() {    

    const registerServiceWorker = async () => {
        const login = getLogin();

        // Once it is ready, give it the login token IF we are logged in
        navigator.serviceWorker.ready.then( registration => {
            if (registration.active && login !== null) {
                console.log("Posted the login token to the ready service worker");
                registration.active?.postMessage({
                    action: 'LOGIN_TOKEN',
                    login: login,
                });
            }
        });

        // Register SW
        await navigator.serviceWorker.register('/service.js');
    }

    // Initialize deferredPrompt for use later to show browser install prompt.
    let deferredPrompt: any = null;
    const addPWAListener = () => {
        window.addEventListener('beforeinstallprompt', (e: any) => {
            console.log("BEFORE INSTALL PROMPT FIRED", e);
            e.preventDefault();
            deferredPrompt = e;
            showTheHomeScreenModal();
        });
        window.addEventListener('appinstalled', () => {
            setHomeScreenInstalled(true);
            setShowAddToHomeScreenModal(false);
            deferredPrompt = null;
            goalSound.play();
            console.log('PWA was installed');
        });
    }

    const [refreshRequired, setRefreshRequired] = useState(false);

    useEffect(() => {
        startVersionChecking(() => {
            setRefreshRequired(true);
        });

        registerServiceWorker();

        addPWAListener();

        return () => {
            stopVersionChecking();
        }
    }, []);

    const doRefresh = () => {
        location.reload();
    }

    const [showAddToHomeScreenModal, setShowAddToHomeScreenModal] = useState(false);
    const [homeScreenInstalled, setHomeScreenInstalled] = useState(false);

    const showTheHomeScreenModal = () => {
        if (homeScreenInstalled) {
            return; // Already installed
        }

        const neverShow = localStorage.getItem('HomeScreenNever');
        if (neverShow === "true") {
            return; // Never show
        }

        monkeyTennisSound.play();
        setShowAddToHomeScreenModal(true);
    }
    const closeForNow = () => {
        idiotSound.play();
        setShowAddToHomeScreenModal(false);
    }
    const addToHomeScreen = async () => {
        setShowAddToHomeScreenModal(false);

        if (deferredPrompt !== null) {
            await deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = deferredPrompt.userChoice;
            // Optionally, send analytics event with outcome of user choice
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
        }
    }
    const neverAddToHomeScreen = () => {
        idiotSound.play();
        localStorage.setItem('HomeScreenNever', 'true');
        setShowAddToHomeScreenModal(false);
    }


    const login = getLogin();

    return (
        <div className="App">
            <header>
                <img src={logoSmall} srcSet={logoFull + " 1000w," + logo500 + " 500w"} alt="Predictor 22-23" title="Predictor 22-23"/>
                {/*<h1>Predictor 22-23</h1>*/}
                {login !== null && <p>Logged in as: <strong>{login.username}</strong></p>}
            </header>

            {refreshRequired && (
                <div className="refreshRequired">
                    The website has been updated.  Please <button onClick={() => doRefresh()}>Refresh</button>
                </div>
            )}

            <Router>
                <div>
                    <ul className="menu">
                        <li>
                            <Link className="btn" to="/">Home</Link>
                        </li>
                        <li>
                            <Link className="btn" to="/predictions">Predictions</Link>
                        </li>
                        <li>
                            <Link className="btn" to="/results">Results</Link>
                        </li>
                        {/* 
                        <li>
                            <Link className="btn" to="/tables">Tables</Link>
                        </li>
                        <li>
                            <Link className="btn" to="/cup/mrEggCup2021">Cup</Link>
                        </li>
                        */}
                    </ul>

                    <hr />

                    <Switch>
                        <Route exact path="/">
                            <Home />
                        </Route>

                        <Route path="/login/:origUser/:origPass">
                            <Login />
                        </Route>
                        <Route path="/login">
                            <Login />
                        </Route>

                        <Route path="/notifications">
                            <Notifications />
                        </Route>
                        
                        <Route path="/predictions/:weekId">
                            <PredictionsWeek />
                        </Route>
                        <Route path="/predictions">
                            <Predictions />
                        </Route>
                        
                        <Route path="/results">
                            <Results />
                        </Route>

                        <Route path="/tables">
                            <Tables />
                        </Route>

                        <Route path="/cup/:cupId">
                            <Cup />
                        </Route>
                    </Switch>
                </div>
            </Router>
            
            <footer>
                &copy; 2021 Philip Nicholls
                <br/>
                Build at {buildDetails.buildTime}
                <ul>
                    <li><a target="_blank" rel="noopener" href={GithubUrl}>Github project</a></li>
                </ul>                
            </footer>

            { showAddToHomeScreenModal && (
                <div>
                    <div className="modalBackground">.</div>
                    <div className="modal">
                        <button className="close" onClick={() => closeForNow()} >x</button>
                        <p className="Title">Add Predictor to your Home screen?</p>
                        <p>
                            <img src={alanImage} />
                            Oi! Click here to add this website as an app on your device.

                        </p>
                        
                        <button className="addYes" onClick={() => addToHomeScreen()} >Add to home screen</button>
                        <button className="addNo" onClick={() => neverAddToHomeScreen()} >Never bother me again</button>
                    
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
