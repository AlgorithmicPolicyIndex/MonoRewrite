import { Config, JsonDB } from "node-json-db";
import { Server } from "../interfaces";

const db = new JsonDB(new Config("JSONDB/guilds", true, true, "/"));

async function settingsCreate(guildId: string, options: Server, override?: boolean) {
        return db.push(`/${guildId}`, options, override);
}

async function settingsExist(guildId: string) {
        return await db.exists(`/${guildId}`);
}

async function getSettings(guildId: string) {        
        return await db.getData(`/${guildId}`);
}

export { settingsCreate, settingsExist, getSettings }