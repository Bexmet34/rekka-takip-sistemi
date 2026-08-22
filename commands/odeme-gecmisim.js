const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ödeme-geçmişim')
        .setDescription('Geçmişte yaptığınız ödemeleri ve durumlarını görüntüler.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        db.all(
            `SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
            [userId],
            async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'Veritabanı sorgusunda bir hata oluştu.', ephemeral: true });
                }

                if (!rows || rows.length === 0) {
                    return interaction.reply({ content: 'Sisteme kayıtlı herhangi bir ödeme geçmişiniz bulunmuyor.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Ödeme Geçmişiniz (Son 10 İşlem)')
                    .setColor(Colors.Blue)
                    .setThumbnail(interaction.user.displayAvatarURL());

                let description = '';
                rows.forEach((row, index) => {
                    let statusEmoji = '⏳';
                    if (row.status === 'onaylandi') statusEmoji = '✅';
                    if (row.status === 'reddedildi') statusEmoji = '❌';

                    // created_at verisi 'YYYY-MM-DD HH:MM:SS' formatında gelir, biraz kırpalım
                    const date = row.created_at.split(' ')[0]; 

                    description += `**${index + 1}.** ${statusEmoji} **Tür:** ${row.payment_type} | **Karakter:** ${row.character_name}\n`;
                    description += `└ 📅 ${date} - 📍 ${row.location}\n\n`;
                });

                embed.setDescription(description);

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        );
    },
};
