export const validate = (schema) => {
    return (req, res, next) => {
        const validation = schema.safeParse(req);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validation.error.issues
            });
        }

        req.body = validation.data.body;

        next();
    };
};