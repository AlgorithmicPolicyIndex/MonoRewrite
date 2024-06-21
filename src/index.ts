import { ActivityType, Client, Events, GatewayIntentBits, PresenceUpdateStatus } from "discord.js";
import { config } from "dotenv";
import path from "path";
import { defineCommands } from "./functions";
import { settingsCreate, settingsExist } from "./database/guild";
import { oneUserExists, userCreate } from "./database/user";
import { gameCreate, gameExist } from "./database/game";
config({ path: path.join(__dirname, "secrets", ".env") });

const client = new Client({
	intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences ]
});

defineCommands(client);

client.on(Events.ClientReady, (c) => {
	console.info(`Logged in as ${c.user.tag}`);
	c.user.setPresence({
		status: PresenceUpdateStatus.DoNotDisturb,
		activities: [{
			name: "Killing Game",
			state: "MURDER!",
			type: ActivityType.Playing
		}]
	});
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) return;

	if (!await settingsExist(interaction.guild?.id as string)) {
		await settingsCreate(interaction.guild?.id as string, { channelId: "null", roleId: "null", ping: false });
	}
	if (!await gameExist(interaction.guild?.id as string)) {
		await gameCreate(interaction.guild?.id as string, { totalGames: 0, totalWonGames: 0 });
	}
	if (!await oneUserExists(interaction.guild?.id as string, interaction.user.id)) {
		await userCreate(interaction.guild?.id as string, { [interaction.user.id]: { totalWonGames: 0 }});
	}
	
	await command.execute(interaction, client).catch(async err => {
		console.error(err);
		return;
	});
});

client.login(process.env.TOKEN);