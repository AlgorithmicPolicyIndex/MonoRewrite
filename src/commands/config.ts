import { CacheType, ChannelType, ChatInputCommandInteraction, EmbedBuilder, GuildTextBasedChannel, PermissionFlagsBits, Role, SlashCommandBuilder } from "discord.js";
import { settingsCreate } from "../database/guild";

export const data = new SlashCommandBuilder()
        .setName("config")
        .setDescription("Set all required IDs and Options")
        .addChannelOption(option =>
                option.setName("channel")
                .addChannelTypes(ChannelType.GuildText)
                .setDescription("Set the channel the game is played in.")
                .setRequired(true)
        ).addRoleOption(option =>
                option.setName("role")
                .setDescription("Set the role to required to use the bot.")
                .setRequired(true)
        ).addBooleanOption(option =>
                option.setName("ping")
                .setDescription("Whether or not to ping the game role | Default: True")
        ).setDMPermission(false).setDefaultMemberPermissions(
                PermissionFlagsBits.KickMembers + PermissionFlagsBits.BanMembers
        );

export async function execute(i: ChatInputCommandInteraction<CacheType>) {
        // ? Options
        const channel = i.options.getChannel("channel") as GuildTextBasedChannel;
        const role = i.options.getRole("role") as Role;
        let ping = i.options.getBoolean("ping");
        if (ping == null) ping = true;

        if (channel.id == null || role.id == null) return i.reply("Channel or Role is null or unable to get ID"); 

        // ? Database
        // ? Even if the DB exists, it will overwrite all current settings.
        await settingsCreate(i.guild?.id as string, { channelId: channel.id, roleId: role.id, ping: ping == true ? ping : false}, true).catch((err) => {
                i.reply("There was an error.");
                throw new err;
        });

        return i.reply({
                embeds: [new EmbedBuilder({
                        title: "Settings",
                        description: "Created Settings",
                        fields: [{
                                name: "Game Channel",
                                value: `${channel}`
                        }, {
                                name: "Game Role",
                                value: `${role.name}`
                        }, {
                                name: "Pingable",
                                value: ping == true ? "Enabled" : "Disabled"
                        }]
                })]
        });

        
}