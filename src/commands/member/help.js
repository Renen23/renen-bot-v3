import { PREFIX } from "../../config.js";
import { formatCommand, readCommandImports } from "../../utils/index.js";

const sectionNames = {
  owner: "Dono do bot",
  admin: "Administração",
  member: "Comandos gerais",
};

function permissionLabel(type) {
  if (type === "owner") return "Apenas o dono do bot.";
  if (type === "admin") return "Dono e administradores autorizados.";
  return "Utilizadores autorizados.";
}

function primaryName(command) {
  return command.commands?.[0] || command.name || "comando";
}

export default {
  name: "help",
  description: "Explica como usar o bot ou um comando específico.",
  commands: ["help", "ajuda", "comandos", "menu-help", "explicar"],
  usage: `${PREFIX}help [comando]`,

  handle: async ({ args, prefix, sendReply }) => {
    const commandImports = await readCommandImports();

    if (!args.length) {
      await sendReply(
        `*Ajuda do ${"Renen Bot"}*\n\n` +
          `Use ${prefix}menu para ver a lista organizada de comandos.\n` +
          `Use ${prefix}help <comando> para consultar a utilização, a função, a permissão e os aliases de um comando.\n\n` +
          `Exemplo: ${prefix}help setwelcome`,
      );
      return;
    }

    const targetName = formatCommand(args[0]);
    for (const [type, commands] of Object.entries(commandImports)) {
      const command = commands.find((item) =>
        (item.commands || []).map(formatCommand).includes(targetName),
      );

      if (!command) continue;

      const commandName = primaryName(command);
      const aliases = (command.commands || [])
        .map((alias) => `${prefix}${alias}`)
        .join(", ");

      await sendReply(
        `*${prefix}${commandName}*\n\n` +
          `${command.description || "Sem descrição disponível."}\n\n` +
          `Como usar: ${command.usage || `${prefix}${commandName}`}\n` +
          `Permissão: ${permissionLabel(type)}\n` +
          `Também funciona como: ${aliases}`,
      );
      return;
    }

    await sendReply(
      `Não encontrei o comando ${prefix}${args[0]}. Use ${prefix}menu para ver os comandos disponíveis.`,
    );
  },
};
