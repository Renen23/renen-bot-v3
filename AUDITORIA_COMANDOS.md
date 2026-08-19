# Auditoria completa dos comandos — Renen Bot

## Resultado geral

O projeto contém **32 comandos** distribuídos em três categorias. A análise foi feita em três blocos de 12 comandos, com uma verificação final dos 8 restantes, dos aliases, dos imports, das permissões e dos pares inversos.

## Bloco 1 — comandos 1 a 12

| Nº | Comando principal | Categoria | Função resumida |
|---:|---|---|---|
| 1 | `/abrir` | Administração | Abre o grupo para mensagens. |
| 2 | `/adv` | Administração | Silencia temporariamente um membro. |
| 3 | `/antilink` | Administração | Controla links enviados no grupo. |
| 4 | `/ban` | Administração | Remove um membro. |
| 5 | `/blockwpp` | Administração | Bloqueia um número no WhatsApp do bot. |
| 6 | `/confiavel` | Administração | Gere membros autorizados a enviar links. |
| 7 | `/delete` | Administração | Apaga uma mensagem respondida. |
| 8 | `/exit` | Administração | Liga ou desliga mensagens de saída. |
| 9 | `/fechar` | Administração | Fecha o grupo para mensagens. |
| 10 | `/limparchat` | Administração | Limpa o histórico do grupo. |
| 11 | `/linkgrupo` | Administração | Obtém o link do grupo. |
| 12 | `/listagrupo` | Administração | Lista grupos ativos e links disponíveis. |

## Bloco 2 — comandos 13 a 24

| Nº | Comando principal | Categoria | Função resumida |
|---:|---|---|---|
| 13 | `/mute` | Administração | Silencia um membro, com duração opcional. |
| 14 | `/off` | Administração | Desativa o bot no grupo. |
| 15 | `/on` | Administração | Ativa o bot no grupo. |
| 16 | `/painel` | Administração | Envia o painel do grupo no privado. |
| 17 | `/promover` | Administração | Promove um membro a administrador. |
| 18 | `/rebaixar` | Administração | Remove o cargo de administrador. |
| 19 | `/setexit` | Administração | Configura a mensagem de saída. |
| 20 | `/setname` | Administração | Altera o nome do grupo. |
| 21 | `/setwelcome` | Administração | Configura a mensagem de boas-vindas. |
| 22 | `/unmute` | Administração | Retira o silêncio de um membro. |
| 23 | `/unwarn` | Administração | Lista ou remove advertências válidas. |
| 24 | `/warnreactivate` | Administração | Lista ou reativa advertências inválidas. |

## Bloco 3 — comandos restantes

| Nº | Comando principal | Categoria | Função resumida |
|---:|---|---|---|
| 25 | `/warn` | Administração | Aplica uma advertência e remove no limite. |
| 26 | `/welcome` | Administração | Liga ou desliga as boas-vindas. |
| 27 | `/help` | Geral | Lista todos os comandos e mostra detalhes. |
| 28 | `/menu` | Geral | Mostra o menu visual completo. |
| 29 | `/meulid` | Geral | Mostra o LID do utilizador. |
| 30 | `/ping` | Geral | Verifica resposta, latência e uptime. |
| 31 | `/adm` | Dono | Gere os membros autorizados a usar o bot. |
| 32 | `/setprefix` | Dono | Altera o prefixo do grupo. |

## Pares inversos confirmados

| Ação | Comando inverso | Verificação |
|---|---|---|
| Abrir grupo | `/abrir` | Usa `not_announcement`. |
| Fechar grupo | `/fechar` | Usa `announcement`. |
| Ativar bot | `/on` | Ativa o grupo na base de dados. |
| Desativar bot | `/off` | Retira o grupo da base de dados ativa. |
| Silenciar | `/mute` | Regista o membro como silenciado. |
| Retirar silêncio | `/unmute` | Remove o membro dos silenciados. |
| Promover | `/promover` | Usa a ação `promote`. |
| Rebaixar | `/rebaixar` | Usa a ação `demote`. |
| Ativar boas-vindas | `/welcome 1` | Ativa o recurso. |
| Desativar boas-vindas | `/welcome 0` | Desativa o recurso. |
| Ativar saída | `/exit 1` | Ativa o recurso. |
| Desativar saída | `/exit 0` | Desativa o recurso. |
| Aplicar advertência | `/warn` | Cria advertência válida. |
| Remover advertência | `/unwarn` | Revoga advertência válida. |
| Reativar advertência | `/warnreactivate` | Reativa advertência inválida. |
| Configurar boas-vindas | `/setwelcome` | Guarda ou restaura a mensagem. |
| Configurar saída | `/setexit` | Guarda ou restaura a mensagem. |

## Correções aplicadas

A forma simples foi colocada como nome principal, enquanto os aliases antigos com hífen permanecem quando são úteis para compatibilidade. Assim, `/listagrupo`, `/antilink`, `/limparchat`, `/linkgrupo`, `/setname`, `/setwelcome`, `/setexit`, `/warnreactivate`, `/meulid` e `/setprefix` funcionam diretamente.

O comando `/help` foi separado em cinco mensagens: introdução, dono, administração, comandos gerais e rodapé. Isso mantém os 32 comandos visíveis no WhatsApp e evita que uma única mensagem grande seja cortada ou fique desorganizada.

O menu foi corrigido para não misturar `/on` e `/off` com os comandos exclusivos do dono. `/setprefix` e `/adm` ficam em **Dono**, enquanto `/on` e `/off` ficam em **Administração**, juntamente com os restantes comandos de gestão do grupo.

## Testes realizados

A importação dinâmica encontrou os 32 comandos nas categorias `member`, `admin` e `owner`. Também foram testados os nomes principais e todos os comandos obrigatórios apareceram no `/help`. A sintaxe dos ficheiros JavaScript foi validada com `node --check`.

## Ajuste final de interface

O `/menu` é agora o único comando responsável por apresentar a lista visual completa dos comandos. O `/help` deixou de repetir a lista: sem argumento, mostra apenas como utilizar a ajuda; com argumento, por exemplo `/help antifake`, explica a função, utilização, permissão e aliases daquele comando.

O `/menu` envia sempre a imagem `assets/images/renen-bot.webp`, correspondente à arte fornecida pelo Renen, acompanhada da legenda organizada por categorias.
