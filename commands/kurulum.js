const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kurulum')
        .setDescription('Ödeme bildirim panelini bu kanala kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const button = new ButtonBuilder()
            .setCustomId('btn_odeme_bildir')
            .setLabel('Ödeme Bildir')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💰');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.channel.send({
            content: 'Guild ödemenizi (2m Silver veya eşdeğer İtem) yaptıktan sonra aşağıdaki butona tıklayarak bildirebilirsiniz.\n\n Lütfen ödemeyi doğru adaya/şehre bıraktığınızdan emin olun.',
            components: [row]
        });

        await interaction.reply({ content: 'Panel başarıyla kuruldu!', ephemeral: true });
    },
};
