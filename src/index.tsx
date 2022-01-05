import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

import { io } from "socket.io-client";
import DeviceDetector from "device-detector-js";
import { getLogin } from './lib/util';

const deviceDetector = new DeviceDetector();
const userAgent = navigator.userAgent;
const dd = deviceDetector.parse(userAgent);
const login = getLogin();

ReactDOM.render(
    <App />
    ,
    document.getElementById('root')
);

const socket = io();

socket.on("connect", () => {
    socket.emit("login", {
        client: dd.client,
        device: dd.device,
        os: dd.os,
        login,
    });
});

