import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { findTopPlayer } from "../functions";
import { getGame } from "../database/game";
import { EmbedBuilder } from "@discordjs/builders";
import { getOneUser } from "../database/user";

export const data = new SlashCommandBuilder()
	.setName("stats")
	.setDescription("See the Guild stats and your personal won games")
	.setDMPermission(false)
export async function execute(i: ChatInputCommandInteraction<CacheType>) {
	const topPlayer = await findTopPlayer(i.guild?.id as string);
	const gameData = await getGame(i.guild?.id as string);
	const userData = await getOneUser(i.guild?.id as string, i.user.id);

	return i.reply({
		embeds: [new EmbedBuilder({
			title: "Stats",
			description: `Top Killer: ${topPlayer.id == null ? "None" : i.guild?.members.cache.get(topPlayer.id as string)?.displayName}`,
			fields: [{
				name: "Guild Stats",
				value: `Total Games: ${gameData.totalGames}\nGames Won: ${gameData.totalWonGames}`
			},{
				name: "Personal Stats",
				value: `${userData.totalWonGames}`
			}]
		})]
	});
}