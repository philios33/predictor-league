import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Redirect } from 'react-router-dom';
import { config } from '../../config';
import WebAuthNLoginButton from '../WebAuthNLoginButton';
import { setLogin } from '../../lib/util';

function Login() {

    const { origUser, origPass } = useParams() as {origUser: string, origPass: string};

    useEffect(() => {
        if (origUser || origPass) {
            setFormState(oldState => {
                const newState = {...oldState};
                if (origUser) {
                    newState.username = origUser;
                }
                if (origPass) {
                    newState.password = origPass;
                }
                setTimeout(() => {
                    doLogin(null, newState);
                }, 500);
                return newState;
            });
            
        }
    }, []);

    type FormState = {
        username: string
        password: string
    }
    const [formState, setFormState] = useState({
        username: "",
        password: "",
    } as FormState);

    const handleForm = (e: any, type: "username" | "password") => {
        e.preventDefault();
        const value = e.target.value;
        setFormState(oldState => {
            const newState: FormState = {...oldState};
            newState[type] = value;
            return newState;
        })
    }

    const [isLoading, setLoading] = useState(false);
    const [errorMessage, setError] = useState(null as null | string);

    // const [redirectTo, setRedirect] = useState(null as null | string);

    const doLogin = async (e : null | React.MouseEvent<HTMLInputElement, MouseEvent> = null, formState: FormState) => {
        if (e !== null) {
            e.preventDefault();
        }

        setError(null);
        setLoading(true);

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
                <div>
                    <label htmlFor="username">Username</label>
                    <input id="username" value={formState.username} placeholder="e.g. Phil" onChange={(e) => handleForm(e, "username")}></input>
                </div>
                <div>
                    <label htmlFor="password">Password</label>
                    <input id="password" value={formState.password} type="password" onChange={(e) => handleForm(e, "password")}></input>
                </div>
                <div>
                    { isLoading ? (
                        <>Loading...</>
                    ) : (
                        errorMessage ? (
                            <>
                                <p>{errorMessage}</p>
                                <input type="submit" value="Retry" onClick={(e) => doLogin(e, formState)}></input>
                            </>
                        ) : (
                            <input type="submit" value="Login" onClick={(e) => doLogin(e, formState)}></input>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;
