# Plano para Página de Edição de Câmeras

Este documento detalha o plano para a implementação de uma página de edição de câmeras no aplicativo Viewer, permitindo a criação e modificação de dados de câmeras, incluindo a definição de suas áreas de cobertura no mapa via GeoJSON.

## 1. Visão Geral da Funcionalidade

A página de edição de câmeras permitirá aos usuários:
*   Adicionar novas câmeras com detalhes como nome, localização (latitude, longitude), link da imagem e informações adicionais.
*   Desenhar e editar polígonos GeoJSON no mapa para representar a área de cobertura de cada câmera.
*   Salvar e carregar dados de câmeras de uma base de dados Supabase.
*   Visualizar as áreas de cobertura no mapa principal do Viewer.

## 2. Estrutura do Banco de Dados (Supabase)

Será criada uma nova tabela no Supabase para armazenar os dados das câmeras.

### Tabela: `cameras`

| Coluna          | Tipo      | Descrição                                     |
| :-------------- | :-------- | :-------------------------------------------- |
| `id`            | `UUID`    | Chave primária, gerada automaticamente.       |
| `created_at`    | `TIMESTAMPTZ` | Timestamp de criação, gerado automaticamente. |
| `name`          | `TEXT`    | Nome da câmera (ex: "Câmera Avenida Central"). |
| `lat`           | `REAL`    | Latitude da câmera.                           |
| `lng`           | `REAL`    | Longitude da câmera.                          |
| `link`          | `TEXT`    | URL da imagem/stream da câmera.               |
| `info`          | `TEXT`    | Informações adicionais sobre a câmera.        |
| `icon`          | `TEXT`    | Nome do ícone (ex: "MdCameraAlt").            |
| `coverage_area` | `JSONB`   | Polígono GeoJSON representando a área de cobertura. |

## 3. Desenvolvimento do Componente `CameraEditor`

Será criado um novo componente React em `src/components/CameraEditor/index.js` e `src/components/CameraEditor/styles.css`.

### Funcionalidades do `CameraEditor`:
*   **Formulário de Detalhes da Câmera:** Campos para `name`, `lat`, `lng`, `link`, `info`, `icon`.
*   **Mapa Interativo (OpenLayers):**
    *   Exibirá a localização da câmera.
    *   Permitirá desenhar e editar polígonos (retângulos) no mapa.
    *   A interação de desenho (`ol/interaction/Draw`) será configurada para `Polygon` ou `Circle` (para desenhar retângulos, pode-se usar `Polygon` e restringir a forma, ou desenhar um círculo e converter para um polígono).
    *   A interação de modificação (`ol/interaction/Modify`) permitirá ajustar os vértices do polígono existente.
*   **Integração com Supabase:**
    *   Funções para `INSERT` (nova câmera) e `UPDATE` (câmera existente) na tabela `cameras`.
    *   Função para `SELECT` todas as câmeras para exibição e edição.
*   **Conversão GeoJSON:** Lógica para converter a geometria do OpenLayers para o formato GeoJSON e vice-versa.

## 4. Atualização do Roteamento (`src/App.js`)

Será adicionada uma nova rota para a página de edição de câmeras.

```javascript
// Exemplo de rota a ser adicionada
<Route path="/edit-cameras" element={<CameraEditor />} />
```

## 5. Atualização do Componente `Viewer`

O componente `Viewer` será modificado para buscar os dados das câmeras da nova tabela `cameras` do Supabase, em vez de `cityCameras.js`.

### Funcionalidades do `Viewer` atualizadas:
*   **Busca de Dados:** O `useEffect` que busca as câmeras será atualizado para consultar a tabela `cameras` do Supabase.
*   **Exibição de Polígonos:** As áreas de cobertura (`coverage_area`) serão carregadas e exibidas no mapa como camadas de polígonos.

## 6. Próximos Passos (Ordem de Implementação)

1.  **Criação da Tabela `cameras` no Supabase:** Definir o esquema e criar a tabela.
2.  **Desenvolvimento do `CameraEditor` (Parte 1 - Formulário e Mapa Básico):** Criar o componente com o formulário e um mapa OpenLayers funcional.
3.  **Implementação da Interação de Desenho no `CameraEditor`:** Adicionar a funcionalidade de desenhar polígonos no mapa.
4.  **Integração do `CameraEditor` com Supabase (INSERT/UPDATE):** Conectar o formulário e o desenho do mapa com as operações de salvar no Supabase.
5.  **Atualização do Roteamento:** Adicionar a rota para o `CameraEditor` em `src/App.js`.
6.  **Atualização do `Viewer`:** Modificar o `Viewer` para carregar câmeras do Supabase e exibir as áreas de cobertura.
7.  **Testes e Refinamentos:** Testar a funcionalidade completa e fazer ajustes necessários.
