
import React from 'react';
import AvatarWidget from '../AvatarWidget';
import Notifications from '../Notifications';


export default function Profile() {

    return (
        <div className="profile">
            <h2>Profile</h2>
            
            <Notifications />
            <AvatarWidget />
            
        </div>
    );
}