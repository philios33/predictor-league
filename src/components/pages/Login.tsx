import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Redirect } from 'react-router-dom';
import { config } from '../../config';
import WebAuthNLoginButton from '../WebAuthNLoginButton';
import { setLogin } from '../../lib/util';
import { PlayerSelector } from '../PlayerSelector';
import { drawPlayerImage } from '../../lib/faces';

function Login() {

    const { origUser, origPass } = useParams() as {origUser?: string, origPass?: string};

    type FormState = {
        username: string
        password: string
    }
    const [formState, setFormState] = useState({
        username: "",
        password: "",
    } as FormState);

    useEffect(() => {
        if (typeof origUser === "string" && typeof origPass === "string") {
            const newState = {
                username: origUser,
                password: origPass,
            };
            setFormState(newState);
        }
    }, []);

    useEffect(() => {
        if (formState.username !== "" && formState.password !== "") {
            doLogin(null);
        }
    }, [formState]);

    

    /*
    const handleForm = (e: any, type: "username" | "password") => {
        e.preventDefault();
        const value = e.target.value;
        setFormState(oldState => {
            const newState: FormState = {...oldState};
            newState[type] = value;
            return newState;
        })
    }
    */

    const [isLoading, setLoading] = useState(false);
    const [errorMessage, setError] = useState(null as null | string);

    // const [redirectTo, setRedirect] = useState(null as null | string);

    const doLogin = async (e : null | React.MouseEvent<HTMLInputElement, MouseEvent> = null) => {
        if (e !== null) {
            e.preventDefault();
        }

        setError(null);
        setLoading(true);

        console.log("formState is", formState);

        // Make ajax request, store token and redirect to /predictions page
        try {
            // Validate
            if (formState.username === "" || formState.password === "") {
                throw new Error("Please enter username and password");
            }

            const result = await axios({
                method: "POST",
                url: config.serviceEndpoint + "service/loginService",
                data: {
                    username: formState.username,
                    password: formState.password,
                },
                timeout: 5000,
            });

            // 200
            setLogin({
                username: result.data.username,
                token: result.data.token,
                expiry: new Date(result.data.expiry),
            });

            // This forces a refresh and so reloads the login widget properly
            window.location.href="/predictions";

            // setRedirect("/predictions");

        } catch(e: any) {
            setLoading(false);
            setError(e.message);
        }
    }

    const onSelectedPlayer = (player: string) => {
        setFormState((oldState) => {
            return {
                ...oldState,
                username: player,
            }
        })
    }

    /*
    if (redirectTo !== null) {
        return <div>
            <p>Redirecting to {redirectTo}</p>
            <Redirect to={redirectTo} />
        </div>
    }
    */
    return (
        <div className="login">
            <div className="content">

                <WebAuthNLoginButton />

                <p>Or, if you are special:
                    <WebAuthNLoginButton userId="Damo" />
                    <WebAuthNLoginButton userId="Ellman" />
                    <WebAuthNLoginButton userId="Ian" />
                    <WebAuthNLoginButton userId="Rod" />
                </p>

                <p>Or, get a link from Phil on WhatsApp</p>

                {/*
                <h3>Player select</h3>


                {formState.username === "" ? (
                    <>
                        <PlayerSelector onChangePlayer={(p) => onSelectedPlayer(p)} />
                    </>
                ) : (
                    <div>
                        <h4>
                            {formState.username}
                            {formState.password === "" && (
                                <div className="logoutLink" onClick={() => setFormState({username:"", password:""})}>Change player</div>
                            )}
                        </h4>

                        

                        <div className="playerSquare selected">
                            {drawPlayerImage(formState.username)}
                        </div>
                        
                    </div>
                )}
                */}

                {formState.username !== "" && (
                    <div className="playerSquare selected">
                        {drawPlayerImage(formState.username)}
                    </div>
                )}

                <div>
                    { isLoading ? (
                        <>Loading...</>
                    ) : (
                        errorMessage ? (
                            <>
                                <p>{errorMessage}</p>
                            </>
                        ) : (
                            <></>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;
