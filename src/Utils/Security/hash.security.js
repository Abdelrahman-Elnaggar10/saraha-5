import * as argon2 from "argon2";

export const hash = (plainText)=>{
    return argon2.hash(plainText)
}



export const verifyPassword = ( hash , plainText)=>{
    return argon2.verify(hash , plainText)
}