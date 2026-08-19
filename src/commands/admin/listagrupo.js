import { PREFIX } from "../../config.js";
import { getActiveGroups } from "../../utils/database.js";

export default {
  name: "listagrupo",
  description: "Lista os grupos ativos e apresenta o respetivo link quando disponível.",
  commands: ["listagrupo", "grupos", "meus-grupos", "grupos-ativos", "grupos-on"],
  usage: `${PREFIX}listagrupo`,

  handle: async ({ socket, sendReply }) => {
    const groups = getActiveGroups();

    if (!groups.length) {
      await sendReply(`╭━━━〔 🌐 GRUPOS ATIVOS 〕━━━╮
┃
┃ ℹ️ Neste momento, não existe nenhum grupo ativo.
┃
┃ Para ativar o bot, entre num grupo e envie:
┃ 🟢 ${PREFIX}on
┃
╰━━━━━━━━━━━━━━━━━━━━╯`);
      return;
    }

    const blocks = [];

    for (const [index, groupId] of groups.entries()) {
      let name = groupId.replace("@g.us", "");
      let link = "";

      try {
        const metadata = await socket.groupMetadata(groupId);
        name = metadata.subject || name;
      } catch {
        // Mantém o identificador quando os dados do grupo não estão disponíveis.
      }

      try {
        const code = await socket.groupInviteCode(groupId);
        if (code) link = `https://chat.whatsapp.com/${code}`;
      } catch {
        // O grupo pode não permitir a criação ou leitura de links.
      }

      const groupNumber = index + 1;
      const groupBlock = link
        ? `┃ 🟢 *${groupNumber}. ${name}*\n┃ 🔗 ${link}`
        : `┃ 🟢 *${groupNumber}. ${name}*\n┃ 🔒 Link indisponível neste momento.`;

      blocks.push(`╭───〔 GRUPO ${groupNumber} 〕───╮\n${groupBlock}\n╰────────────────────╯`);
    }

    await sendReply(`╭━━━〔 🌐 GRUPOS COM O BOT ATIVO 〕━━━╮
┃
┃ Total encontrado: *${groups.length}*
┃ Os grupos aparecem separados abaixo.
┃
╰━━━━━━━━━━━━━━━━━━━━╯

${blocks.join("\n\n")}

💚 Gestão do bot: *Renen*`);
  },
};
