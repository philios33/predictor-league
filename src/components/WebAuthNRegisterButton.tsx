import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { getLogin } from '../lib/util';

export default function WebAuthNRegisterButton() {

    const [isCompatible, setIsCompatible] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);

    const login = getLogin();

    useEffect(() => {
        // Is this a compatible device?
        const result = browserSupportsWebAuthn();
        setIsCompatible(result);
    }, []);

    const startRegFlow = async () => {
        try {
            if (!isCompatible) {
                throw new Error("Not a compatible device");
            }
            if (isDisabled) {
                throw new Error("Already executed once");
            }
            if (login === null) {
                throw new Error("Not logged in");
            }
            setIsDisabled(true);

            const resp = await axios({
                url: '/webauthn/generateRegistrationOptions',
                headers: {
                    authorization: login.token,
                },
                validateStatus: () => true,
                timeout: 5000,
            });
            if (resp.status !== 200) {
                throw new Error("Could not generate registration options: " + resp.status);
            }
            
            // console.log("Received registration options from server", JSON.stringify(resp.data, null, 4));

            const asseResp = await startRegistration(resp.data);

            // console.log("Received response from authenticator", JSON.stringify(asseResp, null, 4));

            const result = await axios({
                method: 'POST',
                url: '/webauthn/verifyRegistration',
                data: JSON.stringify(asseResp),
                headers: {
                    authorization: login.token,
                    "content-type": "application/json",
                },
                validateStatus: () => true,
                timeout: 5000,
            });

            // console.log("Received OK from server", JSON.stringify(result, null, 4));

            alert("Device enrollment successful");

            window.location.href="/predictions";

        } catch(e: any) {
            console.error(e);
            alert("FAILED: " + e.message);
            setIsDisabled(false);
        }
    }

    if (!isCompatible) {
        return <></>;
    }

    return <div>
        <button className="btn" onClick={() => startRegFlow()} disabled={isDisabled}>Enroll a new authentication device</button>
        <p>You can add as many devices as you like.</p>
    </div>
}