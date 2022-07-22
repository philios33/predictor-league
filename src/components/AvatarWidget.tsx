import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { config } from '../config';
import { Profile } from '../lib/types';
import { getLogin } from '../lib/util';

import './AvatarWidget.scss';

function AvatarWidget() {

    useEffect(() => {
        startup();
        return () => {
            shutdown();
        }
    }, []);
 
    const startup = async () => {
        const login = getLogin();
        if (login === null) {
            setProfile(null);
        } else {
            try {
                const profile = await getProfile(login.token);
                setProfile(profile);
            } catch(e) {
                setProfile(e.message);
            }
        }
    }

    const getProfile = async (token: string) : Promise<Profile> => {
        const response = await axios({
            method: "GET",
            baseURL: config.serviceEndpoint,
            url: "/service/profile",
            timeout: 5 * 1000,
            validateStatus: () => true,
            headers: {
                authorization: token
            }
        });
        if (response.status === 200) {
            return response.data.profile as Profile;

        } else if (response.status === 500 && response.data.error) {
            console.error("500 error response");
            console.error(response.data);
            throw new Error("Error 500: " + response.data.error);

        } else {
            console.error("Non 200 response: " + response.status);
            console.error(response.data);
            throw new Error("Non 200 response from API");
        }
    }

    const [profile, setProfile] = useState(false as Profile | null | false | string);

    const shutdown = () => {

    }

    return <div className="avatarWidget">
       <h2>Avatar widget</h2>

        {profile === false && (
            <div>Loading...</div>
        )}
        {typeof profile === "string" && (
            <div>Error: {profile}</div>
        )}
        {profile === null && (
            <div>Not logged in</div>
        )}
        {typeof profile === "object" && profile !== null && (
            <>
                <h3>Your current avatar</h3>
                <img src={"/avatar/" + profile.username + "/" + profile.avatarId} />
            </>
        )}
    </div>
}

export default AvatarWidget;

