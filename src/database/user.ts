import { Config, JsonDB } from "node-json-db";
import { User } from "../interfaces";

const db = new JsonDB(new Config("JSONDB/users", true, true, "/"));

async function userCreate(guildId: string, options: User, override?: boolean) {
        return db.push(`/${guildId}`, options, override);
}

async function userExist(guildId: string) {
        return await db.exists(`/${guildId}`);
}

async function getUser(guildId: string) {        
        return await db.getData(`/${guildId}`);
}

async function getOneUser(guildId: string, userId: string) {
        return await db.getData(`/${guildId}/${userId}`);
}

async function oneUserExists(guildId: string, userId: string) {
        return await db.exists(`/${guildId}/${userId}`);
}

export { userCreate, getOneUser, userExist, getUser, oneUserExists }