# Planejamento: Implementação de Visualizador de Câmera em Tela Cheia

## Objetivo
Implementar um visualizador de imagem em tela cheia para feeds de câmeras, similar ao componente `FullScreenImage` do repositório `cameras`, permitindo aos usuários visualizar imagens de câmeras em detalhes com opções de navegação e controle.

## Funcionalidades
- Exibir uma imagem de câmera em tela cheia.
- Fornecer controles para fechar o visualizador, atualizar a imagem, alternar tela cheia e, potencialmente, baixar a imagem.
- Permitir navegação entre múltiplas imagens de câmeras (se aplicável).
- Lidar com estados de carregamento e erros.

## Considerações Chave
- **Ponto de Integração:** Determinar onde no aplicativo `ondeestaheric` o visualizador em tela cheia será acionado (por exemplo, clicando em um ícone de câmera no mapa).
- **Fluxo de Dados:** Como a `imageUrl` e outras props necessárias (como `title`, `onPreviousCamera`, `onNextCamera`, `hasPrevious`, `hasNext`) serão passadas para o componente `FullScreenImage`?
- **Estilização:** O componente `FullScreenImage` depende de `../assets/FullScreenImage.css`. Este CSS precisará ser integrado ao nosso projeto. Devemos revisar seu conteúdo para garantir que não haja conflitos com estilos existentes.
- **Dependências:** O componente usa `react-icons` (já instalado) e `prop-types`.
- **Atualização da Imagem:** O componente possui um mecanismo de atualização automática da imagem. Precisamos garantir que isso seja compatível com nossas fontes de feed de câmera.
- **Navegação:** Se implementarmos a navegação entre câmeras, precisaremos de um mecanismo para gerenciar a lista de imagens de câmeras e sua ordem.

## Etapas de Implementação Propostas

1.  **Copiar `FullScreenImage.js` e `FullScreenImage.css`:**
    *   Copiar `FullScreenImage.js` de `cameras/FullScreenImage.js` para `src/components/FullScreenImage/index.js` em nosso projeto.
    *   Copiar `FullScreenImage.css` de `cameras/assets/FullScreenImage.css` para `src/components/FullScreenImage/styles.css` em nosso projeto.
2.  **Integrar CSS:** Importar `src/components/FullScreenImage/styles.css` para `src/components/FullScreenImage/index.js`.
3.  **Criar um Gatilho:** Decidir onde o visualizador em tela cheia será aberto. Por exemplo, poderíamos adicionar um manipulador `onClick` aos ícones da câmera no mapa.
4.  **Gerenciar Estado para o Visualizador:** Implementar estado no componente `Viewer` (ou um componente pai) para controlar a visibilidade do componente `FullScreenImage` e passar a `imageUrl` e outras props.
5.  **Adaptar `FullScreenImage` (se necessário):** Revisar o componente `FullScreenImage` e adaptá-lo às necessidades específicas do nosso projeto, especialmente em relação a como a `imageUrl` é obtida e como a navegação (se usada) é tratada.
