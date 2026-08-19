# Auditoria completa do Renen Bot

**Data da auditoria:** 2026-08-19  
**Escopo:** todo o projeto versionado e os ficheiros JavaScript em `src/`.  
**Resultado:** o projeto tem uma base funcional, mas ainda apresenta riscos relevantes de autorização, persistência, observabilidade, documentação e testes de integração.

## 1. Sumário executivo

A auditoria cobriu **34 comandos**, **58 ficheiros JavaScript em `src/`**, dependências, arranque, conexão Baileys, middlewares, eventos, aliases, permissões, persistência JSON, mensagens, documentação e execução de testes. Todos os módulos auditados importaram sem falha no teste isolado, e a sintaxe JavaScript passou; isso, porém, não substitui uma execução autenticada num grupo real.

O achado mais importante é de **modelo de autorização**: o dispatcher aplica `checkPermission` a todos os tipos de comando, enquanto a função devolve `isBotAdmin` para qualquer tipo que não seja `owner`. Na prática, comandos classificados como gerais, como `/menu`, `/help`, `/ping` e `/meulid`, podem ficar limitados aos administradores autorizados do bot. Isso contradiz a própria separação entre `member`, `admin` e `owner`.

Também foi confirmada uma fragilidade importante na persistência: cada operação lê e regrava ficheiros JSON completos, sem escrita atómica, sem lock e sem recuperação de JSON corrompido. Em eventos concorrentes, uma gravação pode substituir outra; se o processo for interrompido durante a escrita, o bot pode deixar de conseguir iniciar ou ler o estado de grupos.

## 2. Inventário completo

| Item | Resultado |
|---|---:|
| Ficheiros JavaScript em `src` | 58 |
| Linhas de JavaScript | 4.925 |
| Comandos de administração | 27 |
| Comandos gerais | 5 |
| Comandos do dono | 2 |
| Total de comandos | 34 |
| Dependências de produção | 72 no grafo instalado |
| Vulnerabilidades npm reportadas | 0 |
| Módulos importados no teste isolado | 58 |
| Falhas de importação | 0 |

Há uma inconsistência documental: os ficheiros `AUDITORIA_COMANDOS.md`, `command-list.txt` e parte da auditoria anterior indicam **32 comandos**, mas a árvore real contém **34**, porque os módulos `/antifake` e `/todos` também fazem parte do catálogo real.

## 3. Classificação dos achados

| Severidade | Quantidade | Interpretação |
|---|---:|---|
| Crítica | 0 | Nenhuma falha crítica confirmada pelo scanner estático refinado. |
| Alta | 0 | Não foram encontrados aliases normalizados que pertençam a ficheiros diferentes. |
| Média | 6 | Riscos de resiliência, persistência e observabilidade que podem causar falhas ou perda de diagnóstico. |
| Baixa | 4 | Qualidade, logging e manutenção. |
| Informativa | 16 | Aliases equivalentes mantidos por compatibilidade. |

A ausência de achados críticos no scanner **não significa que o bot esteja pronto para produção**. O risco de autorização descrito abaixo resulta da leitura semântica do dispatcher e deve ser tratado como prioridade funcional, mesmo não tendo sido classificado automaticamente pelo scanner.

## 4. Achados detalhados

### F-01 — Autorização de comandos gerais excessivamente restritiva

**Severidade recomendada: alta.** Em `src/utils/dynamicCommand.js`, o fluxo de grupo ativo chama `checkPermission` para qualquer comando. Em `src/middlewares/index.js`, depois de excluir dono e comandos do tipo `owner`, a função devolve `isBotAdmin(remoteJid, userLid)`. Assim, o tipo `member` não funciona como “membro”; funciona como “administrador autorizado”.

**Impacto:** membros comuns podem não conseguir usar `/menu`, `/help`, `/ping` e `/meulid`; a descrição de permissões fica enganadora e a experiência do bot parece quebrada.

**Recomendação:** aplicar a verificação de permissão por categoria. `owner` deve exigir dono, `admin` deve exigir administrador do grupo ou administrador autorizado conforme a regra pretendida, e `member` deve poder responder sem autorização administrativa, mantendo apenas as restrições de grupo/PV necessárias.

### F-02 — Persistência JSON sem escrita atómica nem recuperação

**Severidade recomendada: média-alta.** `src/utils/database.js` usa `readFileSync`, `JSON.parse` e `writeFileSync` para várias bases independentes. Não existe lock, ficheiro temporário, rename atómico, validação de schema ou cópia de segurança antes da substituição.

**Impacto:** atualizações simultâneas de advertências, silenciamentos, prefixos ou mensagens podem perder dados. Um encerramento durante a escrita pode gerar JSON inválido e bloquear o bot.

**Recomendação:** centralizar a persistência num repositório com escrita temporária seguida de `rename`, validação mínima por ficheiro, backup rotativo e tratamento explícito de JSON corrompido. Para vários grupos e utilização contínua, migrar para SQLite ou outro armazenamento transacional.

### F-03 — Eventos de participantes fazem consultas repetidas e silenciam erros

**Severidade recomendada: média.** O middleware de entrada/saída consulta `groupMetadata` para cada participante e possui blocos `catch` vazios. O mesmo padrão aparece em consultas auxiliares de `listagrupo`.

**Impacto:** falhas de rede, limitações da API ou IDs LID incompatíveis podem fazer com que a menção, a mensagem de boas-vindas ou a remoção antifake falhe sem explicação operacional.

**Recomendação:** registar erros com grupo, ação e tipo de participante, sem expor dados desnecessários; usar cache de metadados com expiração; e separar “não foi possível verificar” de “participante confirmado como estrangeiro”.

### F-04 — Logging de produção disperso

**Severidade recomendada: baixa-média.** Existem chamadas diretas a `console.log`, `console.warn` e logging detalhado de mensagens recebidas quando o modo de desenvolvimento está ativo. O logger central existe, mas não é usado de forma uniforme.

**Impacto:** logs difíceis de filtrar, possível exposição de conteúdo de mensagens em ambientes inadequados e diagnóstico inconsistente.

**Recomendação:** substituir logs de produção pelo logger central, adicionar níveis e remover ou mascarar números, LIDs, conteúdo de mensagens e stack traces quando não forem necessários.

### F-05 — Encerramento direto do processo e listeners globais

**Severidade recomendada: média.** `src/index.js` usa `process.exit` em vários caminhos e o projeto instala handlers globais em mais de uma camada. O valor `process.setMaxListeners(1500)` reduz o sinal de alerta de possíveis listeners acumulados.

**Impacto:** falhas podem encerrar o processo sem uma estratégia uniforme de backoff; listeners podem ser registados novamente em reconexões sem serem removidos.

**Recomendação:** centralizar o ciclo de vida, limitar tentativas com backoff, distinguir erros recuperáveis de fatais e registar explicitamente a instalação de cada listener.

### F-06 — Documentação e artefactos de auditoria desatualizados

**Severidade recomendada: média.** A documentação integral lista 32 comandos, a árvore contém 34 e os aliases antigos aparecem em listas diferentes dos nomes principais atuais.

**Impacto:** o utilizador pode acreditar que um comando não existe, consultar usage antigo ou avaliar a auditoria com números incorretos.

**Recomendação:** gerar `README.md`, `command-list.txt` e `AUDITORIA_COMANDOS.md` a partir do mesmo catálogo automático, incluindo categoria, permissão, usage, aliases e data de geração.

### F-07 — Testes automatizados insuficientes

**Severidade recomendada: média.** O `package.json` contém apenas `start`; não há script de testes, lint, cobertura ou testes de unidade. A validação atual cobre sintaxe, imports e auditoria estática, mas não executa handlers com sockets simulados.

**Impacto:** bugs de runtime em comandos administrativos, identificação LID, permissões, mensagens citadas e eventos reais podem passar sem deteção.

**Recomendação:** criar testes unitários para parser, permissões, aliases, persistência e mensagens; testes com socket falso para cada comando; e um teste de integração controlado para entrada/saída, anti-link, mute e advertências.

## 5. Auditoria dos comandos

A tabela seguinte cobre individualmente **todos os 34 comandos**. A coluna “proteção” indica onde a proteção é feita: no próprio comando ou no dispatcher comum. “Validação” refere-se à existência visível de erros de parâmetros no handler; comandos sem parâmetros podem corretamente não precisar dela.

| Nº | Categoria | Principal | Aliases | Descrição | Grupo | Proteção | Validação | Efeito |
|---:|---|---|---|---|---|---|---|---|
| 1 | admin | /abrir | abrir, abri, abre, abrir-grupo, abri-grupo, abre-grupo, open, open-group | Abre o grupo. | dispatcher | dispatcher | não visível | configuração do grupo |
| 2 | admin | /adv | adv, tmpmute, tempomute, mute-temp, mute-temporario, timemute | Silencia um usuário por um tempo e desilencia sozinho (30m, 2h, 1d...). | dispatcher | dispatcher | sim | persistência |
| 3 | admin | /antifake | antifake, anti-fake, bloquear-estrangeiro, sem-estrangeiro | Remove automaticamente membros com número estrangeiro; números brasileiros começam por 55. | dispatcher | dispatcher | sim | nenhum |
| 4 | admin | /antilink | antilink, anti-link, antilinks, anti-links, bloquear-links | Ativo/desativo o bloqueio de links no grupo (apaga o link, dá advertência e remove no limite). | dispatcher | dispatcher | sim | nenhum |
| 5 | admin | /ban | ban, kick | Removo um membro do grupo | dispatcher | dispatcher | sim | participantes |
| 6 | admin | /blockwpp | blockwpp, block-wpp, blok-wpp, bloquear-wpp | Bloqueia um número no WhatsApp do bot | dispatcher | dispatcher | sim | nenhum |
| 7 | admin | /confiavel | confiavel, confiaveis, parceria, trusted, liberar-link, permitir-link | Adiciona/remove pessoas que podem enviar links sem levar restrição. | grupo | dispatcher | sim | nenhum |
| 8 | admin | /delete | delete, d, apagar, apaga, del, deletar | Excluo mensagens | dispatcher | dispatcher | sim | nenhum |
| 9 | admin | /exit | exit, saida | Ativo/desativo o recurso de envio de mensagem quando alguém sai do grupo. | dispatcher | dispatcher | sim | nenhum |
| 10 | admin | /fechar | fechar, fecha, fechar-grupo, fecha-grupo, close, close-group | Fecha o grupo. | dispatcher | dispatcher | não visível | configuração do grupo |
| 11 | admin | /limparchat | limparchat, limpar-chat, clean-chat, clean, clear-chat, clear, lc, limpa-chat, limpa, limpar | Limpa o histórico de mensagens do grupo. | grupo | dispatcher | sim | nenhum |
| 12 | admin | /linkgrupo | linkgrupo, link-grupo, link-gp | Obtém o link do grupo | dispatcher | dispatcher | sim | nenhum |
| 13 | admin | /listagrupo | listagrupo, grupos, meus-grupos, grupos-ativos, grupos-on | Lista os grupos ativos e apresenta o respetivo link quando disponível. | dispatcher | dispatcher | não visível | nenhum |
| 14 | admin | /mute | mute, mutar | Silencia um usuário no grupo (apaga as mensagens dele). Use com tempo opcional (ex: /mute @x 30m) para desilenciar sozinho. | grupo | dispatcher | sim | persistência |
| 15 | admin | /off | off, bangp | Desativa o bot no grupo | grupo | dispatcher | sim | nenhum |
| 16 | admin | /on | on | Ativa o bot no grupo | grupo | dispatcher | sim | nenhum |
| 17 | admin | /painel | painel, painel-admin, paineladm, admin-panel, adm-panel | Envia no seu privado o painel com o status e os comandos do grupo. | grupo | dispatcher | sim | mensagens |
| 18 | admin | /promover | promover, promove, promote, add-adm | Promove um usuário a administrador do grupo | grupo | dispatcher | não visível | participantes |
| 19 | admin | /rebaixar | rebaixar, rebaixa, demote | Rebaixa um administrador para membro comum | grupo | dispatcher | não visível | participantes |
| 20 | admin | /setexit | setexit, set-exit, set-saida, mudar-saida | Altera a mensagem de saída deste grupo. | grupo | dispatcher | sim | persistência |
| 21 | admin | /setname | setname, set-name, setgroupname, set-group-name, mudarnome, mudar-nome-grupo, nomegrupo, nome-grupo | Altera o nome do grupo e guarda o nome anterior. | grupo | dispatcher | sim | persistência |
| 22 | admin | /setwelcome | setwelcome, set-welcome, set-bemvindo, set-boasvindas, mudar-boasvindas | Altera a mensagem de boas-vindas deste grupo. | grupo | dispatcher | sim | persistência |
| 23 | admin | /unmute | unmute, desmutar | Desativa o mute de um membro do grupo | grupo | dispatcher | sim | persistência |
| 24 | admin | /unwarn | unwarn, perdoaradvertência, perdoaradvt, removeradvertencia, advtremove | Remove ou lista advertências válidas. | dispatcher | dispatcher | sim | nenhum |
| 25 | admin | /warn | warn, advertir, adverter, advt | Aplica advertência a um membro. | dispatcher | dispatcher | sim | participantes, persistência |
| 26 | admin | /warnreactivate | warnreactivate, warn-reactivate, reativarwarn, reativaradvertencia, reativaradvt | Reativa uma advertência inválida. | dispatcher | dispatcher | sim | nenhum |
| 27 | admin | /welcome | welcome, bemvindo, boasvinda, boasvindas, boavinda, boavindas, welkom, welkon | Ativo/desativo o recurso de boas-vindas no grupo. | dispatcher | dispatcher | sim | nenhum |
| 28 | member | /help | help, ajuda, comandos, menu-help, explicar | Explica como usar o bot ou um comando específico. | dispatcher | dispatcher | não visível | nenhum |
| 29 | member | /menu | menu | Abre o menu completo de comandos do bot. | dispatcher | dispatcher | não visível | nenhum |
| 30 | member | /meulid | meulid, meu-lid, my-lid, lid | Retorna o LID da pessoa | dispatcher | dispatcher | sim | nenhum |
| 31 | member | /ping | ping, pong | Verificar se o bot está online, o tempo de resposta e o tempo de atividade. | dispatcher | dispatcher | não visível | nenhum |
| 32 | member | /todos | todos, todo, marcartodos, marcar-todos | Envia uma mensagem usando a menção coletiva do grupo. | grupo | dispatcher | sim | mensagens |
| 33 | owner | /adm | adm, autorizados, liberar-comandos, admin-bot, adminbot | Painel de quem pode usar os comandos do bot no grupo (só o dono gerencia). | grupo | dispatcher | sim | nenhum |
| 34 | owner | /setprefix | setprefix, set-prefix, altera-prefix, altera-prefixo, alterar-prefix, alterar-prefixo, muda-prefix, muda-prefixo, mudar-prefix, mudar-prefixo, set-prefixo | Mudo o prefixo de uso dos meus comandos | dispatcher | dispatcher | sim | persistência |

### Conclusão da matriz de comandos

Todos os módulos de comando importaram e possuem nome, aliases, descrição e usage. Os comandos administrativos dependem fortemente do dispatcher para a proteção; isso reduz repetição, mas torna o dispatcher um ponto único de risco. Os comandos `abrir`, `fechar`, `promover`, `rebaixar` e `delete` devem ser testados com mensagens e permissões reais, porque a matriz estática não consegue simular as respostas do WhatsApp.

Os aliases com e sem hífen equivalem ao mesmo comando depois da normalização. Isso não é conflito entre comandos, mas aumenta a superfície de manutenção. Recomenda-se manter um alias principal simples e marcar os restantes como compatibilidade legada.

## 6. Auditoria de segurança e dados

O ficheiro `.gitignore` exclui `.env`, `database/`, `assets/auth/` e `assets/temp/`, o que é adequado para evitar publicar sessão e estado local. Mesmo assim, `BOT_LID` e `OWNER_LID` ficam hardcoded em `src/config.js`; não são credenciais secretas, mas dificultam distribuição segura e configuração por ambiente.

O comando anti-link tenta proteger dono, administradores e utilizadores confiáveis. Quando a consulta de administração falha, o código segue para a punição. Essa decisão é segura contra links não autorizados, mas pode remover ou advertir membros legítimos durante uma falha de metadados. A política deve ser explícita: “falha ao verificar” pode significar não punir, ou punir com log e revisão.

O utilitário de limpeza usa um payload de imagem WhatsApp hardcoded, com URL externa, hashes, dimensões artificiais e valores antigos. Mesmo que seja uma técnica pretendida para limpar o chat, é frágil, depende de um artefacto externo e deve ser substituído por uma abordagem suportada ou claramente isolada atrás de uma opção experimental.

## 7. Auditoria de dependências e execução

O `npm audit --omit=dev` terminou sem vulnerabilidades reportadas no estado analisado. Isso é positivo, mas não valida o comportamento da biblioteca Baileys nem a compatibilidade de eventos com a versão RC usada. O projeto deve fixar e rever periodicamente a versão, principalmente por usar `baileys` em release candidate.

O teste de sintaxe foi executado sobre todos os ficheiros JavaScript. O teste de importação isolou 58 módulos e obteve 0 falhas. O arranque interativo do bot chega ao pedido do número de pareamento; não foi possível concluir autenticação sem uma conta WhatsApp do proprietário.

## 8. Plano de correção prioritário

| Prioridade | Ação | Resultado esperado |
|---:|---|---|
| 1 | Corrigir a regra de permissão para separar `member`, `admin` e `owner`. | Comandos gerais funcionam para o público certo sem abrir ações administrativas. |
| 2 | Substituir a persistência JSON por escrita atómica com recuperação. | Menor risco de perda ou corrupção de estado. |
| 3 | Adicionar testes de unidade e socket falso para os 34 comandos. | Deteção de regressões antes de usar em grupos reais. |
| 4 | Regerar toda a documentação a partir do catálogo. | Quantidades, aliases e usage sempre coerentes. |
| 5 | Uniformizar logs e remover conteúdo sensível de logs de desenvolvimento. | Diagnóstico mais seguro e útil. |
| 6 | Rever o payload experimental de `/limparchat`. | Menos dependência de artefactos externos e menor risco operacional. |

## 9. Ficheiros de apoio

Foram incluídos no projeto os auditores `full_audit.mjs`, `command_audit_full.mjs` e `runtime_audit.mjs`. Eles permitem repetir a auditoria localmente, atualizar os números e identificar alterações futuras. O relatório deve ser regenerado sempre que forem adicionados, removidos ou alterados comandos.

> **Limitação importante:** a auditoria estática não substitui um teste num grupo de WhatsApp real. Permissões de administrador, LIDs, eliminação de mensagens, eventos de entrada/saída e pareamento só podem ser confirmados com uma sessão de teste controlada.

## Referências

[1]: https://github.com/Renen23/Renen-bot "Repositório público analisado"
[2]: https://github.com/WhiskeySockets/Baileys "Documentação e projeto Baileys"
[3]: https://docs.npmjs.com/cli/v10/commands/npm-audit "Documentação do npm audit"
