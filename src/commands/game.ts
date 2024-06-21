import { AttachmentBuilder, CacheType, ChatInputCommandInteraction, EmbedBuilder, GuildMember, GuildTextBasedChannel, SlashCommandBuilder, User } from "discord.js";
import { getSettings } from "../database/guild";
import { gameCreate, gameExist, getGame } from "../database/game";
import { sortRandomImages } from "../functions";
import {setTimeout as wait} from "node:timers/promises";
import { Spec, View, parse } from "vega";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { unlinkSync } from "node:fs";
import path from "path";
import { getOneUser, userCreate } from "../database/user";
import { Vote } from "../interfaces";

export const data = new SlashCommandBuilder()
	.setName("game")
	.setDescription("Select the game you wish to play.")
	.addSubcommandGroup(scg =>
		scg.setName("killing-game")
		.setDescription("Select the Killing Game")
		.addSubcommand(sc =>
			sc.setName("start")
			.setDescription("Start the Killing game.")
			.addUserOption(o =>
				o.setName("user")
				.setDescription("Select the user to kill. | Leave blank for random.")
				.setRequired(false)
			)
		).addSubcommand(sc =>
			sc.setName("vote")
			.setDescription("Vote for who you think is the killer.")
			.addUserOption(o =>
				o.setName("user")
				.setDescription("Select the person you think is the killer.")
				.setRequired(true)
			)
		)
	).setDMPermission(false)

export async function execute(i: ChatInputCommandInteraction<CacheType>) {
	const settings = await getSettings(i.guild?.id as string);

	if (settings.channelId == "null" || settings.roleId == "null") {
		return i.reply("Settings do not exist for the server. Please use `/config`");
	}

	switch (i.options.getSubcommandGroup()) {
	case "killing-game":
		switch(i.options.getSubcommand()) {
		case "start":
			return startGame(i, settings);
		case "vote":
			return voteGame(i, settings);
		}
	}
}

async function startGame(i: ChatInputCommandInteraction<CacheType>, s: any) {
	// ? Game Variables
	const gameChannel = i.guild?.channels.cache.get(s.channelId) as GuildTextBasedChannel;
	const user = i.options.getUser("user") as User;
	const role = i.guild?.roles.cache.get(s.roleId);
	const list_of_avaliable_users = role?.members;
	let target: User | GuildMember | undefined;
	
	// ? Game Checks
	if (!user) {
		target = list_of_avaliable_users?.random() as GuildMember;
	} else {
		target = i.guild?.members.cache.get(user.id) as GuildMember;
	}
	
	if (user && !i.guild?.members.cache.get(user.id)?.roles.cache.get(s.roleId)) {
		return i.reply({ content: `This user does not have the ${role?.name} and can not be targeted.`, ephemeral: true });
	}
	if (i.user.id == target.id) return i.reply({ content: "You can not kill yourself.", ephemeral: true });
	
	// ? Database Variables
	if (!await gameExist(i.guild?.id as string)) {
		await gameCreate(i.guild?.id as string, { killer: null, victim: null, started: false, voting: false }, false);
	}
	const hasGame = await getGame(i.guild?.id as string)
	if (hasGame.killer != null) {
		return i.reply({ content: "There is already a game happening in this server.", ephemeral: true });
	}
	
	// ? Game Start
	await i.deferReply({ ephemeral: true });
	await gameChannel.send({
		content: s.ping
			? `${role}\n*Disable ping with \`/config (channel) (role) false\`*`
			: `${role?.name}\n*Enable ping with \`/config (channel) (role) true\`*`,
		embeds: [new EmbedBuilder({
			title: "**There has been a murder!!!**",
			color: 10038562,
			fields: [{
				name: "Someone was found dead...",
				value: `It was ${target.displayName}`
			},{
				name: "Quickly, before the trial starts, investigate!",
				value: "You have 10 minutes!"
			}],
			footer: {
				text: "I can't spoiler embeded images :)"
			}
		})],
		files: [new AttachmentBuilder(`resources/body/${sortRandomImages("body")}`, { name: "SPOILER_body.png" })]
	});

	// ? Wait 10 minutes
	await wait(1000 * 60 * 10);

	await i.editReply({ content: `Oh you murder... killing ${target.displayName}...` });
	await gameCreate(i.guild?.id as string, { killer: i.user.id, victim: target.id, started: true, voting: false }, false);
	return await gameChannel.send({
		embeds: [new EmbedBuilder({
			title: "**The Trial has started!**",
			color: 10038562,
			description: "Prepare your arguments!",
			image: {
				url: "attachment://Trial.png"
			}
		})],
		files: [new AttachmentBuilder(`resources/trial/${sortRandomImages("trial")}`, { name: "Trial.png" })]
	});
}

let globalUUID: string;
async function voteGame(i: ChatInputCommandInteraction<CacheType>, s: any) {
	const user = i.guild?.members.cache.get(i.options.getUser("user")?.id as string) as GuildMember;
	const gameChannel = i.guild?.channels.cache.get(s.channelId) as GuildTextBasedChannel;
	const gameData = await getGame(i.guild?.id as string);
	let votedUsers: {[key: string]: Vote} = gameData.votedUsers;

	if (!user.roles.cache.get(s.roleId)) {
		return i.reply({
			content: "This user does not have the game role.",
			ephemeral: true
		});
	}
	if (i.user.id == gameData.victim) {
		return i.reply({
			content: "You are the victim, you can not vote in this game.",
			ephemeral: true
		});
	}
	if (gameData.started == false) {
		return i.reply({
			content: "The trial has not started.",
			ephemeral: true
		});
	}

	if (gameData.voting == true) {
		let alreadyVoted = false;
		for (const killer in votedUsers) {
			if (votedUsers[killer].voters.includes(i.user.id)) {
				alreadyVoted = true;
				return await i.reply({
					content: `You already voted for **${votedUsers[killer].name}**`,
					ephemeral: true
				});
			} 	
		}
		if (alreadyVoted == false) {
			await gameCreate(`${i.guild?.id}/votedUsers/${user.id}`, { voters: [i.user.id], name: user.displayName }, false);
			return await i.reply({
				content: `Your vote is locked in!!\n**You voted for ${user.displayName}.** I hope you're right!`,
				ephemeral: true
			});
		}
		return;
	}

	try {
		await i.deferReply({ ephemeral: true });

		await gameCreate(i.guild?.id as string, { voting: true, votedUsers: { [user.id]: { voters: [i.user.id], name: user.displayName }}}, false);

		await gameChannel.send("# The voting process has begun!\nYou have 10 minutes to finalize!\nOnce you vote, you are locked in.\n*Use `/vote` to begin.*");

		await wait(1000 * 60 * 4);
		await gameChannel.send("# You have 6 minutes left!!!");
		await wait(1000 * 60 * 4);
		await gameChannel.send("# You have 2 minutes left!!!");
		await wait(1000 * 60 * 2);

		let vote;
		const currentData = await getGame(i.guild?.id as string);
		let maxVotes = getMaxNum(currentData.votedUsers);
		if (maxVotes.length > 1) {
			vote = maxVotes[Math.floor(Math.random() * maxVotes.length)];
		} else {
			vote = maxVotes[0];
		}

		await makeChart(currentData.votedUsers);
		await wait(1000);
		await gameChannel.send({
			embeds: [new EmbedBuilder({
				title: "The voting has concluded!",
				color: 10038562,
				description: maxVotes.length > 1
					? `There was a tie! Randomly selecting... \`${currentData.votedUsers[vote].name}\` has been voted out!`
					: `${currentData.votedUsers[vote].name} has been voted out!`,
				image: { url: "attachment://chart.png" }
			})],
			files: [new AttachmentBuilder(`resources/temp/chart-${globalUUID}.png`, { name: "chart.png" })]
		});

		try {
			unlinkSync(path.join(__dirname, "..", "..", `resources/temp/chart-${globalUUID}.png`));
			console.info("File Removed: ", `resources/temp/chart-${globalUUID}.png`);
		} catch (err: any) {
			return console.error(err);
		}

		await wait(1000);
		if (gameData.killer == vote.id) {
			await gameChannel.send({
				embeds: [new EmbedBuilder({
					title: "The murder was correctly voted out!!!\nIt's punishment time!!!",
					color: 10038562,
					description: `It was... ${i.guild?.members.cache.get(gameData.killer)}!!!`,
					footer: {
						text: "I can\'t spoiler embed images :)" 
					}
				})],
				files: [new AttachmentBuilder(`resources/punish/${sortRandomImages("punish")}`, { name: "SPOILER_Punish.gif" })]
			});
			
			await gameCreate(i.guild?.id as string, { killer: null, victim: null, started: false, voting: false, totalGames: gameData.totalGames + 1, votedUsers: {}}, true);
		} else {
			await gameChannel.send({
				embeds: [new EmbedBuilder({
					title: "Sounds like you were wrong...\nNow you\"ll receive the ultimate punishment!",
					color: 10038562,
					description: `The killer was: ${i.guild?.members.cache.get(gameData.killer)}`,
					footer: {
						text: "I can\'t spoiler embed images :)" 
					}
				})],
				files: [new AttachmentBuilder(`resources/punish/${sortRandomImages("punish")}`, {name: "SPOILER_Punishment.gif"})]
			});

			const userData = await getOneUser(i.guild?.id as string, gameData.killer)
			await gameCreate(i.guild?.id as string, { killer: null, victim: null, started: false, voting: false, totalGames: gameData.totalGames + 1, totalWonGames: gameData.totalWonGames + 1, votedUsers: {}}, true);
			await userCreate(i.guild?.id as string, { [gameData.killer]: { totalWonGames: userData.totalWonGames + 1 }});
		}
		return i.editReply("Voting has ended.");
	} catch (err: any) {
		await gameCreate(i.guild?.id as string, { killer: null, victim: null, started: false, voting: false, votedUsers: null }, true);
		return console.error(err);
	}
}

function getMaxNum(killers: {[key: string]: Vote}) {
	const amountVoted: any[] = [];
	for (const killer in killers) {
		amountVoted.push(killers[killer].voters.length);
	}
	const num = Math.max.apply(null, amountVoted);
	const final: any[] = [];
	for (const killer in killers) {
		if (killers[killer].voters.length == num) {
			final.push(killer);
		}
	}
	return final;
}

function getData(jsondata: any) {
	const data: {user: string, votes: number}[] = [];
	for (const column in jsondata) {
		data.push({"user": jsondata[column].name, "votes": jsondata[column].voters.length});
	}
	return data;
}

async function makeChart(JSON: any) {
	const tempUUID = randomUUID();
	globalUUID = tempUUID;
	const data = getData(JSON);
	const config: Spec = {
		"$schema": "https://vega.github.io/schema/vega/v5.json",
		"width": 300,
		"height": 300,
		"padding": 10,
		"background": "#202020",
		"data": [
			{
				"name": "table",
				"values": data
			}
		],
		"scales": [
			{
				"name": "xscale",
				"type": "band",
				"domain": {"data": "table", "field": "user"},
				"range": "width",
				"padding": 0.1,
				"round": true
			},
			{
				"name": "yscale",
				"domain": {"data": "table", "field": "votes"},
				"nice": true,
				"range": "height"
			}
		],
		"axes": [
			{ "orient": "bottom", "scale": "xscale", "labelColor": "#C9C9C9", "domain": false, "ticks": false},
			{ "orient": "left", "scale": "yscale", "labelColor": "#B6B6B6", "title": "Votes", "titleColor": "#C9C9C9", "domain": false }
		],
		"marks": [
			{
				"type": "rect",
				"from": {"data":"table"},
				"encode": {
					"enter": {
						"x": {"scale": "xscale", "field": "user"},
						"width": {"scale": "xscale", "band": 1},
						"y": {"scale": "yscale", "field": "votes"},
						"y2": {"scale": "yscale", "value": 0}
					},
					"update": {
						"fill": {
							"value": "rgba(167, 26, 26, 0.75)"
						},
						"cornerRadius": [{"value": 3}]
					}
				}
			}
		]
	};

	try {
		const view = new View(parse(config), {renderer: "none"});
	
		await view.toSVG().then(async (svg: any) => {
			sharp(Buffer.from(svg)).toFormat("png")
				.toFile(path.join(__dirname, "..", "..", `/resources/temp/chart-${tempUUID}.png`), (err: any) => {
					if (err) throw console.error(err);
				});
		}).catch(function(err) {
			console.error(err);
		});
	} catch (err) {
		return console.error(err);
	}
}