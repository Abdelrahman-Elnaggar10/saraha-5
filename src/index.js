import './config.js'
import express from "express";
import authController from "./Modules/Auth/auth.controller.js";
import userController from "./Modules/User/user.controller.js";
import messageController from "./Modules/Message/message.controller.js";
import dbConnection from "./DB/db.connection.js";
import redisConnection from "./DB/redis.connection.js";
import globalErrorHandler from "./Middlewares/global-error-handler.middleware.js";
const app = express();


app.use(express.json());

dbConnection();
redisConnection();

// uploaded images can be opened in the browser:  http://localhost:3000/uploads/profile-pictures/<file>
app.use("/uploads", express.static("uploads"));

app.use('/api/auth',  authController);
app.use('/api/users', userController);
app.use('/api/message', messageController);



app.get('/', (req, res) => {
    res.status(200).json({
        message: "Blog App API is running"
    });
});



app.use((req, res, next) => {
    res.status(404).json({
        message: "Route not found"
    });
});


app.use(globalErrorHandler);


const port= process.env.PORT

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});