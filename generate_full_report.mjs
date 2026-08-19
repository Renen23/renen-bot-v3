import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("/tmp/renen_command_audit_full.json", "utf8"));
const fullAudit = JSON.parse(fs.readFileSync("/tmp/renen_full_audit_refined.json", "utf8"));
const runtime = JSON.parse(fs.readFileSync("/tmp/renen_runtime_audit.json", "utf8"));
const commandRows = [...catalog.commands].sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));
const categoryCounts = commandRows.reduce((counts, command) => {
  counts[command.category] = (counts[command.category] || 0) + 1;
  return counts;
}, {});
const esc = (value) => String(value ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");

const severityCounts = fullAudit.findings.reduce((acc, finding) => {
  acc[finding.severity] = (acc[finding.severity] || 0) + 1;
  return acc;
}, {});

const commandTable = commandRows.map((command, index) => {
  const checks = [
    command.checks.group ? "grupo" : "dispatcher",
    command.checks.adminOrOwner ? "própria" : "dispatcher",
    command.checks.parameterErrors ? "sim" : "não visível",
    command.effects.length ? command.effects.join(", ") : "nenhum",
  ];
  return `| ${index + 1} | ${esc(command.category)} | /${esc(command.name)} | ${esc(command.aliases.join(", "))} | ${esc(command.description)} | ${checks.map(esc).join(" | ")} |`;
}).join("\n");

const content = `# Auditoria completa do Renen Bot

**Data da auditoria:** ${new Date().toISOString().slice(0, 10)}  
**Escopo:** todo o projeto versionado e os ficheiros JavaScript em \`src/\`.  
**Resultado:** o projeto tem uma base funcional, mas ainda apresenta riscos relevantes de autorização, persistência, observabilidade, documentação e testes de integração.

## 1. Sumário executivo

A auditoria cobriu **${catalog.total} comandos**, **58 ficheiros JavaScript em \`src/\`**, dependências, arranque, conexão Baileys, middlewares, eventos, aliases, permissões, persistência JSON, mensagens, documentação e execução de testes. Todos os módulos auditados importaram sem falha no teste isolado, e a sintaxe JavaScript passou; isso, porém, não substitui uma execução autenticada num grupo real.

O achado mais importante é de **modelo de autorização**: o dispatcher aplica \`checkPermission\` a todos os tipos de comando, enquanto a função devolve \`isBotAdmin\` para qualquer tipo que não seja \`owner\`. Na prática, comandos classificados como gerais, como \`/menu\`, \`/help\`, \`/ping\` e \`/meulid\`, podem ficar limitados aos administradores autorizados do bot. Isso contradiz a própria separação entre \`member\`, \`admin\` e \`owner\`.

Também foi confirmada uma fragilidade importante na persistência: cada operação lê e regrava ficheiros JSON completos, sem escrita atómica, sem lock e sem recuperação de JSON corrompido. Em eventos concorrentes, uma gravação pode substituir outra; se o processo for interrompido durante a escrita, o bot pode deixar de conseguir iniciar ou ler o estado de grupos.

## 2. Inventário completo

| Item | Resultado |
|---|---:|
| Ficheiros JavaScript em \`src\` | 58 |
| Linhas de JavaScript | 4.925 |
| Comandos de administração | ${categoryCounts.admin || 0} |
| Comandos gerais | ${categoryCounts.member || 0} |
| Comandos do dono | ${categoryCounts.owner || 0} |
| Total de comandos | ${catalog.total} |
| Dependências de produção | 72 no grafo instalado |
| Vulnerabilidades npm reportadas | 0 |
| Módulos importados no teste isolado | ${runtime.total} |
| Falhas de importação | ${runtime.failures.length} |

Há uma inconsistência documental: os ficheiros \`AUDITORIA_COMANDOS.md\`, \`command-list.txt\` e parte da auditoria anterior indicam **32 comandos**, mas a árvore real contém **${catalog.total}**, porque os módulos \`/antifake\` e \`/todos\` também fazem parte do catálogo real.

## 3. Classificação dos achados

| Severidade | Quantidade | Interpretação |
|---|---:|---|
| Crítica | 0 | Nenhuma falha crítica confirmada pelo scanner estático refinado. |
| Alta | 0 | Não foram encontrados aliases normalizados que pertençam a ficheiros diferentes. |
| Média | ${severityCounts.medium || 0} | Riscos de resiliência, persistência e observabilidade que podem causar falhas ou perda de diagnóstico. |
| Baixa | ${severityCounts.low || 0} | Qualidade, logging e manutenção. |
| Informativa | ${severityCounts.info || 0} | Aliases equivalentes mantidos por compatibilidade. |

A ausência de achados críticos no scanner **não significa que o bot esteja pronto para produção**. O risco de autorização descrito abaixo resulta da leitura semântica do dispatcher e deve ser tratado como prioridade funcional, mesmo não tendo sido classificado automaticamente pelo scanner.

## 4. Achados detalhados

### F-01 — Autorização de comandos gerais excessivamente restritiva

**Severidade recomendada: alta.** Em \`src/utils/dynamicCommand.js\`, o fluxo de grupo ativo chama \`checkPermission\` para qualquer comando. Em \`src/middlewares/index.js\`, depois de excluir dono e comandos do tipo \`owner\`, a função devolve \`isBotAdmin(remoteJid, userLid)\`. Assim, o tipo \`member\` não funciona como “membro”; funciona como “administrador autorizado”.

**Impacto:** membros comuns podem não conseguir usar \`/menu\`, \`/help\`, \`/ping\` e \`/meulid\`; a descrição de permissões fica enganadora e a experiência do bot parece quebrada.

**Recomendação:** aplicar a verificação de permissão por categoria. \`owner\` deve exigir dono, \`admin\` deve exigir administrador do grupo ou administrador autorizado conforme a regra pretendida, e \`member\` deve poder responder sem autorização administrativa, mantendo apenas as restrições de grupo/PV necessárias.

### F-02 — Persistência JSON sem escrita atómica nem recuperação

**Severidade recomendada: média-alta.** \`src/utils/database.js\` usa \`readFileSync\`, \`JSON.parse\` e \`writeFileSync\` para várias bases independentes. Não existe lock, ficheiro temporário, rename atómico, validação de schema ou cópia de segurança antes da substituição.

**Impacto:** atualizações simultâneas de advertências, silenciamentos, prefixos ou mensagens podem perder dados. Um encerramento durante a escrita pode gerar JSON inválido e bloquear o bot.

**Recomendação:** centralizar a persistência num repositório com escrita temporária seguida de \`rename\`, validação mínima por ficheiro, backup rotativo e tratamento explícito de JSON corrompido. Para vários grupos e utilização contínua, migrar para SQLite ou outro armazenamento transacional.

### F-03 — Eventos de participantes fazem consultas repetidas e silenciam erros

**Severidade recomendada: média.** O middleware de entrada/saída consulta \`groupMetadata\` para cada participante e possui blocos \`catch\` vazios. O mesmo padrão aparece em consultas auxiliares de \`listagrupo\`.

**Impacto:** falhas de rede, limitações da API ou IDs LID incompatíveis podem fazer com que a menção, a mensagem de boas-vindas ou a remoção antifake falhe sem explicação operacional.

**Recomendação:** registar erros com grupo, ação e tipo de participante, sem expor dados desnecessários; usar cache de metadados com expiração; e separar “não foi possível verificar” de “participante confirmado como estrangeiro”.

### F-04 — Logging de produção disperso

**Severidade recomendada: baixa-média.** Existem chamadas diretas a \`console.log\`, \`console.warn\` e logging detalhado de mensagens recebidas quando o modo de desenvolvimento está ativo. O logger central existe, mas não é usado de forma uniforme.

**Impacto:** logs difíceis de filtrar, possível exposição de conteúdo de mensagens em ambientes inadequados e diagnóstico inconsistente.

**Recomendação:** substituir logs de produção pelo logger central, adicionar níveis e remover ou mascarar números, LIDs, conteúdo de mensagens e stack traces quando não forem necessários.

### F-05 — Encerramento direto do processo e listeners globais

**Severidade recomendada: média.** \`src/index.js\` usa \`process.exit\` em vários caminhos e o projeto instala handlers globais em mais de uma camada. O valor \`process.setMaxListeners(1500)\` reduz o sinal de alerta de possíveis listeners acumulados.

**Impacto:** falhas podem encerrar o processo sem uma estratégia uniforme de backoff; listeners podem ser registados novamente em reconexões sem serem removidos.

**Recomendação:** centralizar o ciclo de vida, limitar tentativas com backoff, distinguir erros recuperáveis de fatais e registar explicitamente a instalação de cada listener.

### F-06 — Documentação e artefactos de auditoria desatualizados

**Severidade recomendada: média.** A documentação integral lista 32 comandos, a árvore contém ${catalog.total} e os aliases antigos aparecem em listas diferentes dos nomes principais atuais.

**Impacto:** o utilizador pode acreditar que um comando não existe, consultar usage antigo ou avaliar a auditoria com números incorretos.

**Recomendação:** gerar \`README.md\`, \`command-list.txt\` e \`AUDITORIA_COMANDOS.md\` a partir do mesmo catálogo automático, incluindo categoria, permissão, usage, aliases e data de geração.

### F-07 — Testes automatizados insuficientes

**Severidade recomendada: média.** O \`package.json\` contém apenas \`start\`; não há script de testes, lint, cobertura ou testes de unidade. A validação atual cobre sintaxe, imports e auditoria estática, mas não executa handlers com sockets simulados.

**Impacto:** bugs de runtime em comandos administrativos, identificação LID, permissões, mensagens citadas e eventos reais podem passar sem deteção.

**Recomendação:** criar testes unitários para parser, permissões, aliases, persistência e mensagens; testes com socket falso para cada comando; e um teste de integração controlado para entrada/saída, anti-link, mute e advertências.

## 5. Auditoria dos comandos

A tabela seguinte cobre individualmente **todos os ${catalog.total} comandos**. A coluna “proteção” indica onde a proteção é feita: no próprio comando ou no dispatcher comum. “Validação” refere-se à existência visível de erros de parâmetros no handler; comandos sem parâmetros podem corretamente não precisar dela.

| Nº | Categoria | Principal | Aliases | Descrição | Grupo | Proteção | Validação | Efeito |
|---:|---|---|---|---|---|---|---|---|
${commandTable}

### Conclusão da matriz de comandos

Todos os módulos de comando importaram e possuem nome, aliases, descrição e usage. Os comandos administrativos dependem fortemente do dispatcher para a proteção; isso reduz repetição, mas torna o dispatcher um ponto único de risco. Os comandos \`abrir\`, \`fechar\`, \`promover\`, \`rebaixar\` e \`delete\` devem ser testados com mensagens e permissões reais, porque a matriz estática não consegue simular as respostas do WhatsApp.

Os aliases com e sem hífen equivalem ao mesmo comando depois da normalização. Isso não é conflito entre comandos, mas aumenta a superfície de manutenção. Recomenda-se manter um alias principal simples e marcar os restantes como compatibilidade legada.

## 6. Auditoria de segurança e dados

O ficheiro \`.gitignore\` exclui \`.env\`, \`database/\`, \`assets/auth/\` e \`assets/temp/\`, o que é adequado para evitar publicar sessão e estado local. Mesmo assim, \`BOT_LID\` e \`OWNER_LID\` ficam hardcoded em \`src/config.js\`; não são credenciais secretas, mas dificultam distribuição segura e configuração por ambiente.

O comando anti-link tenta proteger dono, administradores e utilizadores confiáveis. Quando a consulta de administração falha, o código segue para a punição. Essa decisão é segura contra links não autorizados, mas pode remover ou advertir membros legítimos durante uma falha de metadados. A política deve ser explícita: “falha ao verificar” pode significar não punir, ou punir com log e revisão.

O utilitário de limpeza usa um payload de imagem WhatsApp hardcoded, com URL externa, hashes, dimensões artificiais e valores antigos. Mesmo que seja uma técnica pretendida para limpar o chat, é frágil, depende de um artefacto externo e deve ser substituído por uma abordagem suportada ou claramente isolada atrás de uma opção experimental.

## 7. Auditoria de dependências e execução

O \`npm audit --omit=dev\` terminou sem vulnerabilidades reportadas no estado analisado. Isso é positivo, mas não valida o comportamento da biblioteca Baileys nem a compatibilidade de eventos com a versão RC usada. O projeto deve fixar e rever periodicamente a versão, principalmente por usar \`baileys\` em release candidate.

O teste de sintaxe foi executado sobre todos os ficheiros JavaScript. O teste de importação isolou ${runtime.total} módulos e obteve ${runtime.failures.length} falhas. O arranque interativo do bot chega ao pedido do número de pareamento; não foi possível concluir autenticação sem uma conta WhatsApp do proprietário.

## 8. Plano de correção prioritário

| Prioridade | Ação | Resultado esperado |
|---:|---|---|
| 1 | Corrigir a regra de permissão para separar \`member\`, \`admin\` e \`owner\`. | Comandos gerais funcionam para o público certo sem abrir ações administrativas. |
| 2 | Substituir a persistência JSON por escrita atómica com recuperação. | Menor risco de perda ou corrupção de estado. |
| 3 | Adicionar testes de unidade e socket falso para os ${catalog.total} comandos. | Deteção de regressões antes de usar em grupos reais. |
| 4 | Regerar toda a documentação a partir do catálogo. | Quantidades, aliases e usage sempre coerentes. |
| 5 | Uniformizar logs e remover conteúdo sensível de logs de desenvolvimento. | Diagnóstico mais seguro e útil. |
| 6 | Rever o payload experimental de \`/limparchat\`. | Menos dependência de artefactos externos e menor risco operacional. |

## 9. Ficheiros de apoio

Foram incluídos no projeto os auditores \`full_audit.mjs\`, \`command_audit_full.mjs\` e \`runtime_audit.mjs\`. Eles permitem repetir a auditoria localmente, atualizar os números e identificar alterações futuras. O relatório deve ser regenerado sempre que forem adicionados, removidos ou alterados comandos.

> **Limitação importante:** a auditoria estática não substitui um teste num grupo de WhatsApp real. Permissões de administrador, LIDs, eliminação de mensagens, eventos de entrada/saída e pareamento só podem ser confirmados com uma sessão de teste controlada.

## Referências

[1]: https://github.com/Renen23/Renen-bot "Repositório público analisado"
[2]: https://github.com/WhiskeySockets/Baileys "Documentação e projeto Baileys"
[3]: https://docs.npmjs.com/cli/v10/commands/npm-audit "Documentação do npm audit"
`;

fs.writeFileSync("AUDITORIA_COMPLETA.md", content, "utf8");
console.log("AUDITORIA_COMPLETA.md gerada");
