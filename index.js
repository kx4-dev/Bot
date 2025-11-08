// index.js
const { 
    Client, GatewayIntentBits, Partials, 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, Events 
} = require('discord.js');
const fs = require('fs');
const fetch = require('node-fetch');

// ===== CONFIGURAÇÃO =====
const config = JSON.parse(fs.readFileSync('./botconfig.json', 'utf8'));
const prefix = config.prefix || '!';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// ===== LOGIN =====
client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} está online e pronto!`);
});

// ===== COMANDO PRINCIPAL =====
client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'painel') {
        const embed = new EmbedBuilder()
            .setTitle('🎯 Verificação de Conta Roblox')
            .setDescription('Clique no botão abaixo e siga as instruções para se verificar.\n\nApós a verificação, você receberá o cargo **Verificado** automaticamente.')
            .setColor('Blurple')
            .setFooter({ text: 'Seven Menu | Sistema de Verificação' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_modal')
                .setLabel('Verificar Conta')
                .setStyle(ButtonStyle.Primary)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

// ===== BOTÃO ABRE O MODAL =====
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'abrir_modal') {
        const modal = new ModalBuilder()
            .setCustomId('verificacao_modal')
            .setTitle('Verificação de Conta Roblox');

        const input = new TextInputBuilder()
            .setCustomId('roblox_nome')
            .setLabel('Digite seu Nick ou ID do Roblox:')
            .setPlaceholder('Exemplo: THEKINGDARKSIDER')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }
});

// ===== MODAL ENVIADO =====
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === 'verificacao_modal') {
        const nick = interaction.fields.getTextInputValue('roblox_nome');

        // Verificar na API do Roblox
        try {
            const response = await fetch(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(nick)}`);
            const data = await response.json();

            if (!data.Id) {
                // Nick inválido
                return await interaction.reply({
                    content: `❌ O nome **${nick}** não foi encontrado no Roblox. Verifique e tente novamente.`,
                    ephemeral: true
                });
            }

            // Se o usuário existir, enviar DM e confirmar
            try {
                await interaction.user.send(`✅ Olá **${interaction.user.username}**, sua conta **${nick}** foi verificada com sucesso!\n\n🆔 ID Roblox: **${data.Id}**\n😈 Bem-vindo à Seven Menu!`);
            } catch {
                console.log('⚠️ Não consegui enviar DM (usuário com DMs fechadas).');
            }

            await interaction.reply({
                content: `✅ Conta **${nick}** (ID: ${data.Id}) verificada com sucesso!`,
                ephemeral: true
            });

        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: '⚠️ Ocorreu um erro ao verificar sua conta. Tente novamente em alguns segundos.',
                ephemeral: true
            });
        }
    }
});

client.login(config.token);
