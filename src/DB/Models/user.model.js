
import mongoose from "mongoose";
import { ROLES } from "../../Utils/constants.js";

// password / age / gender are required only for normal (local) users, not for Google users
const isLocalUser = function () {
  return this.provider === "local";
};

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [20, "First name must be at most 20 characters long"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters long"],
      maxlength: [20, "Last name must be at most 20 characters long"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
      index: {
        name: "idx_email_unique",
      },
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      required: [isLocalUser, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
    },

    age: {
      type: Number,
      required: [isLocalUser, "Age is required"],
      min: [18, "Age must be at least 18"],
    },

    gender: {
      type: String,
      enum: {
        values: ["male", "female"],
        message: "Gender must be either male or female",
      },
      required: [isLocalUser, "Gender is required"],
    },

    profilePicture: {
      type: String,
      default: null,
      trim: true,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },

    isEmailConfirmed: {
      type: Boolean,
      default: false,
    },

    twoStepEnabled: {
      type: Boolean,
      default: false,
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleSub: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model("User", userSchema);

export default User;
