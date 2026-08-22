const { SlashCommandBuilder, EmbedBuilder, Colors, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('istatistik')
        .setDescription('Bu ayın ödeme istatistiklerini gösterir (Sadece Yetkililer).'),
    async execute(interaction) {
        // Yetki kontrolü
        const officerRoleId = process.env.OFFICER_ROLE_ID;
        const hasRole = officerRoleId ? interaction.member.roles.cache.has(officerRoleId) : false;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkiniz yok!', ephemeral: true });
        }

        // Sadece bulunduğumuz ay onaylanan ödemeleri sorgula
        db.all(
            `SELECT payment_type, COUNT(*) as count 
             FROM payments 
             WHERE status = 'onaylandi' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') 
             GROUP BY payment_type`,
            [],
            async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'Veritabanı sorgusunda bir hata oluştu.', ephemeral: true });
                }

                let silverCount = 0;
                let itemCount = 0;

                rows.forEach(row => {
                    if (row.payment_type.toLowerCase() === 'silver') {
                        silverCount = row.count;
                    } else if (row.payment_type.toLowerCase() === 'i̇tem' || row.payment_type.toLowerCase() === 'item') {
                        itemCount = row.count;
                    }
                });

                const totalSilver = silverCount * 2; // Her biri 2m
                const totalItem = itemCount * 2; // Her biri 2m değerinde
                const totalIncome = totalSilver + totalItem;

                const embed = new EmbedBuilder()
                    .setTitle('📊 Bu Ayın Ödeme İstatistikleri')
                    .setColor(Colors.Green)
                    .setDescription('Aşağıdaki veriler bu ay içerisinde **onaylanan** ödemeleri kapsamaktadır.')
                    .addFields(
                        { name: '🪙 Silver Ödemeleri', value: `${silverCount} kişi (${totalSilver}m)`, inline: true },
                        { name: '⚔️ İtem Ödemeleri', value: `${itemCount} kişi (${totalItem}m değerinde)`, inline: true },
                        { name: '💰 Toplam Gelir', value: `**${totalIncome}m** (Gümüş ve İtem Toplamı)`, inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        );
    },
};
