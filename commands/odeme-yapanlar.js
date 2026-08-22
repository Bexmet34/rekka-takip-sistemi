const { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ödeme-yapanlar')
        .setDescription('Ödeme yapmış olan (onaylanan) kişileri listeler (Sadece Yetkililer).'),
    async execute(interaction) {
        // Yetki kontrolü
        const officerRoleId = process.env.OFFICER_ROLE_ID;
        const hasRole = officerRoleId ? interaction.member.roles.cache.has(officerRoleId) : false;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkiniz yok!', ephemeral: true });
        }

        db.all(
            `SELECT character_name, user_id, COUNT(*) as count FROM payments WHERE status = 'onaylandi' GROUP BY user_id, character_name`,
            [],
            async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'Veritabanı sorgusunda bir hata oluştu.', ephemeral: true });
                }

                if (!rows || rows.length === 0) {
                    return interaction.reply({ content: 'Sistemde henüz onaylanmış bir ödeme kaydı bulunmuyor.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Onaylı Ödeme Yapanlar Listesi`)
                    .setColor(Colors.Green);

                let description = '';
                rows.forEach((row, index) => {
                    description += `**${index + 1}.** <@${row.user_id}> - **Karakter:** ${row.character_name} (${row.count} kez)\n`;
                });

                if (description.length > 4000) {
                    description = description.substring(0, 4000) + '\n... (Liste çok uzun olduğu için kısaltıldı)';
                }

                embed.setDescription(description);

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        );
    },
};
