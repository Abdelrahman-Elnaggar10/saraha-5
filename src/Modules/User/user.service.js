import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import userRepository from "../../DB/Repositories/user.repository.js";
import HttpAppError from "../../Utils/Errors/app.error.js";
import { encrypt, decrypt } from "../../Utils/Security/encryption.security.js";

const checkValidId = (userId) => {
    if (!mongoose.isValidObjectId(userId)) {
        throw new HttpAppError("Invalid user ID", 400, { userId }, "INVALID_ID");
    }
};

const toSafeUser = (user) => {
    const userData = user.toObject();

    delete userData.password;

    if (userData.phoneNumber) {
        userData.phoneNumber = decrypt(userData.phoneNumber);
    }

    return userData;
};

export const getUserProfileById = async (userId) => {
    checkValidId(userId);

    const user = await userRepository.findDocumentById(userId);

    if (!user) {
        throw new HttpAppError("User not found", 404, { userId }, "USER_NOT_FOUND");
    }

    return {
        firstName: user.firstName,
        lastName: user.lastName
    };
};


export const getAllUsers = async () => {
    const users = await userRepository.findDocuments();

    return users.map(toSafeUser);
};

export const updateProfile = async (userId, updateData) => {
    checkValidId(userId);

    const allowedFields = [
        "firstName",
        "lastName",
        "age",
        "gender",
        "phoneNumber",
        "profilePicture"
    ];

    const filteredData = {};

    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    }

    if (filteredData.phoneNumber) {
        filteredData.phoneNumber = encrypt(filteredData.phoneNumber);
    }

    const user = await userRepository.findDocumentByIdAndUpdate(
        userId,
        { $set: filteredData },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new HttpAppError("User not found", 404, { userId }, "USER_NOT_FOUND");
    }

    return toSafeUser(user);
};

export const deleteProfile = async (userId) => {
    checkValidId(userId);

    const user = await userRepository.findDocumentByIdAndDelete(userId);

    if (!user) {
        throw new HttpAppError("User not found", 404, { userId }, "USER_NOT_FOUND");
    }

    return user;
};

export const updateProfilePicture = async (userId, file) => {
    const user = await userRepository.findDocumentById(userId);
    const oldPicture = user?.profilePicture;

    const updatedUser = await userRepository.findDocumentByIdAndUpdate(
        userId,
        { profilePicture: `/uploads/profile-pictures/${file.filename}` },
        { new: true }
    );

    // delete the old picture file from the disk (if it was uploaded to our server)
    if (oldPicture?.startsWith("/uploads/")) {
        fs.unlink(path.resolve(oldPicture.slice(1)), () => {});
    }

    return toSafeUser(updatedUser);
};
