import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'cropperjs';

import { config } from '../config';
import { Profile } from '../lib/types';
import { getLogin } from '../lib/util';

import 'cropperjs/dist/cropper.css';
import './AvatarWidget.scss';
import { drawPlayerImage } from '../lib/faces';

function AvatarWidget() {

    useEffect(() => {
        startup();
        return () => {
            shutdown();
        }
    }, []);
 
    const startup = async () => {
        await refreshProfile();
    }

    const refreshProfile = async () => {
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

    const [changeMode, setChangeMode] = useState(false);

    const changeAvatar = () => {
        setChangeMode(true);
    }

    const resultRef = useRef(null as null | HTMLDivElement);
    const previewRef = useRef(null as null | HTMLImageElement);

    const [myCropper, setMyCropper] = useState(null as null | Cropper);

    const fileUploadChanged = (e: any) => {
        // console.log("File upload changed...");
        if (e.target.files.length) {
            const reader = new FileReader();
            reader.onload = (e2: any)=> {
                if (e2.target.result){
                    if (resultRef.current !== null && previewRef.current !== null) {
                        let img = document.createElement('img');
                        img.id = 'image';
                        img.src = e2.target.result;
                        resultRef.current.innerHTML = '';
                        resultRef.current.appendChild(img);
                        const cropper = new Cropper(img, {
                            viewMode: 1,
                            aspectRatio: 1,
                            dragMode: "move",
                            preview: previewRef.current,
                            minCropBoxWidth: 40,
                            minCropBoxHeight: 40,
                            crop(event) {
                                // console.log(event);
                            }
                        });
                        setMyCropper(cropper);
                    }
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    const saveAvatar = async (e: any) => {
        e.preventDefault();
        if (myCropper !== null) {
            /*
            let imgSrc = myCropper.getCroppedCanvas({
                width: 166,
                height: 166,
            }).toDataURL('image/jpeg');
            console.log("Image src", imgSrc);
            */

            const form = await new Promise((resolve, reject) => {
                myCropper.getCroppedCanvas({
                    width: 166,
                    height: 166,
                }).toBlob(function (blob) {
                    if (blob === null) {
                        reject(new Error("Null blob returned"));
                    } else {
                        var formData = new FormData();
                        formData.append('avatarImage', blob);
                        resolve(formData);
                    }
                }, "image/jpeg");
            });

            const login = getLogin();
            if (login === null) {
                throw new Error("Not logged in");
            }
            const result = await axios({
                method: "POST",
                baseURL: config.serviceEndpoint,
                url: "/service/avatar",
                headers: {
                    authorization: login.token,
                },
                data: form,
                timeout: 20 * 1000,
                validateStatus: () => true,
            });
            if (result.status === 200) {
                // Switch back to the current avatar view and load the new one
                setChangeMode(false);
                refreshProfile();
                
            } else if (result.status === 500 && result.data.error) {
                alert("Error saving new avatar: " + result.data.error);
            } else {
                alert("Error saving new avatar: Status " + result.status);
            }
            
        }
    }

    const [newAvatarClass, setNewAvatar] = useState("hidden");
    const [currentAvatarClass, setCurrentAvatar] = useState("");

    useEffect(() => {
        if (changeMode) {
            // Hide current, show new
            setCurrentAvatar("hiding");
            setTimeout(() => {
                setCurrentAvatar("hidden");
                setNewAvatar("hiding"); // Fade in the new
                setTimeout(() => {
                    setNewAvatar(""); // Fade in the new
                }, 10);
            }, 500);
        } else {
            // Show current, hide new
            setNewAvatar("hiding");
            setTimeout(() => {
                setNewAvatar("hidden");
                setCurrentAvatar("hiding"); // Fade in the current
                setTimeout(() => {
                    setCurrentAvatar("");
                }, 10);
            }, 500);
        }
    }, [changeMode]);

    const newAvatarClassName = "newAvatar " + newAvatarClass;
    const currentAvatarClassName = "currentAvatar " + currentAvatarClass;

    return <div className="avatarWidget">

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
                <div className={newAvatarClassName}>
                    <h3>Upload new avatar</h3>

                    <div className="box">
                        <input type="file" onChange={(e) => fileUploadChanged(e)} id="file-input"></input>
                    </div>

                    <div className="box-2">
                        <div className="result" ref={resultRef}></div>
                    </div>

                    <div className="box-2" >
                        <div className="preview" ref={previewRef}></div>
                        <button className="btn" onClick={(e) => setChangeMode(false)}>Cancel</button>
                        <button className="btn" onClick={(e) => saveAvatar(e)}>Save</button>
                    </div>
                </div>
                
                <div className={currentAvatarClassName}>
                    <h3>Your current avatar</h3>

                    { profile.avatarId === null ? (
                        drawPlayerImage(profile.username)
                    ) : (
                        <img className="myAvatar" src={"/service/avatar/" + profile.username + "/" + profile.avatarId} />
                    )}

                    <button className="btn" onClick={() => changeAvatar()}>Change</button>
                    { /*<p className="note">Note: Your new avatar will only be used in future standings tables.</p>*/ }
                </div>
            </>
            
        )}

    </div>
}

export default AvatarWidget;

