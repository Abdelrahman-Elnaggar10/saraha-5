
import { Router } from "express";
import * as userService from "./user.service.js";
import { authentication } from "../../Middlewares/authentication.middleware.js";
import { authorization } from "../../Middlewares/authorization.middleware.js";
import { ROLES } from "../../Utils/constants.js";
import { decrypt } from "../../Utils/Security/encryption.security.js";
import { uploadProfilePicture } from "../../Middlewares/multer.middleware.js";

const userController = Router();


userController.get("/health", (req, res) => {
    return res.status(200).json({
        message: "User module is working successfully"
    });
});

userController.get("/profile", authentication, async (req, res) => {
    const userData = req.user.toObject();

    if (userData.phoneNumber) {
        userData.phoneNumber = decrypt(userData.phoneNumber);
    }

    return res.status(200).json({
        message: "User profile retrieved successfully",
        data: userData
    });
});

// must be before "/:id" routes, otherwise "profile-picture" is treated as an id
userController.patch("/profile-picture", authentication, uploadProfilePicture, async (req, res) => {
    const user = await userService.updateProfilePicture(req.user._id, req.file);

    return res.status(200).json({
        message: "Profile picture updated successfully",
        data: user
    });
});

userController.get("/:id", async (req, res) => {
    const user = await userService.getUserProfileById(req.params.id);

    return res.status(200).json({
        message: "User profile retrieved successfully",
        data: user
    });
});

userController.get("/", authentication, authorization(ROLES.ADMIN), async (req, res) => {
    const users = await userService.getAllUsers();

    return res.status(200).json({
        message: "Users retrieved successfully",
        data: users
    });
});

userController.patch("/:id", async (req, res) => {
    const user = await userService.updateProfile(req.params.id, req.body);

    return res.status(200).json({
        message: "User profile updated successfully",
        data: user
    });
});

userController.delete("/:id", authentication, authorization(ROLES.ADMIN), async (req, res) => {
    await userService.deleteProfile(req.params.id);

    return res.status(200).json({
        message: "User deleted successfully"
    });
});

export default userController;
