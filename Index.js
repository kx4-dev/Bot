const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, Collection } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Logado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "Seven Menu", type: 1, url: "https://discord.gg/DGjCfAns2S" }],
    status: "online"
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, client);
  }

  // Botão do painel
  if (interaction.isButton()) {
    if (interaction.customId === "iniciar_verificacao") {
      await interaction.reply({ content: "💬 Enviado no seu privado!", ephemeral: true });

      const user = interaction.user;
      await user.send("👋 Olá! Envie seu **nick do Roblox** para começarmos sua verificação.");

      const collector = user.dmChannel.createMessageCollector({ time: 60000, max: 1 });
      collector.on("collect", async (msg) => {
        const nick = msg.content.trim();
        await user.send("🔍 Buscando informações da conta...");

        try {
          // Obtém dados básicos
          const info = await axios.get(`https://api.roblox.com/users/get-by-username?username=${nick}`);
          if (!info.data || !info.data.Id) return user.send("❌ Não encontrei nenhuma conta com esse nome.");

          const id = info.data.Id;
          const detalhes = await axios.get(`https://users.roblox.com/v1/users/${id}`);
          const thumb = `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=420&height=420&format=png`;

          const criado = new Date(detalhes.data.created);
          const idadeConta = Math.floor((Date.now() - criado) / (1000 * 60 * 60 * 24));

          const embed = new EmbedBuilder()
            .setTitle("🔎 Verificação Roblox")
            .setThumbnail(thumb)
            .addFields(
              { name: "👤 Nick do jogador", value: detalhes.data.name, inline: true },
              { name: "📅 Idade da conta", value: `${idadeConta} dias`, inline: true },
              { name: "📝 Descrição", value: detalhes.data.description || "Sem descrição", inline: false },
              { name: "💬 Nick de exibição", value: detalhes.data.displayName, inline: true },
              { name: "🆔 ID da conta", value: id.toString(), inline: true }
            )
            .setColor("Blue");

          const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("sou_eu").setLabel("Sou eu ✅").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("nao_sou_eu").setLabel("Não sou eu ❌").setStyle(ButtonStyle.Danger)
          );

          const msgEmbed = await user.send({ embeds: [embed], components: [botoes] });

          const confirmCollector = msgEmbed.createMessageComponentCollector({ time: 60000 });

          confirmCollector.on("collect", async (btn) => {
            if (btn.customId === "sou_eu") {
              const guild = client.guilds.cache.get(process.env.GUILD_ID);
              const member = await guild.members.fetch(user.id).catch(() => null);
              if (member) {
                await member.roles.add(process.env.VERIFICADO_ROLE_ID).catch(() => {});
                await member.setNickname(`${member.user.username} | ${detalhes.data.displayName}`).catch(() => {});
              }

              await btn.reply({ content: "✅ Você foi verificado com sucesso!", ephemeral: true });

              const log = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
              const embedLog = new EmbedBuilder()
                .setTitle("📢 Nova Verificação Concluída")
                .setDescription(`**Usuário:** ${user.tag}\n**Roblox:** ${detalhes.data.displayName}\n**ID:** ${id}`)
                .setColor("Green")
                .setTimestamp();

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel("Abrir Seven Menu").setStyle(ButtonStyle.Link).setURL("https://discord.gg/DGjCfAns2S")
              );

              if (log) log.send({ embeds: [embedLog], components: [row] });
            }

            if (btn.customId === "nao_sou_eu") {
              await btn.reply({ content: "🔁 Envie novamente seu nick ou link do perfil Roblox:", ephemeral: true });
            }
          });
        } catch (err) {
          console.error(err);
          user.send("❌ Ocorreu um erro ao buscar os dados da conta.");
        }
      });
    }
  }
});

client.login(process.env.TOKEN);
