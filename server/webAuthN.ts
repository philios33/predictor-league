import { Logger } from "../src/lib/logger";
import { Express, Request, Response } from 'express';
import { signJWTForUser, validateJWTToUser } from "./auth";
import { GenerateAuthenticationOptionsOpts, GenerateRegistrationOptionsOpts, VerifiedAuthenticationResponse, VerifiedRegistrationResponse, VerifyAuthenticationResponseOpts, VerifyRegistrationResponseOpts, generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { AuthenticationResponseJSON, AuthenticatorDevice, RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import { fetchUserWebAuthNChallenge, fetchUserWebAuthNDevices, updateUserWebAuthNChallenge, updateUserWebAuthNDevices } from "../src/lib/webauthn";
import GoogleAuth from "../src/lib/googleAuth";
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { getPlayerNames } from "../src/lib/players";
import { config } from "./config";

const plnames = getPlayerNames();
// See https://github.com/MasterKale/SimpleWebAuthn/blob/master/example/index.ts

const rpName = '30 Yard Sniper Predictor League';

/*
const rpID = "predictor.30yardsniper.co.uk";
const authOrigin = "https://predictor.30yardsniper.co.uk";
*/

/*
const rpID = "localhost";
const authOrigin = "http://localhost:8081";
*/

const rpID = config.relyingPartyId;
const authOrigin = config.authOrigin;

export default function loadWebAuthN(app: Express, logger: Logger, gauth: GoogleAuth) {

    app.get("/webauthn/generateRegistrationOptions", async (req: Request, res: Response) => {
        try {
            let user = validateJWTToUser(req.headers.authorization);
            
            // User has requested to start the registration flow.
            logger.writeEvent("STARTING_WEBAUTHN_REG_OPTIONS", {
                user
            });
            
            // Obtain the current registered devices for this user from the spreadsheet to avoid re-registering the same device
            const devices: Array<AuthenticatorDevice> = await fetchUserWebAuthNDevices(gauth, user);

            // console.log("DEVICES FOUND for " + user, JSON.stringify(devices, null, 4));

            const opts: GenerateRegistrationOptionsOpts = {
                rpName: rpName,
                rpID: rpID,
                userID: user,
                userName: user,
                timeout: 60000,
                attestationType: 'none',
                /**
                 * Passing in a user's list of already-registered authenticator IDs here prevents users from
                 * registering the same device multiple times. The authenticator will simply throw an error in
                 * the browser if it's asked to perform registration when one of these ID's already resides
                 * on it.
                 */
                excludeCredentials: devices.map(dev => ({
                    id: dev.credentialID,
                    type: 'public-key',
                    transports: dev.transports,
                })),
                authenticatorSelection: {
                    // residentKey: 'discouraged', // Not sure what this is, so will comment out
                },
                /**
                 * Support the two most common algorithms: ES256, and RS256
                 */
                // supportedAlgorithmIDs: [-7, -257], // Just support all algorithms
            };

            // console.log("USING OPTS", JSON.stringify(opts, null, 4));
        
            const options = generateRegistrationOptions(opts);

            // console.log("GOT OPTIONS", JSON.stringify(options, null, 4));

            // Store the current challenge on the user
            await updateUserWebAuthNChallenge(gauth, user, options.challenge);

            res.send(options);

        } catch(e: any) {
            
            console.error(e);

            logger.writeEvent("FAILED_WEBAUTHN_REG_OPTIONS", {
                error: e.message,
            });

            res.status(500);
            res.send(e.message);
        }
    });

    app.post("/webauthn/verifyRegistration", async (req: Request, res: Response) => {
        try {
            let user = validateJWTToUser(req.headers.authorization);

            logger.writeEvent("STARTING_WEBAUTHN_REG_VERIFY", {
                user
            });

            const body: RegistrationResponseJSON = req.body;

            const expectedChallenge = await fetchUserWebAuthNChallenge(gauth, user);
            if (expectedChallenge === null) {
                throw new Error("No challenge set for user yet");
            }

            let verification: VerifiedRegistrationResponse;
            try {
                const opts: VerifyRegistrationResponseOpts = {
                    response: body,
                    expectedChallenge,
                    expectedOrigin: authOrigin,
                    expectedRPID: rpID,
                    requireUserVerification: true,
                };
                verification = await verifyRegistrationResponse(opts);
            } catch (error) {
                const _error = error as Error;
                console.error(_error);
                return res.status(400).send({ error: _error.message });
            }

            const { verified, registrationInfo } = verification;

            if (verified && registrationInfo) {
                const { credentialPublicKey, credentialID, counter } = registrationInfo;

                const devices = await fetchUserWebAuthNDevices(gauth, user);

                const existingDevice = devices.find(device => isoUint8Array.areEqual(device.credentialID, credentialID));

                if (!existingDevice) {
                    const newDevice: AuthenticatorDevice = {
                        credentialPublicKey,
                        credentialID,
                        counter,
                        transports: body.response.transports,
                    };
                    devices.push(newDevice);
                    await updateUserWebAuthNDevices(gauth, user, devices);
                } else {
                    // Ignored as existing device
                    throw new Error("Device already exists");
                }
            }

            // Clear challenge
            await updateUserWebAuthNChallenge(gauth, user, "");
            
            res.send({ verified });
        } catch(e: any) {
            console.error(e);

            logger.writeEvent("FAILED_WEBAUTHN_REG_VERIFY", {
                error: e.message,
            });

            res.status(500);
            res.send(e.message);
        }
    });

    const loginChallenges: Record<string, string> = {};

    app.get("/webauthn/generateLoginOptions/:randomId", async (req: Request, res: Response) => {
        try {
            logger.writeEvent("STARTING_WEBAUTHN_LOGIN_OPTIONS", {
                
            });

            // By making it anonymous, we allow authenticators to respond with any stored credential possible
            // BUT we need the client to provide a randomId to map the challenge value to
            const randomId = req.params.randomId;
            if (randomId in loginChallenges) {
                throw new Error("Not random enough");
            }

            // const user = req.params.userId;

            // const devices = await fetchUserWebAuthNDevices(gauth, user);

            const opts: GenerateAuthenticationOptionsOpts = {
                timeout: 60000,
                /* allowCredentials: devices.map(dev => ({
                    id: dev.credentialID,
                    type: 'public-key',
                    transports: dev.transports,
                })), */
                userVerification: 'required',
                rpID,
            };
            
            const options = generateAuthenticationOptions(opts);
            
            loginChallenges[randomId] = options.challenge;
            
            res.send(options);

        } catch(e: any) {
            console.error(e);

            logger.writeEvent("FAILED_WEBAUTHN_LOGIN_OPTIONS", {
                error: e.message,
            });

            res.status(500);
            res.send(e.message);
        }
    });

    app.post("/webauthn/verifyLogin/:randomId", async (req: Request, res: Response) => {
        try {
            logger.writeEvent("STARTING_WEBAUTHN_LOGIN_VERIFY", {
                
            });

            // const user = req.params.userId;
            const body: AuthenticationResponseJSON = req.body;

            const randomId = req.params.randomId;
            if (!(randomId in loginChallenges)) {
                throw new Error("Unknown login challenge id");
            }
            const expectedChallenge = loginChallenges[randomId];

            // We MUST be able to obtain the user id here from the submitted body, otherwise we can't lookup the public key
            const user = body.response.userHandle;
            if (!user) {
                throw new Error("Authenticator did not supply userHandle with its response");
            }
            
            if (plnames.indexOf(user) === -1) {
                throw new Error("Unknown user handle: " + user);
            }

            const devices = await fetchUserWebAuthNDevices(gauth, user);

            let dbAuthenticator;
            // const bodyCredIDBuffer = base64url.toBuffer(body.rawId);
            const bodyCredIDBuffer = Buffer.from(body.rawId, "base64url");

            // "Query the DB" here for an authenticator matching `credentialID`
            for (const dev of devices) {
                if (isoUint8Array.areEqual(dev.credentialID, bodyCredIDBuffer)) {
                    dbAuthenticator = dev;
                    break;
                }
            }

            if (!dbAuthenticator) {
                return res.status(400).send({ error: 'Authenticator is not registered with this site' });
            }

            let verification: VerifiedAuthenticationResponse;
            try {
                const opts: VerifyAuthenticationResponseOpts = {
                    response: body,
                    expectedChallenge,
                    expectedOrigin: authOrigin,
                    expectedRPID: rpID,
                    authenticator: dbAuthenticator,
                    requireUserVerification: true,
                };
                verification = await verifyAuthenticationResponse(opts);
            } catch (error) {
                const _error = error as Error;
                console.error(_error);
                return res.status(400).send({ error: _error.message });
            }

            const { verified, authenticationInfo } = verification;

            if (verified) {
                // Update the authenticator's counter in the DB to the newest count in the authentication
                dbAuthenticator.counter = authenticationInfo.newCounter;
                // console.log("New counter value is: " + authenticationInfo.newCounter);
                // And write back the new devices array
                await updateUserWebAuthNDevices(gauth, user, devices);
            } else {
                console.error("Verification failed", verification);
                throw new Error("Not verified properly");
            }

            delete loginChallenges[randomId];

            // Now we can safely sign a user token here
            const tokenDetails = signJWTForUser(user, 60 * 60 * 24);

            res.send({
                token: tokenDetails.token,
                expiry: tokenDetails.expiry,
                username: user,
            });
        } catch(e: any) {
            console.error(e);

            logger.writeEvent("FAILED_WEBAUTHN_LOGIN_VERIFY", {
                error: e.message,
            });

            res.status(500);
            res.send(e.message);
        }
    });
}
