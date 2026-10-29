import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { TOKEN_TYPES } from "../constants.js";


export const generateToken = ({
    payload,
    secret = process.env.JWT_SECRET,
    options = {},
}) => {
    return jwt.sign(payload, secret, options);
};


export const verifyToken = ({
    token,
    secret = process.env.JWT_SECRET,
    options = {},
}) => {
    return jwt.verify(token, secret, options);
};


const signUserToken = (user, type, secret, expiresIn) => {
    return generateToken({
        payload: {
            id: user._id.toString(),
            email: user.email,
            type,
        },
        secret,
        options: {
            expiresIn,
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
            jwtid: crypto.randomUUID(), 
        },
    });
};

const verifyUserToken = (token, type, secret) => {
    const decoded = verifyToken({
        token,
        secret,
        options: {
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
        },
    });

    // an access token can not be used as a refresh token (and vice versa)
    if (decoded.type !== type) {
        throw new Error("Invalid token type");
    }

    return decoded;
};

export const generateAccessToken = (user) => {
    return signUserToken(
        user,
        TOKEN_TYPES.ACCESS,
        process.env.JWT_SECRET,
        process.env.JWT_ACCESS_EXPIRES_IN
    );
};

export const verifyAccessToken = (token) => {
    return verifyUserToken(token, TOKEN_TYPES.ACCESS, process.env.JWT_SECRET);
};

export const generateRefreshToken = (user) => {
    return signUserToken(
        user,
        TOKEN_TYPES.REFRESH,
        process.env.JWT_REFRESH_SECRET,
        process.env.JWT_REFRESH_EXPIRES_IN
    );
};

export const verifyRefreshToken = (token) => {
    return verifyUserToken(token, TOKEN_TYPES.REFRESH, process.env.JWT_REFRESH_SECRET);
};
