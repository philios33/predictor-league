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

import logoSmall from '../assets/logo_small.jpg';
import logo500 from '../assets/logo_500w.png';
import logoFull from '../assets/logo.png';
import Cup from './pages/Cup';

const GithubUrl = "https://github.com/philios33/predictor-league";

function App() {    

    const [refreshRequired, setRefreshRequired] = useState(false);

    useEffect(() => {
        startVersionChecking(() => {
            setRefreshRequired(true);
        });
        return () => {
            stopVersionChecking();
        }
    }, []);

    const doRefresh = () => {
        location.reload();
    }

    const login = getLogin();

    return (
        <div className="App">
            <header>
                <img src={logoSmall} srcSet={logoFull + " 1000w," + logo500 + " 500w"} alt="Predictor 21-22" title="Predictor 21-22"/>
                {/*<h1>Predictor 21-22</h1>*/}
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
                        
                        <Route path="/predictions/:weekId">
                            <PredictionsWeek />
                        </Route>
                        <Route path="/predictions">
                            <Predictions />
                        </Route>
                        
                        <Route path="/results">
                            <Results />
                        </Route>

                        <Route path="/cup">
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
        </div>
    );
}

export default App;
