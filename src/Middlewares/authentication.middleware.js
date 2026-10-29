import { verifyAccessToken } from "../Utils/Security/token.security.js";
import userRepository from "../DB/Repositories/user.repository.js";
import { exists } from "../DB/redis.service.js";


export const authentication = async (req, res, next) => {
    const { authorization } = req.headers;


    if (!authorization) {
        return res.status(401).json({ message: "Authorization header is required", code: "TOKEN_MISSING" });
    }


    const [scheme, token] = authorization.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return res.status(401).json({ message: "Authorization header must be in the form: Bearer <token>", code: "INVALID_AUTH_SCHEME" });
    }

    let decoded;
    try {
        decoded = verifyAccessToken(token);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token has expired", code: "TOKEN_EXPIRED" });
        }
        return res.status(401).json({ message: "Invalid token", code: "TOKEN_INVALID" });
    }

    // the token must not be blacklisted (the user logged out)
    if (await exists(`blacklist:${decoded.jti}`)) {
        return res.status(401).json({ message: "Token is revoked, please login again", code: "TOKEN_REVOKED" });
    }

    const user = await userRepository
        .findDocumentById(decoded.id)
        .select("-password");

    if (!user) {
        return res.status(401).json({ message: "User not found", code: "USER_NOT_FOUND" });
    }

    req.user = user;
    req.decoded = decoded;

    next();
};
