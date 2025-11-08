const { Client, GatewayIntentBits, EmbedBuilder, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const fs = require("fs");

// ✅ Usa o fetch nativo do Node.js (não precisa instalar nada)
const fetch = global.fetch;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ⚙️ Configurações
const config = {
    prefix: "!",
    token: process.env.TOKEN, // define no Render
    logChannelId: "1436801511542882394",
    verifiedRoleName: "Verificado",
    status: {
        text: "Seven Menu",
        buttonText: "Abrir Seven Menu",
        buttonLink: "https://discord.gg/DGjCfAns2S"
    }
};

// 🟢 Quando o bot ligar
client.once("ready", () => {
    console.log(`✅ Logado como ${client.user.tag}`);

    client.user.setPresence({
        activities: [
            {
                name: config.status.text,
                type: 0
            }
        ],
        status: "online"
    });
});

// 🟣 Painel de verificação
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !painel
    if (command === "painel") {
        const embed = new EmbedBuilder()
            .setTitle("🎯 Verificação de Conta Roblox")
            .setDescription("Clique no botão abaixo e siga as instruções para se verificar.\n\nApós verificação, você receberá o cargo **Verificado** e seu nome será alterado automaticamente.")
            .setColor("Blurple")
            .setFooter({ text: "Seven Menu | Sistema de Verificação" })
            .setTimestamp();

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verificar")
                .setLabel("Verificar Conta")
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [button] });
    }
});

// 🧩 Interação de botão
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "verificar") {
        await interaction.reply({ content: "📨 Verificação iniciada! Confira seu privado.", ephemeral: true });

        try {
            const dm = await interaction.user.createDM();

            const askMsg = await dm.send("✏️ Qual é o seu **nick ou ID do Roblox**?");
            const filter = (m) => m.author.id === interaction.user.id;
            const collected = await dm.awaitMessages({ filter, max: 1, time: 30000 });

            if (!collected.size) {
                return dm.send("⏰ Tempo expirado. Tente novamente com `!painel`.");
            }

            const robloxNick = collected.first().content.trim();
            const response = await fetch(`https://users.roblox.com/v1/users/${encodeURIComponent(robloxNick)}`)
                .then(r => r.json())
                .catch(() => null);

            if (!response || response.errors) {
                return dm.send("❌ Não foi possível encontrar esse usuário no Roblox. Tente novamente.");
            }

            const { name, displayName, description, id, created } = response;

            const thumbData = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png`)
                .then(r => r.json())
                .catch(() => null);

            const thumb = thumbData && thumbData.data && thumbData.data[0] ? thumbData.data[0].imageUrl : null;

            const embed = new EmbedBuilder()
                .setTitle("📋 Informações da Conta Roblox")
                .addFields(
                    { name: "👤 Nick de Criação", value: name || "Desconhecido", inline: true },
                    { name: "🧾 Nick de Exibição", value: displayName || "Desconhecido", inline: true },
                    { name: "🆔 ID da Conta", value: `${id}`, inline: true },
                    { name: "📅 Conta criada em", value: new Date(created).toLocaleDateString("pt-BR"), inline: true },
                    { name: "🗒️ Descrição", value: description || "Sem descrição." }
                )
                .setThumbnail(thumb)
                .setColor("Blue");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("sou_eu").setLabel("Sou eu ✅").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("nao_sou_eu").setLabel("Não sou eu ❌").setStyle(ButtonStyle.Danger)
            );

            await dm.send({ embeds: [embed], components: [row] });

            const buttonCollector = dm.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000
            });

            buttonCollector.on("collect", async (btn) => {
                if (btn.customId === "sou_eu") {
                    const guild = await client.guilds.fetch(interaction.guildId);
                    const member = await guild.members.fetch(interaction.user.id);
                    const role = guild.roles.cache.find((r) => r.name === config.verifiedRoleName);

                    if (role) await member.roles.add(role).catch(() => { });
                    await member.setNickname(`${member.user.username} | ${displayName}`).catch(() => { });

                    dm.send("✅ Verificação concluída com sucesso!");
                    buttonCollector.stop();

                    const logChannel = guild.channels.cache.get(config.logChannelId);
                    if (logChannel) {
                        logChannel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("📢 Novo Usuário Verificado")
                                    .setDescription(`**Usuário:** ${interaction.user}\n**Roblox:** ${displayName}\n**ID:** ${id}`)
                                    .setThumbnail(thumb)
                                    .setColor("Green")
                                    .setTimestamp()
                            ]
                        });
                    }
                }

                if (btn.customId === "nao_sou_eu") {
                    await dm.send("🔁 Envie novamente o **link do perfil ou o nick correto**:");
                }
            });
        } catch (err) {
            console.error(err);
            await interaction.user.send("⚠️ Não consegui abrir seu privado. Ative as mensagens diretas do servidor!");
        }
    }
});

// 🔑 Login
client.login(config.token);
