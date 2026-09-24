# Requisitos — Little Ville

Little Ville é um web app de registro de avistamentos do Pé Grande em Florianópolis. Moradores
registram onde e quando viram algo, acompanham no mapa as áreas de risco recentes, se organizam em
equipes com chat, e consultam locais de emergência.

- Contrato da API: [API-CONTRACT.md](API-CONTRACT.md)
- Onde cada requisito está implementado e testado: [RASTREABILIDADE.md](RASTREABILIDADE.md)

**Escopo deste repositório: front-end.** Onde o requisito depende de servidor, o front consome o
contrato. Em desenvolvimento e na demonstração, o contrato é atendido por um mock (MSW) que segue
as mesmas regras.

---

## 1. Atores

| Ator | Descrição |
|------|-----------|
| Visitante | Não autenticado. Só vê a intro e a tela de login/cadastro. |
| Usuário | Autenticado. Registra avistamentos, edita e exclui os **próprios**, participa de uma equipe. |
| Admin | Usuário com `papel = admin`. Tudo que o usuário faz, e **exclui qualquer avistamento** (moderação). |

---

## 2. Requisitos funcionais

| Id | Requisito | Prioridade |
|----|-----------|------------|
| **RF01** | **Mapa.** Mostrar num mapa os avistamentos recentes, os membros da equipe e os locais de emergência, com alternância Mapa/Lista. | Alta |
| **RF02** | **Locais de emergência.** Listar hospitais, polícia, bombeiros, Defesa Civil e abrigos, com endereço, horário e telefone que liga direto (`tel:`). | Média |
| **RF03** | **Equipes.** Criar equipe (gera código de convite), entrar por código, ver membros e sair com confirmação. Uma equipe por usuário. | Média |
| **RF04** | **Área de 1 km por tempo.** Cada avistamento desenha no mapa um círculo de 1000 m cuja aparência muda com a idade: Recente (< 1 h), 1–2 h, Antigo (> 2 h). | Alta |
| **RF05** | **Chat da equipe.** Troca de mensagens de texto entre membros, atualizada em menos de 5 s. | Baixa |
| **RF06** | **Login e cadastro.** Cadastro em duas etapas (dados pessoais; endereço + consentimento LGPD), login e logout. *Já implementado.* | Alta |
| **RF07** | **CRUD de avistamentos.** Criar, listar (busca, filtro por período e autor, ordenação, paginação), ver detalhe, editar e excluir, com desfazer. | **Máxima** |
| **RF08** | **Dashboard.** Indicadores (total, últimos 7 dias, ativos agora, minha contribuição), gráficos por dia, por período do dia e por bairro, e os 5 avistamentos mais recentes. | **Máxima** |
| **RF09** | **Compartilhar posição (GPS).** Pedir permissão de localização **só depois do login**; com o mapa aberto, enviar a posição a cada 30 s para a equipe. | Média |
| **RF10** | **Perfil.** Ver os próprios dados (nome, e-mail, papel, equipe) e sair da conta. | Baixa |

---

## 3. Requisitos não funcionais

| Id | Requisito | Como é verificado |
|----|-----------|-------------------|
| **RNF01** | **Responsividade total**: de 390 px a 1920 px, sem rolagem horizontal; tabela vira cartões no mobile; navegação inferior no mobile e lateral no desktop. | Capturas em 390×844, 768×1024, 1366×768 e 1920×1080 (Playwright) |
| **RNF02** | **Atualização < 5 s**: novas mensagens do chat aparecem em até 5 s (polling de 3 s). | Teste e2e que mede o tempo entre o envio de um usuário e a exibição para outro |
| **RNF03** | **Acessibilidade**: contraste AA, foco visível, área de toque ≥ 44×44 px, rótulo em todo campo, cor nunca como única informação, `prefers-reduced-motion` respeitado. | `@axe-core/playwright` em todas as rotas, com zero violação |
| **RNF04** | **Segurança no cliente**: sessão só em cookie httpOnly (nada em `localStorage`), texto de usuário sempre renderizado como texto, nenhum segredo no repositório. | Varredura no lint/CI; revisão de código |
| **RNF05** | **Hora confiável**: toda regra de tempo usa a hora do servidor (`serverTime`), corrigindo o desvio do relógio do aparelho. | Teste unitário do cálculo de desvio e do RF04 com relógio local adulterado |
| **RNF06** | **Desempenho percebido**: skeleton no formato do conteúdo; se a primeira chamada passar de 3 s, tela "Acordando o servidor…". Mapa com `preferCanvas` e marcadores agrupados. | Teste e2e com latência simulada |
| **RNF07** | **Entrega publicável**: build de produção sem avisos, deploy na Vercel com `/api/*` redirecionado para a API real, instalável (manifest). | `npm run build` no CI |
| **RNF08** | **Consistência visual**: todas as cores vêm de `theme/tokens.css`; tipografia Fredoka + Nunito Sans; ícones só do lucide. | Varredura que reprova hexadecimal fora de `tokens.css` |

---

## 4. Regras de negócio

| Id | Regra |
|----|-------|
| **RN01** | **Local obrigatório.** Um avistamento só pode ser enviado com local: a posição atual (GPS) ou um ponto marcado no mapa. Sem local, o botão fica bloqueado e o motivo aparece na tela. |
| **RN02** | **Hora automática.** A hora do avistamento é a do servidor no momento do registro. O usuário não digita e não edita. |
| **RN03** | **Permissões.** Só o autor edita o próprio avistamento. O autor exclui o próprio; o Admin exclui qualquer um. O front esconde a ação não permitida, e o servidor recusa (403) se alguém tentar mesmo assim. |
| **RN04** | **Exclusão lógica.** Excluir marca `deletedAt` em vez de apagar. O item some de listas, mapa e dashboard. O usuário pode desfazer por 10 s. |
| **RN05** | **Uma equipe por vez.** Para entrar em outra equipe é preciso sair da atual. Se o líder sai, a liderança passa ao membro mais antigo; se o último membro sai, a equipe é encerrada. |
| **RN06** | **Faixas do RF04.** Recente: menos de 1 h. 1–2 h: de 1 h a 2 h. Antigo: mais de 2 h. "Ativos agora" no dashboard = menos de 2 h. A idade é reavaliada a cada 60 s, sempre com a hora do servidor. |
| **RN07** | **GPS só depois do login.** A permissão de localização nunca é pedida na tela de login. Se for negada, o app continua funcionando e oferece marcar o local manualmente. |
| **RN08** | **Chat.** Mensagem de 1 a 500 caracteres, texto puro, no máximo 1 envio por segundo por usuário. |
| **RN09** | **LGPD.** O cadastro exige consentimento explícito. CPF, telefone e endereço não são exibidos nem devolvidos pela API depois do cadastro. |
| **RN10** | **Estatísticas no servidor.** Todo número do dashboard é calculado pelo servidor; o front só exibe. |
