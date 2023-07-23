import React from 'react';
import { getLogin } from '../lib/util';
import WebAuthNRegisterButton from './WebAuthNRegisterButton';

export default function AuthDeviceEnrollment() {

    const login = getLogin();

    return <div className="avatarWidget">
        <h3>Auth Device Enrollment</h3>

        {login === null ? (
            <div>You are not logged in.<br/><br/>Please use the Whatsapp link from Phil and then enroll your device for easier login.</div>
        ) : (
            <>
                <p>Note: You will be logged out: {login.expiry.toLocaleDateString()} {login.expiry.toLocaleTimeString()}</p>
                <hr />
                <WebAuthNRegisterButton />
            </>
        )}       
    </div>
}