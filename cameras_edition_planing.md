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

Esta seção detalha os passos a serem seguidos para a implementação da funcionalidade de edição de câmeras, com um checklist para acompanhamento.

### Checklist de Implementação:

#### Fase 1: Configuração do Banco de Dados
- [ ] **Criar a tabela `cameras` no Supabase:**
  - [ ] Definir o esquema da tabela conforme a seção 2.
  - [ ] Configurar as políticas de RLS (Row Level Security) para permitir `INSERT`, `SELECT`, `UPDATE` e `DELETE` conforme necessário (inicialmente, pode ser mais permissivo para desenvolvimento).

#### Fase 2: Desenvolvimento do Componente `CameraEditor`
- [ ] **Criar o diretório `src/components/CameraEditor`**.
- [ ] **Criar `src/components/CameraEditor/index.js`:**
  - [ ] Estrutura básica do componente React.
  - [ ] Importar `React`, `useState`, `useEffect`, `useRef`.
  - [ ] Importar componentes de UI (e.g., `Form`, `Button`, `Container`, `Row`, `Col`, `Card` do `react-bootstrap`).
  - [ ] Importar `supabase` do `../../supabaseClient`.
  - [ ] Inicializar o estado para os campos do formulário da câmera (name, lat, lng, link, info, icon).
  - [ ] Inicializar o estado para o mapa e as interações de desenho/modificação.
- [ ] **Criar `src/components/CameraEditor/styles.css`:**
  - [ ] Estilos básicos para o componente e o mapa.
- [ ] **Implementar o Mapa OpenLayers no `CameraEditor`:**
  - [ ] Inicializar o mapa (`ol/Map`, `ol/View`, `ol/layer/Tile`, `ol/source/OSM`).
  - [ ] Adicionar uma camada de vetor para desenhar e exibir polígonos (`ol/layer/Vector`, `ol/source/Vector`).
  - [ ] Adicionar um marcador para a localização da câmera (`ol/Feature`, `ol/geom/Point`, `ol/style/Style`, `ol/style/Icon`).
- [ ] **Implementar Interações de Desenho e Modificação:**
  - [ ] Importar `ol/interaction/Draw` e `ol/interaction/Modify`.
  - [ ] Adicionar a interação de desenho para retângulos (tipo `Polygon` com `geometryFunction` ou `Circle` e conversão).
  - [ ] Adicionar a interação de modificação para ajustar o polígono.
  - [ ] Lógica para obter a geometria desenhada e convertê-la para GeoJSON.
- [ ] **Desenvolver o Formulário de Detalhes da Câmera:**
  - [ ] Campos de input controlados para `name`, `lat`, `lng`, `link`, `info`, `icon`.
  - [ ] Botões para "Salvar", "Limpar Desenho", "Carregar Câmera para Edição".
- [ ] **Integrar `CameraEditor` com Supabase (CRUD):**
  - [ ] Função `saveCamera` para `INSERT` ou `UPDATE` na tabela `cameras`.
  - [ ] Função `loadCameras` para `SELECT` todas as câmeras e popular uma lista para edição.
  - [ ] Função `deleteCamera` para remover uma câmera.
  - [ ] Lógica para converter GeoJSON para geometria OpenLayers ao carregar para edição.

#### Fase 3: Atualização do Roteamento
- [ ] **Adicionar rota `/edit-cameras` em `src/App.js`:**
  - [ ] Importar `CameraEditor`.
  - [ ] Adicionar `<Route path="/edit-cameras" element={<CameraEditor />} />`.

#### Fase 4: Atualização do Componente `Viewer`
- [ ] **Modificar `Viewer` para buscar câmeras do Supabase:**
  - [ ] Remover importação de `cityCameras.js`.
  - [ ] Atualizar o `useEffect` que carrega as câmeras para consultar a tabela `cameras` do Supabase.
- [ ] **Exibir Áreas de Cobertura no `Viewer`:**
  - [ ] Adicionar uma nova camada de vetor no mapa do `Viewer` para exibir os polígonos de `coverage_area`.
  - [ ] Lógica para converter GeoJSON de `coverage_area` para geometria OpenLayers e estilizar.

#### Fase 5: Testes e Refinamentos
- [ ] **Testar Adição de Câmera:**
  - [ ] Adicionar uma nova câmera com detalhes e desenhar uma área de cobertura.
  - [ ] Verificar se os dados são salvos corretamente no Supabase.
- [ ] **Testar Edição de Câmera:**
  - [ ] Carregar uma câmera existente, modificar detalhes e/ou área de cobertura.
  - [ ] Verificar se as alterações são salvas corretamente.
- [ ] **Testar Exibição no `Viewer`:**
  - [ ] Verificar se todas as câmeras e suas áreas de cobertura são exibidas corretamente no mapa principal.
- [ ] **Testar Responsividade:**
  - [ ] Verificar o layout e a funcionalidade em diferentes tamanhos de tela (desktop, mobile).
- [ ] **Tratamento de Erros:**
  - [ ] Implementar feedback visual para operações de Supabase (sucesso/erro).
  - [ ] Lidar com casos de erro na geolocalização ou na API.
- [ ] **Refinamento de UI/UX:**
  - [ ] Melhorar a usabilidade do formulário e das interações do mapa.
  - [ ] Adicionar validações de input.

## 7. Considerações Adicionais

*   **Autenticação:** Para um ambiente de produção, a página de edição deve ser protegida por autenticação.
*   **Otimização de Mapa:** Para um grande número de câmeras/polígonos, considerar otimizações de renderização do OpenLayers.
*   **Testes Automatizados:** Adicionar testes unitários e de integração para os novos componentes e lógicas.
