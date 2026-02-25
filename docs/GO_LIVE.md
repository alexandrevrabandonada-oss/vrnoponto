# Guia de Lançamento (Go-Live) - VR no Ponto

## O que é o produto em 2 linhas
O VR no Ponto é um hub de auditoria colaborativa para o transporte público de Volta Redonda. 
Permite que cidadãos registrem o tempo real de ônibus para gerar dados abertos e melhorar a mobilidade urbana.

## Fluxo em 10 segundos
1. **Onde estou**: O app detecta seu ponto pelo GPS.
2. **O que passou**: Você toca no ônibus que acabou de passar ou que você entrou.
3. **Pronto**: O dado é enviado ou salvo offline para o próximo boletim.

---

## Checklist de Testes Manuais (10 Itens)
- [ ] O Tour aparece na primeira visita?
- [ ] O GPS localiza o ponto mais próximo em < 5s?
- [ ] A busca manual de pontos funciona se o GPS falhar?
- [ ] O registro "Passou" / "Entrei" confirma com sucesso?
- [ ] O modo "Texto Maior" em Configurações funciona em todo o app?
- [ ] A página `/boletim` carrega se houver pelo menos 3 relatos?
- [ ] O "Clear Data" no `/meu` apaga tudo e desloga?
- [ ] O mapa de bairros diferencia cores (Crítico vs Alerta)?
- [ ] O admin consegue ver a lista de paradas com dados?
- [ ] O botão "Seguir Bairro" ativa o opt-in de push?

---

## Checklist de Dados Mínimos
- [ ] **Seed**: Pelo menos 50 paradas importadas (via Admin > Qualidade).
- [ ] **PDF**: Pelo menos 1 PDF de escala oficial processado (via Admin > Oficial).
- [ ] **Relatos**: Pelo menos 3 relatos "Auditados" (L2 ou L3) nos últimos 7 dias.

---

## Como validar o Offline
1. Ative o modo avião no celular.
2. Faça um registro de "Passou".
3. Vá em `/meu` e veja o contador de "Pendentes" aumentar.
4. Desative o modo avião e clique em "Sincronizar Agora".
5. Verifique se as pendências zeram.

## Como validar Share Pack e Boletim
1. Vá em `/boletim`.
2. Clique em "WhatsApp" ou "Instagram" no Share Pack.
3. Verifique se o texto copiado/compartilhado contém os dados corretos da semana.

## Como validar Mutirão (3 Passos)
1. **Ativação**: Vá em `/admin/mutirao` e ative um novo mutirão.
2. **Visualização**: Verifique se o banner de mutirão aparece na Home.
3. **Engajamento**: Faça um registro e verifique se ele conta para o progresso do mutirão.

🏁 stories/go-live-docs.🏁
