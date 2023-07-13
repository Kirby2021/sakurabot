const {
   SlashCommandBuilder,
   EmbedBuilder,
   PermissionFlagsBits,
   ChatInputCommandInteraction,
   embed,
} = require("discord.js");

const Transcripts = require("discord-html-transcripts");
const { options } = require("mongoose/lib/utils");
const database = require("../../Schemas/MemberLog");

module.exports = {
   data: new SlashCommandBuilder()
     .setName("clear")
     .setDescription("Delete the messages you want")
     .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
     .setDMPermission(false)
     .addNumberOption((options) =>
       options
         .setName("amount")
         .setDescription("Say the number of messages you want to delete.")
         .setMinValue(1)
         .setMaxValue(100)
         .setRequired(true)
     )
     .addStringOption((options) =>
       options
         .setName("reason")
         .setDescription(
           "Give a reason why you want to delete these messages."
         )
         .setRequired(true)
     )
     .addUserOption((options) =>
       options
         .setName("target")
         .setDescription("Tell me the user you want to delete messages from.")
     ),
   /**
    *
    * @param {ChatInputCommandInteraction} interaction
    */
   async execute(interaction, client) {
     const { guild } = interaction;
     const logChannelData = await database.findOne(
       { Guild: guild.id },
       {
         logChannel: 1, // indicates that only the value of the logChannel field should be returned
       }
     );
     if (!logChannelData) {
       // check if no records were found in the database
       const embed = new EmbedBuilder()
         .setColor("#ff0000")
         .setDescription(
           "First you must set up the logging channel. Use the `/setup_memberLog` command to do so."
         );

       interaction.reply({ embeds: [embed] }); // send the embed message as a response to the interaction
       return;
     }
     const logChannel = client.channels.cache.get(logChannelData.logChannel); // get the channel via its ID // assign the value of the logChannel field to the logChannel variable
     if (!logChannel) {
       // check if log channel not found
       const embed = new EmbedBuilder()
         .setColor("#ff0000")
         .setDescription(
           "The registration channel was not found or I don't have access to it. Please make sure the channel exists and that I have the necessary permissions to post messages on it."
         );

       interaction.reply({ embeds: [embed] }); // send the embed message as a response to the interaction
       return;
     }
     const Amount = interaction.options.getNumber("amount");
     const Reason = interaction.options.getString("reason");
     const Target = interaction.options.getUser("target");

     const channelMessages = await interaction.channel.messages.fetch();

     const responseEmbed = new EmbedBuilder().setColor("Aqua");
     const logEmbed = new EmbedBuilder()
       .setColor("Aqua")
       .setAuthor({ name: "Used clear command 🧹" });

     let logEmbedDescription = [
       `• Moderator: ${interaction.member}`,
       `• Target: ${Target || "none"}`,
       `• Channel: ${interaction.channel}`,
       `• Reason: ${Reason}`,
     ];

     if (Target) {
       let i = 0;
       let messagesToDelete = [];
       channelMessages.filter((messages) => {
         if (messages.author.id === Target.id && Amount > i) {
           messagesToDelete.push(messages);
           i++;
         }
       });

       const Transcript = await Transcripts.generateFromMessages(
         messagesToDelete,
         interaction.channel
       );

       interaction.channel
         .bulkDelete(messagesToDelete, true)
         .then((messages) => {
           interaction.reply({
             embeds: [
               responseEmbed.setDescription(
                 `🧹 Cleaned up \`${messages.size}\` messages from ${Target}`
               ),
             ],
             ephemeral: true,
           });

           logEmbedDescription.push(`• Total messages: ${messages.size}`);
           logChannel.send({
             embeds: [logEmbed.setDescription(logEmbedDescription.join("\n"))],
             file: [Transcript],
           });
         });
     } else {
       const Transcript = await Transcripts.createTranscript(
         interaction.channel,
         { limit: Amount }
       );

       interaction.channel.bulkDelete(Amount, true).then((messages) => {
         interaction.reply({
           embeds: [
             responseEmbed.setDescription(
               `🧹 Cleaned up \`${messages.size}\` messages`
             ),
           ],
           ephemeral: true,
         });
         logEmbedDescription.push(`• Total messages: ${messages.size}`);
         logChannel.send({
           embeds: [logEmbed.setDescription(logEmbedDescription.join("\n"))],
           file: [Transcript],
         });
       });
     }
   },
};
