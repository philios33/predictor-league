import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { setLogin } from '../lib/util';

type Props = {
    user: string
}
export default function WebAuthNLoginButton(props: Props) {

    const [isCompatible, setIsCompatible] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);

    useEffect(() => {
        // Is this a compatible device?
        const result = browserSupportsWebAuthn();
        setIsCompatible(result);
    }, []);

    const startLogin = async () => {
        try {
            if (!isCompatible) {
                throw new Error("Not a compatible device");
            }
            if (isDisabled) {
                throw new Error("Already executed once");
            }

            setIsDisabled(true);

            const resp = await axios({
                url: '/webauthn/generateLoginOptions/' + props.user,
                validateStatus: () => true,
                timeout: 5000,
            });
            if (resp.status !== 200) {
                throw new Error("Could not generate login options: " + resp.status);
            }
            
            // console.log("Received login options from server", JSON.stringify(resp.data, null, 4));

            const asseResp = await startAuthentication(resp.data);

            // console.log("Received response from authenticator", JSON.stringify(asseResp, null, 4));

            const result = await axios({
                method: 'POST',
                url: '/webauthn/verifyLogin/' + props.user,
                data: JSON.stringify(asseResp),
                headers: {
                    "content-type": "application/json",
                },
                validateStatus: () => true,
                timeout: 5000,
            });

            if (result.status !== 200) {
                throw new Error("Non 200 response when validating login");
            }

            // console.log("Received TOKEN from server", JSON.stringify(result, null, 4));

            setLogin({
                username: result.data.username,
                token: result.data.token,
                expiry: new Date(result.data.expiry),
            });

            // This forces a refresh and so reloads the login widget properly
            window.location.href="/predictions";

        } catch(e: any) {
            console.error(e);
            alert("FAILED: " + e.message);
            setIsDisabled(false);
        }
    }

    if (!isCompatible) {
        return <div>Sorry, your device isn't compatible with FIDO2 passwordless login.</div>
    }

    return <div>
        <button className="btn" onClick={() => startLogin()} disabled={isDisabled}>Login using device</button>
    </div>
}