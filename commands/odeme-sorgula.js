const { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ödeme-sorgula')
        .setDescription('Bir üyenin ödeme geçmişini sorgular (Sadece Yetkililer).')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Ödemesi sorgulanacak kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Yetki kontrolü (Sadece yönetici veya belirli bir role sahip olanlar)
        const officerRoleId = process.env.OFFICER_ROLE_ID;
        const hasRole = officerRoleId ? interaction.member.roles.cache.has(officerRoleId) : false;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkiniz yok!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('kullanici');

        db.all(
            `SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
            [targetUser.id],
            async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'Veritabanı sorgusunda bir hata oluştu.', ephemeral: true });
                }

                if (!rows || rows.length === 0) {
                    return interaction.reply({ content: `<@${targetUser.id}> adlı kullanıcının sistemde hiçbir ödeme kaydı bulunamadı.`, ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.username} - Ödeme Geçmişi`)
                    .setColor(Colors.Orange)
                    .setThumbnail(targetUser.displayAvatarURL());

                let description = '';
                rows.forEach((row, index) => {
                    let statusEmoji = '⏳';
                    if (row.status === 'onaylandi') statusEmoji = '✅';
                    if (row.status === 'reddedildi') statusEmoji = '❌';

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
