import { OAuth2Client } from "google-auth-library";
import HttpAppError from "../Errors/app.error.js";

// Verifies the Google ID token that the frontend gets after "Sign in with Google".
// Returns the Google profile: { sub, email, email_verified, given_name, family_name, picture, ... }
export const verifyGoogleToken = async (idToken) => {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let payload;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch (error) {
        throw new HttpAppError("Invalid Google token", 401, {}, "GOOGLE_TOKEN_INVALID");
    }

    if (!payload?.email_verified) {
        throw new HttpAppError("Google email is not verified", 401, {}, "GOOGLE_EMAIL_NOT_VERIFIED");
    }

    return payload;
};
