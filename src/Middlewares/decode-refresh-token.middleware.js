import { verifyRefreshToken } from "../Utils/Security/token.security.js";
import { exists } from "../DB/redis.service.js";

/**
 * Decodes the refresh token that comes in the body: { "refreshToken": "..." }
 * and checks that it was not blacklisted (logged out).
 *
 * On success it attaches:  req.decodedRefreshToken
 */
export const decodeRefreshToken = async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token is required", code: "REFRESH_TOKEN_MISSING" });
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Refresh token has expired", code: "REFRESH_TOKEN_EXPIRED" });
        }
        return res.status(401).json({ message: "Invalid refresh token", code: "REFRESH_TOKEN_INVALID" });
    }

    if (await exists(`blacklist:${decoded.jti}`)) {
        return res.status(401).json({ message: "Refresh token is revoked, please login again", code: "TOKEN_REVOKED" });
    }

    req.decodedRefreshToken = decoded;
    next();
};
