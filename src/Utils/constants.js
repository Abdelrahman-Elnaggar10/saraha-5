export const ROLES = {
    USER: "user",
    ADMIN: "admin",
};

export const TOKEN_TYPES = {
    ACCESS: "access",
    REFRESH: "refresh",
};

// Redis keys + times (seconds) used by tokens, OTP and login attempts
export const OTP_PURPOSES = {
    CONFIRM_EMAIL: "confirm-email",
    LOGIN: "login",
    ENABLE_2SV: "enable-2sv",
    RESET_PASSWORD: "reset-password",
};

export const OTP_EXPIRES_IN = 5 * 60;      // OTP is valid for 5 minutes
export const OTP_RESEND_AFTER = 60;        // can ask for a new OTP after 1 minute
export const OTP_MAX_WRONG_TRIES = 5;      // 5 wrong OTPs and the OTP is deleted

export const MAX_LOGIN_ATTEMPTS = 5;       // 5 wrong passwords in a row ...
export const LOGIN_BAN_TIME = 5 * 60;      // ... and the account is banned for 5 minutes
