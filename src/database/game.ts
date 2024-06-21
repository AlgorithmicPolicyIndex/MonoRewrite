import { Config, JsonDB } from "node-json-db";
import { Game, Vote } from "../interfaces";

const db = new JsonDB(new Config("JSONDB/games", true, true, "/"));

async function gameCreate(guildId: string, options: Game | Vote, override?: boolean) {
        return db.push(`/${guildId}`, options, override);
}

async function gameExist(guildId: string) {
        return await db.exists(`/${guildId}`);
}

async function getGame(guildId: string) {
        return await db.getData(`/${guildId}`);
}

export { gameCreate, gameExist, getGame }