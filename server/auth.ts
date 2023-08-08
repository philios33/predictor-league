import jwt from 'jsonwebtoken';
import fs from 'fs';
import { Logger } from '../src/lib/logger';

const signingSecretFile = __dirname + "/../keys/signing.key";
const SECRET_SIGNING_KEY = fs.readFileSync(signingSecretFile);

export const validateJWTToUser = (token?: string): string => {
    if (token) {
        const decoded = jwt.verify(token, SECRET_SIGNING_KEY, {
            algorithms: ['HS256'],
            audience: 'predictor',
            complete: true,
        }) as jwt.Jwt;
        if (!decoded.payload.sub) {
            throw new Error("Missing sub");
        }
        return decoded.payload.sub as string;
    } else {
        throw new Error("Not logged in");
    }
}

export const signJWTForUser = (logger: Logger, name: string, expirySeconds: number): {token: string, expiry: Date} => {
    // Sign a token that can be used with the other services
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expirySeconds);
    
    const token = jwt.sign({
        exp: Math.floor(expiryDate.getTime() / 1000),
        // sec: secret, // No need to put the secret inside of the token, since we can validate the token to assume the user is authorized to edit.
    }, SECRET_SIGNING_KEY, {
        algorithm: 'HS256',
        // expiry: expiryDate,
        // expiresIn,
        audience: 'predictor',
        issuer: 'predictor',
        subject: name,
    });

    logger.writeEvent("SIGNED_LOGIN_TOKEN", {
        userId: name,
        expirySeconds,
        expiresAt: expiryDate,
    });
    
    return {
        token,
        expiry: expiryDate,
    };
}