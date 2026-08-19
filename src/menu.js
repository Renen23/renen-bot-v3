import path from "node:path";
import pkg from "../package.json" with { type: "json" };
import { ASSETS_DIR, BOT_EMOJI, BOT_NAME } from "./config.js";
import { getPrefix } from "./utils/database.js";
import { readMore } from "./utils/index.js";

let dogIndex = 0;

const dogImages = [1, 2, 3, 4].map((number) =>
  path.join(ASSETS_DIR, "images", "cachorros", `cachorro-0${number}.png`),
);

export function getNextDog() {
  const image = dogImages[dogIndex];
  dogIndex = (dogIndex + 1) % dogImages.length;
  return image;
}

export function menuMessage(groupJid) {
  const prefix = getPrefix(groupJid);
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR");

  return `${readMore()}*${BOT_NAME} — menu de comandos*

Versão: ${pkg.version}
Data: ${date} às ${time}
Prefixo deste grupo: ${prefix}

*Dono do bot*
${prefix}adm — gere quem pode usar o bot
${prefix}setprefix <símbolo> — altere o prefixo do grupo

*Administração do grupo*
${prefix}on / ${prefix}off — ative ou desative o bot
${prefix}abrir / ${prefix}fechar — abra ou feche o grupo
${prefix}ban @membro — remova um membro
${prefix}promover / ${prefix}rebaixar @membro — altere a função
${prefix}mute / ${prefix}unmute @membro — controle o silêncio
${prefix}adv @membro 30m — silêncio temporário
${prefix}warn @membro — aplique uma advertência
${prefix}unwarn — consulte ou remova advertências
${prefix}warnreactivate — reative uma advertência
${prefix}delete — apague uma mensagem respondida
${prefix}limparchat — limpe o histórico do grupo
${prefix}setname <nome> — altere o nome do grupo
${prefix}linkgrupo — mostre o link do grupo
${prefix}blockwpp <telefone> — bloqueie um número

*Proteções e mensagens automáticas*
${prefix}antilink 1/0 — bloqueie links no grupo
${prefix}antifake 1/0 — controle números estrangeiros
${prefix}confiavel — gerencie exceções do anti-link
${prefix}welcome 1/0 — ative as boas-vindas
${prefix}setwelcome <mensagem> — personalize as boas-vindas
${prefix}exit 1/0 — ative a mensagem de saída
${prefix}setexit <mensagem> — personalize a mensagem de saída

*Comandos gerais*
${prefix}menu — abra este menu
${prefix}help [comando] — veja instruções detalhadas
${prefix}ping — verifique a resposta do bot
${prefix}meulid — veja o seu LID
${prefix}todo <mensagem> — avise todos sem listar números
${prefix}listagrupo — liste os grupos ativos
${prefix}painel — receba o painel no privado

Use ${prefix}help <comando> para consultar um comando específico.
As ações administrativas exigem permissão no grupo.

${BOT_EMOJI} ${BOT_NAME}`;
}
