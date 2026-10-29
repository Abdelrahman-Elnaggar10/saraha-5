/**
 * Authorization middleware: makes sure the logged-in user has an allowed role.
 * Must be used AFTER the authentication middleware (it needs req.user).
 *
 * Example:  router.delete("/:id", authentication, authorization(ROLES.ADMIN), handler)
 */
export const authorization = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You are not allowed to access this resource",
                code: "FORBIDDEN"
            });
        }

        next();
    };
};
