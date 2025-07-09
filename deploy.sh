#!/bin/bash

echo "🚀 Deploy Simples para GitHub Pages"

# Verificar se estamos na branch correta
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main-restored" ]; then
    echo "❌ Erro: Execute este script na branch main-restored"
    exit 1
fi

# Build
echo "📦 Build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Abortando deploy."
    exit 1
fi

echo "✅ Build concluído!"

# Salvar branch atual
echo "📍 Branch atual: $CURRENT_BRANCH"

# Trocar para gh-pages
echo "🔄 Trocando para gh-pages..."
git checkout gh-pages

# Atualizar
git pull origin gh-pages

# Limpar arquivos antigos (exceto .git)
echo "🧹 Limpando arquivos antigos..."
find . -mindepth 1 -not -path './.git*' -delete

# Copiar build
echo "📋 Copiando build..."
cp -r build/* .

# Commit e push
echo "💾 Commit e push..."
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
git push origin gh-pages

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
    echo "🌐 https://hericmr.github.io/onde_esta_heric"
else
    echo "❌ Erro no push."
    exit 1
fi

# Voltar
echo "🔄 Voltando para $CURRENT_BRANCH..."
git checkout $CURRENT_BRANCH

echo "🎉 Deploy finalizado!"
echo "⏰ Aguarde alguns minutos para o GitHub Pages atualizar." 