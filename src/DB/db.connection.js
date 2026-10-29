import mongoose from "mongoose";


const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.DB_URI_LOCAL)
        console.log('Database connected successfully');
    }catch (error) {
        console.error('Database connection failed:', error); 
    }
}

export default dbConnection;