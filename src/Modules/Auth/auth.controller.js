
import { Router } from "express";
import * as authService from "./auth.service.js";
import {
    loginSchema, signUpSchema, refreshTokenSchema,
    confirmEmailSchema, resendConfirmEmailSchema, loginConfirmationSchema,
    verifyTwoStepSchema, forgotPasswordSchema, resetPasswordSchema,
    logoutSchema, googleSchema
} from "./auth.validation.js";
import { validate } from "../../Middlewares/validation.middleware.js";
import { authentication } from "../../Middlewares/authentication.middleware.js";
import { decodeRefreshToken } from "../../Middlewares/decode-refresh-token.middleware.js";

const authController = Router();

authController.post("/register", validate(signUpSchema), async (req, res) => {
    const { confirmPassword, ...userData } = req.body;

    const result = await authService.registerUser(userData);

    return res.status(201).json({
        message: "User registered successfully, please confirm your email with the code we sent",
        data: result
    });
});

authController.post(
    "/login",
    validate(loginSchema),
    async (req, res) => {
        const { email, password } = req.body;

        const user = await authService.SignIn({
            email,
            password
        });

        // 2-step verification is enabled: no tokens yet, the OTP was sent to the email
        if (user.twoStepRequired) {
            return res.status(200).json({
                message: "We sent a code to your email, confirm it at /api/auth/login-confirmation",
                data: user
            });
        }

        return res.status(200).json({
            message: "User logged in successfully",
            data: user
        });
    }
);

authController.post(
    "/refresh-token",
    validate(refreshTokenSchema),
    async (req, res) => {
        const result = await authService.refreshAccessToken(req.body.refreshToken);

        return res.status(200).json({
            message: "Token refreshed successfully",
            data: result
        });
    }
);

authController.post("/confirm-email", validate(confirmEmailSchema), async (req, res) => {
    await authService.confirmEmail(req.body);

    return res.status(200).json({ message: "Email confirmed successfully" });
});

authController.post("/resend-confirm-email", validate(resendConfirmEmailSchema), async (req, res) => {
    await authService.resendConfirmEmail(req.body);

    return res.status(200).json({ message: "A new code was sent to your email" });
});

authController.post("/login-confirmation", validate(loginConfirmationSchema), async (req, res) => {
    const tokens = await authService.confirmLogin(req.body);

    return res.status(200).json({
        message: "User logged in successfully",
        data: tokens
    });
});

authController.post("/enable-2sv", authentication, async (req, res) => {
    await authService.enableTwoStep(req.user);

    return res.status(200).json({ message: "We sent a code to your email, verify it at /api/auth/verify-2sv" });
});

authController.post("/verify-2sv", authentication, validate(verifyTwoStepSchema), async (req, res) => {
    await authService.verifyEnableTwoStep(req.user, req.body);

    return res.status(200).json({ message: "2-step verification enabled successfully" });
});

authController.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
    await authService.forgotPassword(req.body);

    return res.status(200).json({ message: "If the email exists, a code was sent to it" });
});

authController.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
    const { confirmNewPassword, ...data } = req.body;

    await authService.resetPassword(data);

    return res.status(200).json({ message: "Password changed successfully" });
});

authController.post("/logout", authentication, validate(logoutSchema), decodeRefreshToken, async (req, res) => {
    await authService.logout(req.decoded, req.decodedRefreshToken);

    return res.status(200).json({ message: "Logged out successfully" });
});

authController.post("/google/register", validate(googleSchema), async (req, res) => {
    const user = await authService.registerWithGoogle(req.body);

    return res.status(201).json({
        message: "User registered with Google successfully",
        data: user
    });
});

authController.post("/google/login", validate(googleSchema), async (req, res) => {
    const tokens = await authService.loginWithGoogle(req.body);

    return res.status(200).json({
        message: "User logged in with Google successfully",
        data: tokens
    });
});

export default authController;
