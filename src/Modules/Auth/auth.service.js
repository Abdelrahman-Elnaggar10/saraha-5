
import userRepository from "../../DB/Repositories/user.repository.js";
import HttpAppError from "../../Utils/Errors/app.error.js";
import { encrypt } from "../../Utils/Security/encryption.security.js";
import { hash,verifyPassword } from "../../Utils/Security/hash.security.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../Utils/Security/token.security.js";
import { generateOtp, hashOtp, compareOtp } from "../../Utils/Security/otp.security.js";
import { verifyGoogleToken } from "../../Utils/Security/google.security.js";
import { sendEmail } from "../../Utils/email.util.js";
import { setValue, getValue, deleteKey, exists, getTtl, setExpire, increment } from "../../DB/redis.service.js";
import {
    OTP_PURPOSES, OTP_EXPIRES_IN, OTP_RESEND_AFTER, OTP_MAX_WRONG_TRIES,
    MAX_LOGIN_ATTEMPTS, LOGIN_BAN_TIME
} from "../../Utils/constants.js";

const generateTokens = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    };
};

export const registerUser = async(body) => {
    const { firstName, lastName, email, password, gender, age, phoneNumber} = body;


    const isExistingUser = await userRepository.findOneDocument({ email });
  

    if (isExistingUser) {
      throw new HttpAppError('User already exists', 409 , {duplicatedEmail:email} , 'EMAIL_CONFLICT')
    }
  
    let encryptedPhone ;
    if(phoneNumber) { encryptedPhone = encrypt(phoneNumber)}
    

    const hashedPassword = await hash(password)
    const user = await userRepository.createDocument({ firstName, lastName, email, password:hashedPassword, gender, age, phoneNumber: encryptedPhone || undefined});

    // send the confirmation OTP (if it fails the user can use "resend-confirm-email")
    try {
        await sendOtp(user.email, OTP_PURPOSES.CONFIRM_EMAIL);
    } catch (error) {
        console.error("Could not send confirmation email:", error.message);
    }

    return user;

}

export const SignIn = async ({ email, password }) => {
    const attemptsKey = `login-attempts:${email.toLowerCase()}`;
    const banKey = `login-ban:${email.toLowerCase()}`;

    // 1) is this account banned right now?
    const banTtl = await getTtl(banKey);
    if (banTtl > 0) {
        throw new HttpAppError(
            `Too many wrong attempts. Try again after ${Math.ceil(banTtl / 60)} minute(s)`,
            429,
            { retryAfterSeconds: banTtl },
            'ACCOUNT_TEMPORARILY_BANNED'
        );
    }

    const user = await userRepository.findOneDocument({ email });

    // (a Google user has no password)
    const isPasswordCorrect = user?.password
        ? await verifyPassword(user.password, password)
        : false;

    // 2) wrong password: count it, after 5 wrong attempts -> ban for 5 minutes
    if (!isPasswordCorrect) {
        const attempts = await increment(attemptsKey);
        await setExpire(attemptsKey, 60 * 60);

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            await setValue(banKey, 1, LOGIN_BAN_TIME);
            await deleteKey(attemptsKey);
            throw new HttpAppError(
                'Too many wrong attempts. Your account is banned for 5 minutes',
                429,
                { retryAfterSeconds: LOGIN_BAN_TIME },
                'ACCOUNT_TEMPORARILY_BANNED'
            );
        }

        throw new HttpAppError(
            'Invalid email or password',
            401,
            { remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts },
            'INVALID_CREDENTIALS'
        );
    }

    // 3) correct password: start counting from zero again
    await deleteKey(attemptsKey);

    if (!user.isEmailConfirmed) {
        throw new HttpAppError('Please confirm your email first', 403, {}, 'EMAIL_NOT_CONFIRMED');
    }

    // 4) 2-step verification enabled: send OTP, tokens come from /login-confirmation
    if (user.twoStepEnabled) {
        await sendOtp(user.email, OTP_PURPOSES.LOGIN);
        return { twoStepRequired: true };
    }

    return generateTokens(user);
  };

export const refreshAccessToken = async (refreshToken) => {
    let decoded;

    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new HttpAppError('Refresh token has expired', 401, {}, 'REFRESH_TOKEN_EXPIRED');
        }
        throw new HttpAppError('Invalid refresh token', 401, {}, 'REFRESH_TOKEN_INVALID');
    }

    if (await exists(`blacklist:${decoded.jti}`)) {
        throw new HttpAppError('Refresh token is revoked, please login again', 401, {}, 'TOKEN_REVOKED');
    }

    const user = await userRepository.findDocumentById(decoded.id);

    if (!user) {
        throw new HttpAppError('User not found', 401, {}, 'USER_NOT_FOUND');
    }

    return { accessToken: generateAccessToken(user) };
};


// ---------------------------------------------------------------------------
// OTP helpers (the OTP lives in Redis for 5 minutes, stored as a bcrypt hash)
// ---------------------------------------------------------------------------

const OTP_EMAIL_SUBJECTS = {
    [OTP_PURPOSES.CONFIRM_EMAIL]: "Confirm your email",
    [OTP_PURPOSES.LOGIN]: "Your login code",
    [OTP_PURPOSES.ENABLE_2SV]: "Enable 2-step verification",
    [OTP_PURPOSES.RESET_PASSWORD]: "Reset your password",
};

const sendOtp = async (email, purpose) => {
    email = email.toLowerCase();
    const otpKey = `otp:${purpose}:${email}`;
    const cooldownKey = `otp-cooldown:${purpose}:${email}`;

    // do not allow spamming: one OTP per minute
    const wait = await getTtl(cooldownKey);
    if (wait > 0) {
        throw new HttpAppError(
            `Please wait ${wait} seconds before asking for a new code`,
            429,
            { retryAfterSeconds: wait },
            'OTP_TOO_MANY_REQUESTS'
        );
    }

    const otp = generateOtp();
    await setValue(otpKey, await hashOtp(otp), OTP_EXPIRES_IN);
    await deleteKey(`otp-attempts:${purpose}:${email}`);
    await setValue(cooldownKey, 1, OTP_RESEND_AFTER);

    await sendEmail({
        to: email,
        subject: OTP_EMAIL_SUBJECTS[purpose],
        text: `Your code is: ${otp}\nIt is valid for ${OTP_EXPIRES_IN / 60} minutes.`,
    });
};

const verifyOtp = async (email, purpose, otp) => {
    email = email.toLowerCase();
    const otpKey = `otp:${purpose}:${email}`;
    const attemptsKey = `otp-attempts:${purpose}:${email}`;

    const hashedOtp = await getValue(otpKey);
    if (!hashedOtp) {
        throw new HttpAppError('Code expired or not requested, please ask for a new one', 400, {}, 'OTP_EXPIRED');
    }

    if (!(await compareOtp(otp, hashedOtp))) {
        const tries = await increment(attemptsKey);
        await setExpire(attemptsKey, OTP_EXPIRES_IN);

        // too many wrong codes: delete the OTP, the user must ask for a new one
        if (tries >= OTP_MAX_WRONG_TRIES) {
            await deleteKey(otpKey);
            await deleteKey(attemptsKey);
            throw new HttpAppError('Too many wrong codes, please ask for a new one', 400, {}, 'OTP_TOO_MANY_WRONG_TRIES');
        }
        throw new HttpAppError('Invalid code', 400, {}, 'OTP_INVALID');
    }

    await deleteKey(otpKey);
    await deleteKey(attemptsKey);
};

// ---------------------------------------------------------------------------
// Confirm email
// ---------------------------------------------------------------------------

export const confirmEmail = async ({ email, otp }) => {
    const user = await userRepository.findOneDocument({ email });

    if (!user) {
        throw new HttpAppError('User not found', 404, {}, 'USER_NOT_FOUND');
    }
    if (user.isEmailConfirmed) {
        throw new HttpAppError('Email is already confirmed', 400, {}, 'EMAIL_ALREADY_CONFIRMED');
    }

    await verifyOtp(email, OTP_PURPOSES.CONFIRM_EMAIL, otp);

    await userRepository.findDocumentByIdAndUpdate(user._id, { isEmailConfirmed: true });
};

export const resendConfirmEmail = async ({ email }) => {
    const user = await userRepository.findOneDocument({ email });

    if (!user) {
        throw new HttpAppError('User not found', 404, {}, 'USER_NOT_FOUND');
    }
    if (user.isEmailConfirmed) {
        throw new HttpAppError('Email is already confirmed', 400, {}, 'EMAIL_ALREADY_CONFIRMED');
    }

    await sendOtp(email, OTP_PURPOSES.CONFIRM_EMAIL);
};

// ---------------------------------------------------------------------------
// Login confirmation (2-step verification)
// ---------------------------------------------------------------------------

export const confirmLogin = async ({ email, otp }) => {
    await verifyOtp(email, OTP_PURPOSES.LOGIN, otp);

    const user = await userRepository.findOneDocument({ email });

    if (!user) {
        throw new HttpAppError('User not found', 404, {}, 'USER_NOT_FOUND');
    }

    return generateTokens(user);
};

// step 1: the logged-in user asks to enable 2-step verification -> OTP to his email
export const enableTwoStep = async (user) => {
    if (user.twoStepEnabled) {
        throw new HttpAppError('2-step verification is already enabled', 400, {}, 'TWO_STEP_ALREADY_ENABLED');
    }

    await sendOtp(user.email, OTP_PURPOSES.ENABLE_2SV);
};

// step 2: he sends the OTP -> 2-step verification is enabled
export const verifyEnableTwoStep = async (user, { otp }) => {
    await verifyOtp(user.email, OTP_PURPOSES.ENABLE_2SV, otp);

    await userRepository.findDocumentByIdAndUpdate(user._id, { twoStepEnabled: true });
};

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

export const forgotPassword = async ({ email }) => {
    const user = await userRepository.findOneDocument({ email });

    // same answer if the email does not exist (so nobody can discover who is registered)
    if (user && user.password) {
        await sendOtp(email, OTP_PURPOSES.RESET_PASSWORD);
    }
};

export const resetPassword = async ({ email, otp, newPassword }) => {
    await verifyOtp(email, OTP_PURPOSES.RESET_PASSWORD, otp);

    const user = await userRepository.findOneDocument({ email });

    if (!user) {
        throw new HttpAppError('User not found', 404, {}, 'USER_NOT_FOUND');
    }

    await userRepository.findDocumentByIdAndUpdate(user._id, { password: await hash(newPassword) });

    // if he was banned for wrong passwords, let him login with the new one
    await deleteKey(`login-attempts:${email.toLowerCase()}`);
    await deleteKey(`login-ban:${email.toLowerCase()}`);
};

// ---------------------------------------------------------------------------
// Logout: put the token ids (jti) in the Redis blacklist until the tokens expire
// ---------------------------------------------------------------------------

const blacklistToken = async (decoded) => {
    const secondsLeft = decoded.exp - Math.floor(Date.now() / 1000);

    if (secondsLeft > 0) {
        await setValue(`blacklist:${decoded.jti}`, 1, secondsLeft);
    }
};

export const logout = async (decodedAccessToken, decodedRefreshToken) => {
    if (decodedAccessToken.id !== decodedRefreshToken.id) {
        throw new HttpAppError('Refresh token does not belong to this user', 403, {}, 'FORBIDDEN');
    }

    await blacklistToken(decodedAccessToken);
    await blacklistToken(decodedRefreshToken);
};

// ---------------------------------------------------------------------------
// Social login with Google (the frontend sends the Google ID token)
// ---------------------------------------------------------------------------

export const registerWithGoogle = async ({ token }) => {
    const profile = await verifyGoogleToken(token);

    const existingUser = await userRepository.findOneDocument({
        $or: [{ googleSub: profile.sub }, { email: profile.email }]
    });

    if (existingUser) {
        throw new HttpAppError('User already exists', 409, { duplicatedEmail: profile.email }, 'EMAIL_CONFLICT');
    }

    const fallback = profile.email.split("@")[0].replace(/[^A-Za-z]/g, "");
    const firstName = (profile.given_name || profile.name || fallback || "User").slice(0, 20);
    const lastName = (profile.family_name || "Google").slice(0, 20);

    return userRepository.createDocument({
        firstName: firstName.length >= 2 ? firstName : "User",
        lastName: lastName.length >= 2 ? lastName : "Google",
        email: profile.email,
        provider: "google",
        googleSub: profile.sub,
        isEmailConfirmed: true, // Google already verified this email
        profilePicture: profile.picture || null,
    });
};

export const loginWithGoogle = async ({ token }) => {
    const profile = await verifyGoogleToken(token);

    const user = await userRepository.findOneDocument({ googleSub: profile.sub });

    if (!user) {
        throw new HttpAppError('Account not found, please register with Google first', 404, {}, 'USER_NOT_FOUND');
    }

    return generateTokens(user);
};
