import User from "../Models/user.model.js";
import BaseRepository from "./base.repository.js";



class UserRepository extends BaseRepository { constructor() {
    super(User); } getAllUsers() { 
    return this.model .find() .select("firstName lastName age") .sort({ firstName: -1 }) .limit(2) .skip(2); } } 
    export default new UserRepository();