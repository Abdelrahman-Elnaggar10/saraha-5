import { createClient } from "redis";

// Redis = a very fast database that lives in memory.
// We use it for: blacklisted tokens (logout), OTP codes, login attempts / bans.
export const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
});

const redisConnection = async () => {
    try {
        await redisClient.connect();
        console.log("Redis connected successfully");
    } catch (error) {
        console.error("Redis connection failed:", error.message);
    }
};

export default redisConnection;
