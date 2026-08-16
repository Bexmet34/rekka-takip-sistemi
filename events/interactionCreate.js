const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, Colors, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

// Lokasyonlar için kısa kodlar (Modal customId'sine sığması için)
const locationMap = {
    'lym': 'Lymhurst Island - Payment Tab',
    'bri': 'Bridgewatch Island - Payment Tab',
    'mar': 'Martlock Island - Payment Tab',
    'the': 'Thetford Island - Payment Tab',
    'for': 'Fort Sterling Island - Payment Tab',
    'thu': 'Thunderrock Hideout - Payment Tab',
    'bank': 'Guild Kasası'
};

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // --- 0. SLASH COMMAND YÖNETİMİ ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Bu komut çalıştırılırken bir hata oluştu!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Bu komut çalıştırılırken bir hata oluştu!', ephemeral: true });
                }
            }
            return;
        }

        // --- 1. BUTON: Ödeme Bildir Butonuna Tıklanması (Türü Seçtiriyoruz) ---
        if (interaction.isButton() && interaction.customId === 'btn_odeme_bildir') {
            const typeSelect = new StringSelectMenuBuilder()
                .setCustomId('select_payment_type')
                .setPlaceholder('Ödeme Türünü Seçin')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Silver (2m)').setValue('Silver').setEmoji('🪙'),
                    new StringSelectMenuOptionBuilder().setLabel('İtem (2m Değerinde)').setValue('İtem').setEmoji('⚔️')
                );

            const row = new ActionRowBuilder().addComponents(typeSelect);

            await interaction.reply({ 
                content: 'Lütfen yapmış olduğunuz ödeme türünü seçin:', 
                components: [row], 
                ephemeral: true 
            });
        }

        // --- 2. SELECT MENU: Ödeme Türü Seçildiğinde (Lokasyonu Seçtiriyoruz veya Direkt Modal) ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_payment_type') {
            const selectedType = interaction.values[0];

            if (selectedType === 'Silver') {
                // Silver ise direkt Modal göster (Lokasyon: bank)
                const modalId = `modal_odeme_Silver_bank`;

                const modal = new ModalBuilder()
                    .setCustomId(modalId)
                    .setTitle('Oyun İçi Bilgileriniz');

                const characterNameInput = new TextInputBuilder()
                    .setCustomId('input_character')
                    .setLabel('Oyun İçi Karakter Adınız')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Albion Online karakter adınızı girin')
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(characterNameInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            } else {
                // İtem ise lokasyon seçtir
                const locationSelect = new StringSelectMenuBuilder()
                    .setCustomId(`select_location_${selectedType}`)
                    .setPlaceholder('Bıraktığınız Şehri/Adayı Seçin')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('Lymhurst Island').setDescription('Lymhurst Island - Payment Tab').setValue('lym'),
                        new StringSelectMenuOptionBuilder().setLabel('Bridgewatch Island').setDescription('Bridgewatch Island - Payment Tab').setValue('bri'),
                        new StringSelectMenuOptionBuilder().setLabel('Martlock Island').setDescription('Martlock Island - Payment Tab').setValue('mar'),
                        new StringSelectMenuOptionBuilder().setLabel('Thetford Island').setDescription('Thetford Island - Payment Tab').setValue('the'),
                        new StringSelectMenuOptionBuilder().setLabel('Fort Sterling Island').setDescription('Fort Sterling Island - Payment Tab').setValue('for'),
                        new StringSelectMenuOptionBuilder().setLabel('Thunderrock Hideout').setDescription('Thunderrock Hideout - Payment Tab').setValue('thu')
                    );

                const row = new ActionRowBuilder().addComponents(locationSelect);

                await interaction.update({
                    content: 'Lütfen ödemeyi bıraktığınız Guild adasını veya Hideout sekmesini seçin:',
                    components: [row]
                });
            }
        }

        // --- 3. SELECT MENU: Lokasyon Seçildiğinde (Karakter Adı Modalını Açıyoruz) ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_location_')) {
            const selectedType = interaction.customId.replace('select_location_', '');
            const selectedLocationCode = interaction.values[0];

            // Modal ID'si içerisine türü ve lokasyon kodunu gömüyoruz
            const modalId = `modal_odeme_${selectedType}_${selectedLocationCode}`;

            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle('Oyun İçi Bilgileriniz');

            const characterNameInput = new TextInputBuilder()
                .setCustomId('input_character')
                .setLabel('Oyun İçi Karakter Adınız')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Albion Online karakter adınızı girin')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(characterNameInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        // --- 4. MODAL: Formun Gönderilmesi ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_odeme_')) {
            // customId format: modal_odeme_Tür_LokasyonKodu
            const parts = interaction.customId.split('_');
            const paymentType = parts[2]; // Silver veya İtem
            const locationCode = parts[3]; // lym, bri vb.
            const location = locationMap[locationCode] || 'Bilinmeyen Konum';

            const characterName = interaction.fields.getTextInputValue('input_character');
            const userId = interaction.user.id;

            // Veritabanına kaydet
            db.run(
                `INSERT INTO payments (user_id, character_name, payment_type, location) VALUES (?, ?, ?, ?)`,
                [userId, characterName, paymentType, location],
                async function(err) {
                    if (err) {
                        console.error('Kayıt hatası:', err);
                        return interaction.reply({ content: 'Veritabanına kaydedilirken bir hata oluştu.', ephemeral: true });
                    }

                    const paymentId = this.lastID;

                    // Kullanıcıya başarılı mesajı gönder (varolan mesajı güncelleyerek select menüleri kaybedelim)
                    await interaction.reply({ 
                        content: `✅ Ödeme bildiriminiz başarıyla alındı!\n\n**Karakter:** ${characterName}\n**Tür:** ${paymentType}\n**Konum:** ${location}\n\nYetkililer onayladıktan sonra size bilgi verilecektir.`, 
                        ephemeral: true 
                    });

                    // Yetkili kanalına mesaj gönder
                    const pendingChannelId = process.env.PENDING_CHANNEL_ID;
                    if (!pendingChannelId) return console.log('Uyarı: PENDING_CHANNEL_ID tanımlanmamış.');

                    const channel = client.channels.cache.get(pendingChannelId);
                    if (!channel) return console.log(`Uyarı: ${pendingChannelId} ID'li kanal bulunamadı.`);

                    const embed = new EmbedBuilder()
                        .setColor(Colors.Yellow)
                        .setTitle('Yeni Ödeme Bildirimi')
                        .addFields(
                            { name: 'Kullanıcı', value: `<@${userId}>`, inline: true },
                            { name: 'Karakter', value: characterName, inline: true },
                            { name: 'Tür', value: paymentType, inline: true },
                            { name: 'Lokasyon', value: location, inline: false },
                            { name: 'Durum', value: '⏳ Bekliyor', inline: true }
                        )
                        .setFooter({ text: `Ödeme ID: ${paymentId}` })
                        .setTimestamp();

                    const btnApprove = new ButtonBuilder()
                        .setCustomId(`btn_onayla_${paymentId}`)
                        .setLabel('Onayla')
                        .setStyle(ButtonStyle.Success);

                    const btnReject = new ButtonBuilder()
                        .setCustomId(`btn_reddet_${paymentId}`)
                        .setLabel('Reddet')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(btnApprove, btnReject);

                    await channel.send({ embeds: [embed], components: [row] });
                }
            );
        }

        // --- 5. BUTON: Yetkili Onay/Red ---
        if (interaction.isButton() && (interaction.customId.startsWith('btn_onayla_') || interaction.customId.startsWith('btn_reddet_'))) {
            const officerRoleId = process.env.OFFICER_ROLE_ID;
            
            const hasRole = officerRoleId ? interaction.member.roles.cache.has(officerRoleId) : false;
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!hasRole && !isAdmin) {
                return interaction.reply({ content: 'Bu işlemi yapmak için yetkiniz yok!', ephemeral: true });
            }

            const action = interaction.customId.split('_')[1];
            const paymentId = interaction.customId.split('_')[2];
            const newStatus = action === 'onayla' ? 'onaylandi' : 'reddedildi';
            const color = action === 'onayla' ? Colors.Green : Colors.Red;
            const statusText = action === 'onayla' ? '✅ Onaylandı' : '❌ Reddedildi';

            db.run(
                `UPDATE payments SET status = ? WHERE id = ?`,
                [newStatus, paymentId],
                async (err) => {
                    if (err) {
                        console.error('Güncelleme hatası:', err);
                        return interaction.reply({ content: 'Durum güncellenirken bir hata oluştu.', ephemeral: true });
                    }

                    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                    
                    const statusFieldIndex = embed.data.fields.findIndex(f => f.name === 'Durum');
                    if (statusFieldIndex !== -1) {
                        embed.data.fields[statusFieldIndex].value = `${statusText} (İşlemi Yapan: <@${interaction.user.id}>)`;
                    } else {
                        embed.addFields({ name: 'Durum', value: `${statusText} (İşlemi Yapan: <@${interaction.user.id}>)` });
                    }
                    
                    embed.setColor(color);

                    await interaction.update({ embeds: [embed], components: [] });
                    
                    const userIdMatch = embed.data.fields[0].value.match(/<@(\d+)>/);
                    if(userIdMatch) {
                        const userId = userIdMatch[1];
                        try {
                            const user = await client.users.fetch(userId);
                            await user.send(`Guild ödemeniz yetkili <@${interaction.user.id}> tarafından **${action === 'onayla' ? 'ONAYLANDI' : 'REDDEDİLDİ'}**.`);
                        } catch (e) {
                            console.log('Kullanıcı DM kapatmış.');
                        }
                    }
                }
            );
        }
    },
};
