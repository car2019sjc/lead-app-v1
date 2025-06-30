#!/bin/bash

echo "================================================"
echo "       ATUALIZANDO REPOSITORIO GITHUB"
echo "================================================"
echo

echo "[1/4] Verificando status do repositorio..."
git status

echo
echo "[2/4] Adicionando arquivos modificados..."
git add src/components/LeadDataModal.tsx
git add src/components/SavedLeads.tsx
git add src/components/ApplyLeadOffline.tsx
git add src/types/index.ts

echo
echo "[3/4] Fazendo commit das mudanças..."
git commit -m "feat: Implementa busca automatica de email e remove coluna Apollo Lead Search

- Adiciona busca automatica de email no LeadDataModal
- Remove coluna Apollo Lead Search desnecessaria  
- Implementa indicadores visuais para busca de email
- Corrige informacoes de experiencia profissional em leads salvos
- Adiciona propriedade companyUrl na interface Lead
- Melhora UX com notificacoes de email encontrado automaticamente"

echo
echo "[4/4] Enviando para GitHub..."
git push origin main

echo
echo "================================================"
echo "       ATUALIZACAO CONCLUIDA COM SUCESSO!"
echo "================================================" 