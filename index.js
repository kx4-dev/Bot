// index.js
const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const prefix = "!";
const LOG_CHANNEL_ID = "1436801511542882394";

// Status do bot
client.once("ready", () => {
  console.log(`✅ Bot ${client.user.tag} está online!`);
  client.user.setPresence({
    activities: [{ name: "Seven Menu", type: 0 }],
    status: "online",
  });
});

// Comando !painel
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "painel") {
    const embed = new EmbedBuilder()
      .setTitle("🎯 Verificação de Conta Roblox")
      .setDescription(
        "Clique no botão abaixo e siga as instruções para se verificar.\n\n" +
          "Após verificação, você receberá o cargo de **Verificado** e seu nome será alterado automaticamente."
      )
      .setColor("Blue")
      .setFooter({ text: "Seven Menu | Sistema de Verificação" })
      .setTimestamp();

    const row = {
      type: 1,
      components: [
        {
          type: 2,
          label: "Verificar Conta",
          style: 1,
          custom_id: "verificar_btn",
        },
      ],
    };

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// Botão de verificação
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "verificar_btn") {
    await interaction.reply({ content: "✍️ Me envie seu **Nick do Roblox** aqui no privado.", ephemeral: true });

    const dm = await interaction.user.createDM();
    const filter = (m) => m.author.id === interaction.user.id;

    try {
      const collected = await dm.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const username = collected.first().content;

      const res = await axios.get(`https://api.roblox.com/users/get-by-username?username=${username}`);
      if (!res.data.Id) {
        return dm.send("❌ Usuário não encontrado. Tente novamente com outro nome.");
      }

      const userId = res.data.Id;
      const thumb = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=180x180&format=Png&isCircular=false`);
      const imageUrl = thumb.data.data[0].imageUrl;

      const infoEmbed = new EmbedBuilder()
        .setTitle("🔍 Confirmação da Conta Roblox")
        .setColor("Yellow")
        .setThumbnail(imageUrl)
        .addFields(
          { name: "Nick do jogador", value: `${res.data.Username}`, inline: true },
          { name: "ID da conta", value: `${userId}`, inline: true }
        )
        .setFooter({ text: "Confirme se essa conta é sua." });

      const buttons = {
        type: 1,
        components: [
          {
            type: 2,
            label: "Sou eu ✅",
            style: 3,
            custom_id: `confirm_${userId}`,
          },
          {
            type: 2,
            label: "Não sou eu ❌",
            style: 4,
            custom_id: `deny_${userId}`,
          },
        ],
      };

      dm.send({ embeds: [infoEmbed], components: [buttons] });
    } catch (e) {
      dm.send("⏰ Tempo expirado. Tente novamente.");
    }
  }

  // Confirmação
  if (interaction.customId.startsWith("confirm_")) {
    const user = interaction.user;
    const guild = client.guilds.cache.first();
    const member = guild.members.cache.get(user.id);

    if (member) {
      const role = guild.roles.cache.find((r) => r.name.toLowerCase() === "verificado");
      if (role) await member.roles.add(role).catch(() => {});
      await member.setNickname(`${user.username} | ${interaction.customId.split("_")[1]}`).catch(() => {});
    }

    await interaction.reply({ content: "✅ Conta verificada com sucesso!", ephemeral: true });

    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("🧾 Nova Verificação")
        .addFields(
          { name: "Usuário", value: `<@${user.id}>`, inline: true },
          { name: "ID Roblox", value: interaction.customId.split("_")[1], inline: true }
        )
        .setColor("Green")
        .setTimestamp();
      logChannel.send({ embeds: [logEmbed] });
    }
  }

  // Caso não seja ele
  if (interaction.customId.startsWith("deny_")) {
    const user = interaction.user;
    const dm = await user.createDM();
    dm.send("🔁 Envie novamente seu Nick ou link do perfil do Roblox:");
  }
});

// Login do bot
client.login(process.env.TOKEN);
