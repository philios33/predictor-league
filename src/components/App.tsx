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
import Home, { getLogin } from './pages/Home';

import './pages/pages.scss';
import Login from './pages/Login';


const GithubUrl = "https://github.com/philios33/predictor-league";

function App() {    

    const login = getLogin();

    return (
        <div className="App">
            <header>
                <h1>Predictor League</h1>
                {login !== null && <p>Logged in as: <strong>{login.username}</strong></p>}
            </header>

            <Router>
                <div>
                    <ul className="menu">
                        <li>
                            <Link to="/">Home</Link>
                        </li>
                        <li>
                            <Link to="/predictions">Predictions</Link>
                        </li>
                        <li>
                            <Link to="/results">Results</Link>
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
