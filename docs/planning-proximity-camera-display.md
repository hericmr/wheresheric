# Planejamento: Exibição de Imagem de Câmera por Proximidade

## Objetivo
Exibir a imagem de uma câmera em tela cheia automaticamente quando o alvo "Heric" (localização atual) se aproximar dela, proporcionando uma experiência de visualização dinâmica e sensível ao contexto.

## Funcionalidades
- Monitorar continuamente a distância entre a localização atual do Heric e todas as câmeras definidas.
- Quando Heric entrar em uma "zona de proximidade" predefinida ao redor de uma câmera, acionar automaticamente a exibição da imagem dessa câmera em tela cheia.
- Se Heric se afastar da zona de proximidade da câmera, fechar a imagem em tela cheia.
- Priorizar a exibição da imagem da câmera mais próxima se Heric estiver dentro do alcance de várias câmeras.

## Considerações Chave
- **Limiar de Proximidade:** Definir uma distância razoável (por exemplo, em metros) para considerar Heric "se aproximando" de uma câmera.
- **Desempenho:** Garantir que os cálculos contínuos de distância não afetem negativamente o desempenho do aplicativo, especialmente com muitas câmeras ou atualizações de localização frequentes.
- **Experiência do Usuário:** Como a exibição automática afetará o usuário? Deve haver um aviso visual ou um pequeno atraso antes que a imagem apareça?
- **Seleção de Câmera:** Se várias câmeras estiverem próximas, como decidimos qual exibir? (A mais próxima é um bom padrão).

## Etapas de Implementação Propostas

1.  **Utilitário de Cálculo de Distância:**
    *   Criar uma função utilitária (por exemplo, `calculateDistance.js`) para calcular a distância entre duas coordenadas geográficas (latitude e longitude). A fórmula de Haversine é adequada para isso.
2.  **Integrar Lógica de Proximidade no `Viewer`:**
    *   Em `src/components/Viewer/index.js`, dentro do `useEffect` que monitora as atualizações de `location`:
        *   Iterar sobre o array `cityCameras`.
        *   Para cada câmera, calcular a distância entre a `location` do Heric e a `lat`/`lng` da câmera.
        *   Se a distância estiver abaixo do `proximityThreshold` definido:
            *   Acionar `handleOpenFullScreenImage` com a `imageUrl` e o `name` da câmera.
            *   Garantir que o `FullScreenImage` seja aberto apenas uma vez para uma dada câmera ao entrar em sua proximidade.
            *   Se Heric sair do alcance, acionar `handleCloseFullScreenImage`.
        *   Considerar um mecanismo para evitar aberturas/fechamentos rápidos se Heric estiver na borda da zona de proximidade.
3.  **Definir Limiar de Proximidade:**
    *   Adicionar uma constante para `proximityThreshold` em `src/components/Viewer/index.js` (ou um arquivo de configuração).
4.  **Refinar Gatilho do `FullScreenImage`:**
    *   Garantir que a funcionalidade existente de clique para abrir para ícones de câmera no mapa ainda funcione como esperado, potencialmente substituindo o gatilho baseado em proximidade se um usuário clicar explicitamente.
