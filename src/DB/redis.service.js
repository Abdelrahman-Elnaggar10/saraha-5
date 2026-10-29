import { redisClient } from "./redis.connection.js";

// Small helper functions on top of the redis client,
// so the rest of the project never talks to redis directly.

// save a value (optionally it is deleted automatically after ttlSeconds)
export const setValue = async (key, value, ttlSeconds) => {
    if (ttlSeconds) {
        return redisClient.set(key, String(value), { EX: ttlSeconds });
    }
    return redisClient.set(key, String(value));
};

export const getValue = (key) => redisClient.get(key);

export const deleteKey = (key) => redisClient.del(key);

export const exists = async (key) => (await redisClient.exists(key)) === 1;

// seconds left before the key is deleted (-2 = no key, -1 = no expiry)
export const getTtl = (key) => redisClient.ttl(key);

export const setExpire = (key, ttlSeconds) => redisClient.expire(key, ttlSeconds);

// +1 on a number stored in redis (creates it with 1 if it does not exist)
export const increment = (key) => redisClient.incr(key);
