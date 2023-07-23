
import React from 'react';
import AvatarWidget from '../AvatarWidget';
import Notifications from '../Notifications';
import AuthDeviceEnrollment from '../AuthDeviceEnrollment';


export default function Profile() {

    return (
        <div className="profile">
            <h2>Profile</h2>
            
            <AuthDeviceEnrollment />
            <Notifications />
            <AvatarWidget />
            
        </div>
    );
}