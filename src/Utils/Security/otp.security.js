import crypto from "node:crypto";
import bcrypt from "bcrypt";

// 6 digits OTP, e.g. "042913"
export const generateOtp = () => {
    return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
};

// we never store the OTP as plain text, only its bcrypt hash
export const hashOtp = (otp) => bcrypt.hash(otp, 10);

export const compareOtp = (otp, hashedOtp) => bcrypt.compare(otp, hashedOtp);
