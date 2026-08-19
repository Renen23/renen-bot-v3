import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import {
  getBotAdmins,
  getPrefix,
  getTrustedUsers,
  isActiveAntifakeGroup,
  isActiveAntiLinkGroup,
  isActiveExitGroup,
  isActiveOnlyAdmins,
  isActiveWelcomeGroup,
} from "../../utils/database.js";
import { onlyNumbers, toUserJid } from "../../utils/index.js";
import { errorLog } from "../../utils/logger.js";

async function sendPrivateMessage(socket, lid, text) {
  try {
    await socket.sendMessage(lid, { text });
  } catch {
    await socket.sendMessage(toUserJid(lid), { text });
  }
}

function status(value) {
  return value ? "✅ Ativo" : "❌ Desativado";
}

function buildPanel(metadata, groupJid) {
  const subject = metadata?.subject || "Grupo";
  const membersCount = metadata?.participants?.length || 0;
  const prefix = getPrefix(groupJid);

  const trusted = getTrustedUsers(groupJid);
  const trustedCount = trusted.length;
  const botAdmins = getBotAdmins(groupJid);
  const botAdminsCount = botAdmins.length;

  return `╭━━⪩ PAINEL DO ADM ⪨━━
▢ Grupo: ${subject}
▢ Membros: ${membersCount}
▢ Prefixo: ${prefix}
╰━━─「🔐」─━━

╭━━⪩ STATUS DO GRUPO ⪨━━
▢ Anti-link: ${status(isActiveAntiLinkGroup(groupJid))}
▢ Anti-fake: ${status(isActiveAntifakeGroup(groupJid))}
▢ Só admins: ${status(isActiveOnlyAdmins(groupJid))}
▢ Boas-vindas: ${status(isActiveWelcomeGroup(groupJid))}
▢ Saída: ${status(isActiveExitGroup(groupJid))}
▢ Confiáveis: ${trustedCount} pessoa(s)
▢ Autorizados (/adm): ${botAdminsCount} pessoa(s)
╰━━─「📊」─━━

╭━━⪩ MODERAÇÃO ⪨━━
▢ ${prefix}ban / ${prefix}promover / ${prefix}rebaixar
▢ ${prefix}mute / ${prefix}unmute / ${prefix}adv 30m
▢ ${prefix}warn / ${prefix}unwarn
▢ ${prefix}delete / ${prefix}limparchat
▢ ${prefix}abrir / ${prefix}fechar / ${prefix}linkgrupo
╰━━─「⚙️」─━━

╭━━⪩ RESTRIÇÕES ⪨━━
▢ ${prefix}antilink (1/0)
▢ ${prefix}antifake (1/0)
▢ ${prefix}confiavel
▢ ${prefix}welcome (1/0)
▢ ${prefix}exit (1/0)
▢ ${prefix}setwelcome / ${prefix}setexit
╰━━─「🛡️」─━━

Painel enviado só pra você, admin! 😉`;
}

function isUserAdminOf(metadata, userLid) {
  if (onlyNumbers(metadata?.owner) === onlyNumbers(userLid)) {
    return true;
  }

  return metadata?.participants?.some(
    (participant) =>
      onlyNumbers(participant.id) === onlyNumbers(userLid) &&
      (participant.admin === "admin" || participant.admin === "superadmin"),
  );
}

async function getMyAdminGroups(socket, userLid) {
  const allGroups = await socket.groupFetchAllParticipating();

  return Object.entries(allGroups).filter(([, metadata]) =>
    isUserAdminOf(metadata, userLid),
  );
}

export default {
  name: "painel",
  description:
    "Envia no seu privado o painel com o status e os comandos do grupo.",
  commands: ["painel", "painel-admin", "paineladm", "admin-panel", "adm-panel"],
  usage: `${PREFIX}painel`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    userLid,
    isGroup,
    args,
    sendReply,
    sendErrorReply,
  }) => {
    // Usado dentro do grupo: envia o painel do grupo no privado do admin.
    if (isGroup) {
      const metadata = await socket.groupMetadata(remoteJid);

      try {
        await sendPrivateMessage(
          socket,
          userLid,
          buildPanel(metadata, remoteJid),
        );
        await sendReply("Painel do admin enviado no seu privado! 👀");
      } catch (error) {
        await sendErrorReply(
          "Não consegui te chamar no privado. Abra uma conversa comigo (me manda qualquer coisa) e tente /painel de novo!",
        );
      }

      return;
    }

    // Usado no privado (PV): procura os grupos onde o usuário é admin.
    let groups;

    try {
      groups = await getMyAdminGroups(socket, userLid);
    } catch (error) {
      errorLog(`Erro ao buscar grupos no painel: ${error.message}`);
      await sendErrorReply(
        "Não consegui buscar seus grupos. Tente de novo em instantes.",
      );
      return;
    }

    if (!groups.length) {
      await sendReply(
        "Você não é administrador de nenhum grupo onde eu estou.",
      );
      return;
    }

    if (args[0]) {
      const index = parseInt(args[0], 10) - 1;
      const target = groups[index];

      if (!target) {
        await sendReply(`Escolha um número entre 1 e ${groups.length}.`);
        return;
      }

      await sendPrivateMessage(
        socket,
        userLid,
        buildPanel(target[1], target[0]),
      );
      return;
    }

    if (groups.length === 1) {
      await sendPrivateMessage(
        socket,
        userLid,
        buildPanel(groups[0][1], groups[0][0]),
      );
      return;
    }

    const list = groups
      .map(([, metadata], index) => `${index + 1}. ${metadata?.subject || "Grupo"}`)
      .join("\n");

    await sendReply(
      `Você é admin de ${groups.length} grupos. Envie:\n\n${PREFIX}painel <número>\n\n${list}`,
    );
  },
};
