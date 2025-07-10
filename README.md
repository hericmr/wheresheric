# Onde Está Heric?

Sistema de rastreamento e monitoramento em tempo real que combina localização geográfica com visualização de câmeras de segurança. O projeto permite acompanhar a localização de um indivíduo (Heric) em tempo real através de um mapa interativo, integrado com câmeras de monitoramento urbano.

## Arquitetura do Sistema

### Visão Geral
O projeto está estruturado como uma aplicação React single-page application (SPA) que utiliza Supabase como backend-as-a-service para gerenciamento de dados e comunicação em tempo real. A arquitetura segue o padrão de separação entre Viewer (visualização) e Transmitter (transmissão de dados), conforme documentado no plano de estrutura.

### Stack Tecnológica

#### Frontend
- **React 19.1.0**: Framework principal para construção da interface
- **React Router DOM 6.30.1**: Roteamento client-side
- **React Bootstrap 2.10.10**: Componentes UI baseados em Bootstrap 5.3.7
- **React Icons 5.5.0**: Biblioteca de ícones
- **OpenLayers 10.6.1**: Biblioteca para renderização de mapas interativos

#### Backend e Infraestrutura
- **Supabase**: Backend-as-a-service para:
  - Banco de dados PostgreSQL
  - Autenticação e autorização
  - Comunicação em tempo real via WebSockets
  - Storage de arquivos

#### Ferramentas de Desenvolvimento
- **React Scripts 5.0.1**: Scripts de build e desenvolvimento
- **Testing Library**: Suíte de testes para React
- **ESLint**: Linting de código JavaScript
- **GitHub Pages**: Deploy e hospedagem

## Estrutura do Projeto

```
ondeestaoheric/
├── src/
│   ├── components/
│   │   ├── Viewer/           # Componente principal de visualização
│   │   ├── CameraEditor/     # Editor de câmeras
│   │   ├── CameraLayer/      # Camada de câmeras no mapa
│   │   ├── CameraGrid/       # Grid responsivo de câmeras
│   │   └── CameraCard/       # Card individual de câmera
│   ├── utils/
│   │   └── calculateDistance.js  # Cálculo de distância geográfica
│   ├── App.js               # Componente raiz e roteamento
│   ├── supabaseClient.js    # Configuração do cliente Supabase
│   ├── cityCameras.js       # Câmeras de teste
│   └── index.js             # Ponto de entrada da aplicação
├── public/                  # Arquivos estáticos
├── docs/                    # Documentação técnica
├── deploy.sh               # Script de deploy automatizado
└── package.json            # Dependências e scripts
```

## Funcionalidades Principais

### 1. Rastreamento em Tempo Real
- **Localização Geográfica**: Exibe a posição atual de Heric em um mapa interativo
- **Atualizações em Tempo Real**: Utiliza Supabase Realtime para receber atualizações instantâneas
- **Histórico de Posições**: Mantém registro das últimas localizações
- **Indicador de Status**: Mostra o status da conexão e última atualização

### 2. Sistema de Câmeras Avançado
- **Grid Responsivo**: Exibe múltiplas câmeras simultaneamente em layout responsivo
- **Detecção Automática**: Identifica câmeras próximas à localização atual automaticamente
- **Ativação Manual**: Permite ativar câmeras clicando nos ícones no mapa
- **Áreas de Cobertura**: Define e visualiza áreas de cobertura das câmeras (polígonos)
- **Controles Avançados**: Fechar câmeras individuais, fechar todas, reabrir todas
- **Atualização Automática**: Imagens das câmeras são atualizadas automaticamente

### 3. Interface de Usuário Moderna
- **Mapa Interativo**: Baseado em OpenLayers com tiles OpenStreetMap
- **Painel Lateral**: Controles e informações do sistema
- **Grid Responsivo**: Layout adaptável (vertical em mobile, grid em desktop)
- **Controles Intuitivos**: Botões para expandir, colapsar, fechar câmeras
- **Design Responsivo**: Interface adaptável a diferentes dispositivos

## Componentes Principais

### Viewer
Componente principal responsável pela visualização do mapa e rastreamento. Funcionalidades:
- Renderização do mapa OpenLayers com zoom 18
- Gerenciamento de marcadores de localização
- Integração com Supabase Realtime
- Detecção de proximidade com câmeras
- Ativação de câmeras por clique no mapa
- Controles de interface

### CameraGrid
Componente responsável pela exibição do grid de câmeras. Funcionalidades:
- Layout responsivo (vertical/grid)
- Controles de posicionamento (expandido/minimizado/tela cheia)
- Gerenciamento de câmeras ativas
- Controles de fechar/reabrir câmeras
- Animações suaves

### CameraCard
Componente individual para cada câmera. Funcionalidades:
- Exibição da imagem da câmera
- Atualização automática a cada ~1 segundo
- Controles de refresh, download, visão noturna
- Estados de loading e erro
- Informações da câmera

### CameraLayer
Componente responsável pela renderização das câmeras no mapa. Funcionalidades:
- Exibição de ícones de câmeras
- Renderização de áreas de cobertura (polígonos)
- Interação com câmeras (cliques)
- Integração com sistema de detecção

### CameraEditor
Interface administrativa para gerenciamento de câmeras. Funcionalidades:
- Adição de novas câmeras
- Edição de câmeras existentes
- Definição de áreas de cobertura (polígonos)
- Integração com banco de dados Supabase

## Configuração e Deploy

### Variáveis de Ambiente
```bash
REACT_APP_SUPABASE_URL=sua_url_do_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### Scripts Disponíveis
```bash
npm start          # Inicia servidor de desenvolvimento
npm run build      # Gera build de produção
npm test           # Executa testes
npm run deploy     # Deploy para GitHub Pages
npm run deploy:manual  # Deploy manual via script
```

### Processo de Deploy
O projeto utiliza GitHub Pages para hospedagem com deploy automatizado:
1. Build da aplicação React
2. Deploy para branch `gh-pages`
3. Configuração de homepage no `package.json`
4. Script de deploy automatizado (`deploy.sh`)

## Estrutura de Dados

### Tabela `location_updates`
Armazena atualizações de localização em tempo real:
```sql
- id: UUID (Primary Key)
- lat: DECIMAL (Latitude)
- lng: DECIMAL (Longitude)
- accuracy: DECIMAL(10,2) NULL (Precisão em metros - opcional)
- created_at: TIMESTAMP
```

### Tabela `cameras`
Armazena informações das câmeras de monitoramento:
```sql
- id: UUID (Primary Key)
- name: TEXT (Nome da câmera)
- lat: DECIMAL (Latitude)
- lng: DECIMAL (Longitude)
- link: TEXT (URL da câmera)
- info: TEXT (Informações adicionais)
- icon: TEXT (Ícone da câmera)
- coverage_area: GEOJSON (Área de cobertura)
```

## Algoritmos e Utilitários

### Cálculo de Distância
Implementação da fórmula de Haversine para cálculo de distância geográfica:
- Precisão em metros
- Consideração da curvatura terrestre
- Otimizado para performance

### Detecção de Proximidade
- Threshold configurável (50 metros por padrão)
- Cálculo em tempo real
- Detecção por polígonos de cobertura
- Fallback para distância geográfica
- Notificações automáticas

### Atualização de Imagens
- Atualização automática a cada ~1 segundo
- Uso de timestamps para evitar cache
- Tratamento de erros de carregamento
- Estados de loading e erro

## Considerações de Performance

### Otimizações Implementadas
- Lazy loading de componentes
- Memoização de estilos de mapa
- Debounce em atualizações de localização
- Limpeza automática de listeners
- Atualização eficiente de imagens

### Monitoramento
- Logs de debug para desenvolvimento
- Indicadores de status de conexão
- Tratamento de erros robusto

## Segurança

### Autenticação
- Utilização de chaves anônimas do Supabase
- Validação de dados no backend
- Sanitização de inputs

### Autorização
- Controle de acesso baseado em roles
- Validação de permissões por operação
- Logs de auditoria

## Roadmap e Expansibilidade

### Funcionalidades Planejadas
- Integração com feeds de vídeo em tempo real
- Sistema de notificações push
- Histórico de localizações com visualização temporal
- Filtros avançados para câmeras
- API pública para integração com outros sistemas

### Arquitetura Futura
- Separação em microserviços
- Implementação de cache distribuído
- Escalabilidade horizontal
- Integração com sistemas de IoT

## Contribuição

### Padrões de Código
- ESLint configurado para React
- Componentes funcionais com hooks
- Separação clara de responsabilidades
- Documentação inline

### Processo de Desenvolvimento
1. Fork do repositório
2. Criação de branch para feature
3. Implementação com testes
4. Pull request com documentação
5. Code review obrigatório

## Licença

Este projeto é privado e proprietário. Todos os direitos reservados.

## Contato

Para questões técnicas ou suporte, entre em contato através dos canais oficiais do projeto. 