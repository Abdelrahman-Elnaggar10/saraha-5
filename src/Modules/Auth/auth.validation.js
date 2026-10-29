
import { z } from "zod";

export const signUpSchema = z.object({ body: z.strictObject({
    firstName: z.string()
        .min(2)
        .max(20)
        .regex(
            /^[A-Za-z]+$/,
            "First name must contain English letters only"
        ),

    lastName: z.string()
        .min(2)
        .max(20)
        .regex(
            /^[A-Za-z]+$/,
            "Last name must contain English letters only"
        ),

    email: z.email(),

    password: z.string()
        .min(8)
        .max(16)
        .regex(
            /[A-Z]/,
            "Password must contain at least one uppercase letter"
        )
        .regex(
            /[a-z]/,
            "Password must contain at least one lowercase letter"
        )
        .regex(
            /[0-9]/,
            "Password must contain at least one number"
        )
        .regex(
            /[^A-Za-z0-9]/,
            "Password must contain at least one special character"
        ),

    confirmPassword: z.string(),

    age: z.number().min(18),

    gender: z.enum(["male", "female"]),

    phoneNumber: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
}) });

export const loginSchema = z.object({ body: z.strictObject({
    email: z.email(),

    password: z.string()
        .min(1, "Password is required")
}) });

export const refreshTokenSchema = z.object({ body: z.strictObject({
    refreshToken: z.string()
        .min(1, "Refresh token is required")
}) });


// ----- schemas for: OTP / 2-step verification / password reset / logout / google -----

const otpRule = z.string().regex(/^\d{6}$/, "OTP must be 6 digits");

export const confirmEmailSchema = z.object({ body: z.strictObject({
    email: z.email(),
    otp: otpRule
}) });

export const resendConfirmEmailSchema = z.object({ body: z.strictObject({
    email: z.email()
}) });

export const loginConfirmationSchema = z.object({ body: z.strictObject({
    email: z.email(),
    otp: otpRule
}) });

export const verifyTwoStepSchema = z.object({ body: z.strictObject({
    otp: otpRule
}) });

export const forgotPasswordSchema = z.object({ body: z.strictObject({
    email: z.email()
}) });

export const resetPasswordSchema = z.object({ body: z.strictObject({
    email: z.email(),
    otp: otpRule,
    newPassword: z.string()
        .min(8)
        .max(16)
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"]
}) });

export const logoutSchema = z.object({ body: z.strictObject({
    refreshToken: z.string().min(1, "Refresh token is required")
}) });

export const googleSchema = z.object({ body: z.strictObject({
    token: z.string().min(1, "Google token is required")
}) });
