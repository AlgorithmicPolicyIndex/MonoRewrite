import { Client, Collection } from "discord.js";
import path from "path";
import * as fs from "fs";
import { getUser } from "./database/user";

export function defineCommands(c: Client) {
	c.commands = new Collection();
	const cmdPath = path.join(__dirname, "commands");
	const cmdFiles = fs.readdirSync(cmdPath).filter(file => file.endsWith(".ts"||".js"));
	for (const file of cmdFiles) {
		const filePath = path.join(cmdPath, file);
		const command = require(filePath);
		c.commands.set(command.data.name, command);
	}
}

export function sortRandomImages(imgpath: string): string {
	const images = [];
	const imagesPath = path.join(__dirname, "..", `resources/${imgpath}`);
	const imageFiles = fs
		.readdirSync(imagesPath);
	for (const image of imageFiles) {
		images.push(image);
	}
	return images[Math.floor(Math.random() * images.length)];
}

export async function findTopPlayer(guildId: string) {
	const userData = await getUser(guildId);
	let topPlayer: { id: string | null; totalWonGames: number} = { id: null, totalWonGames: 0 };
	for (const user in userData) {
		if (userData[user].totalWonGames > topPlayer.totalWonGames) {
			topPlayer = { id: user, totalWonGames: userData[user].totalWonGames };
		}
		continue;
	}
	return topPlayer;
}