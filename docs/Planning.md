# Planning: Transição para Grid de Câmeras Simultâneas

## Visão Geral da Mudança

### Estado Atual (Problema)
- Sistema **impõe** uma câmera ao usuário automaticamente
- Usuário tem que navegar entre câmeras sequencialmente
- Experiência controlada pelo sistema, não pelo usuário
- Interface de tela cheia única

### Estado Desejado (Solução)
- Sistema **sugere** todas as câmeras relevantes simultaneamente
- Usuário vê todas as câmeras em um grid responsivo
- Controle total do usuário sobre quais câmeras manter
- Interface de múltiplas câmeras em grid

## Fases da Transição

### Fase 1: Arquitetura Base (Semana 1)
**Objetivo**: Criar a estrutura fundamental para múltiplas câmeras simultâneas

#### 1.1 Novo Componente: CameraGrid
```javascript
// src/components/CameraGrid/index.js
- Grid responsivo para múltiplas câmeras
- Layout adaptativo (mobile: vertical, desktop: grid)
- Gerenciamento de estado de câmeras ativas
- Controles individuais para cada câmera
```

#### 1.2 Estados Globais Reestruturados
```javascript
// src/components/Viewer/index.js
- Remover: showFullScreenImage, fullScreenImageUrl, fullScreenImageTitle
- Adicionar: activeCameras (array de câmeras ativas)
- Adicionar: cameraGridVisible (boolean)
- Manter: closedCameras (Set de IDs fechados pelo usuário)
```

#### 1.3 Lógica de Detecção Simplificada
```javascript
// Detectar todas as câmeras relevantes sem imposição
const detectRelevantCameras = (location, cameras) => {
  return cameras.filter(camera => {
    if (isCameraClosedByUser(camera.id)) return false;
    return isLocationInCoverageArea(location, camera) || 
           calculateDistance(location, camera) <= PROXIMITY_THRESHOLD;
  });
};
```

### Fase 2: Interface do Grid (Semana 1-2)
**Objetivo**: Criar interface responsiva e intuitiva

#### 2.1 Layout Responsivo
```css
/* Mobile (vertical) */
.camera-grid-mobile {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

/* Desktop (grid) */
.camera-grid-desktop {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
  padding: 1rem;
}
```

#### 2.2 Componente CameraCard
```javascript
// src/components/CameraCard/index.js
- Container individual para cada câmera
- Controles: fechar, expandir, configurações
- Indicadores: status, qualidade, nome
- Responsivo: adapta tamanho conforme dispositivo
```

#### 2.3 Controles de Grid
```javascript
// Controles globais do grid
- Botão para fechar todas as câmeras
- Botão para reabrir câmeras fechadas
- Botão para expandir/colapsar grid
- Indicador de quantidade de câmeras ativas
```

### Fase 3: Integração com Viewer (Semana 2)
**Objetivo**: Integrar o grid na página principal

#### 3.1 Modificação do Viewer
```javascript
// src/components/Viewer/index.js
- Remover lógica de imposição de câmera
- Integrar CameraGrid como overlay/modal
- Manter mapa como background
- Adicionar transições suaves
```

#### 3.2 Estados de Transição
```javascript
// Estados para transições suaves
- cameraGridVisible: boolean
- cameraGridAnimating: boolean
- cameraGridPosition: 'minimized' | 'expanded' | 'fullscreen'
```

#### 3.3 Integração com Mapa
```javascript
// Manter mapa visível como contexto
- Grid aparece como overlay sobre o mapa
- Mapa permanece interativo quando grid está minimizado
- Transições suaves entre estados
```

### Fase 4: Funcionalidades Avançadas (Semana 3)
**Objetivo**: Adicionar recursos avançados de controle

#### 4.1 Controles Individuais
```javascript
// Por câmera
- Botão fechar individual
- Botão expandir/colapsar
- Botão configurações (qualidade, visão noturna)
- Botão download de imagem
```

#### 4.2 Controles Globais
```javascript
// Para todo o grid
- Fechar todas as câmeras
- Reabrir câmeras fechadas
- Expandir/colapsar grid
- Modo tela cheia para grid
- Configurações globais
```

#### 4.3 Persistência de Preferências
```javascript
// Salvar preferências do usuário
- Câmeras fechadas (localStorage)
- Layout preferido (grid/vertical)
- Configurações de qualidade
- Posição do grid
```

### Fase 5: Otimização e Polimento (Semana 4)
**Objetivo**: Refinamento e otimização

#### 5.1 Performance
```javascript
// Otimizações
- Lazy loading de câmeras
- Virtualização para muitas câmeras
- Debounce em atualizações de posição
- Cache de imagens
```

#### 5.2 UX/UI
```javascript
// Melhorias de experiência
- Animações suaves
- Feedback visual claro
- Estados de loading
- Tratamento de erros
- Acessibilidade
```

#### 5.3 Responsividade
```javascript
// Adaptação perfeita
- Breakpoints bem definidos
- Layout otimizado para cada dispositivo
- Controles adaptativos
- Performance em dispositivos móveis
```

## Estrutura de Arquivos

### Novos Componentes
```
src/
├── components/
│   ├── CameraGrid/
│   │   ├── index.js
│   │   ├── styles.css
│   │   └── CameraCard.js
│   ├── CameraCard/
│   │   ├── index.js
│   │   ├── styles.css
│   │   └── Controls.js
│   └── CameraControls/
│       ├── index.js
│       ├── styles.css
│       └── GlobalControls.js
```

### Modificações
```
src/
├── components/
│   ├── Viewer/
│   │   ├── index.js (modificado)
│   │   └── styles.css (modificado)
│   └── FullScreenImage/ (deprecated)
```

## Detalhamento Técnico

### 1. CameraGrid Component

#### Props
```javascript
CameraGrid.propTypes = {
  cameras: PropTypes.array.isRequired,
  visible: PropTypes.bool.isRequired,
  onCloseCamera: PropTypes.func.isRequired,
  onCloseAll: PropTypes.func.isRequired,
  onReopenAll: PropTypes.func.isRequired,
  position: PropTypes.oneOf(['minimized', 'expanded', 'fullscreen']),
  onPositionChange: PropTypes.func.isRequired
};
```

#### Estados
```javascript
const [gridPosition, setGridPosition] = useState('expanded');
const [animating, setAnimating] = useState(false);
const [layout, setLayout] = useState('grid'); // 'grid' | 'vertical'
```

#### Layout Responsivo
```javascript
// Hook para detectar layout
const useLayout = () => {
  const [layout, setLayout] = useState('grid');
  
  useEffect(() => {
    const handleResize = () => {
      setLayout(window.innerWidth < 768 ? 'vertical' : 'grid');
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return layout;
};
```

### 2. CameraCard Component

#### Props
```javascript
CameraCard.propTypes = {
  camera: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onExpand: PropTypes.func.isRequired,
  onSettings: PropTypes.func.isRequired,
  expanded: PropTypes.bool,
  quality: PropTypes.string
};
```

#### Funcionalidades
```javascript
// Controles individuais
- Fechar câmera
- Expandir/colapsar
- Configurações de qualidade
- Visão noturna
- Download de imagem
- Atualizar imagem
```

### 3. Integração com Viewer

#### Remoção de Estados
```javascript
// Remover estes estados
const [showFullScreenImage, setShowFullScreenImage] = useState(false);
const [fullScreenImageUrl, setFullScreenImageUrl] = useState('');
const [fullScreenImageTitle, setFullScreenImageTitle] = useState('');
const [currentProximityCameraId, setCurrentProximityCameraId] = useState(null);
```

#### Novos Estados
```javascript
// Adicionar estes estados
const [cameraGridVisible, setCameraGridVisible] = useState(false);
const [cameraGridPosition, setCameraGridPosition] = useState('expanded');
const [activeCameras, setActiveCameras] = useState([]);
```

#### Lógica Simplificada
```javascript
// Substituir lógica de proximidade
useEffect(() => {
  if (location) {
    const relevantCameras = detectRelevantCameras(location, cameras);
    
    if (relevantCameras.length > 0) {
      setActiveCameras(relevantCameras);
      setCameraGridVisible(true);
    } else {
      setActiveCameras([]);
      setCameraGridVisible(false);
    }
  }
}, [location, cameras, closedCameras]);
```

## Cronograma Detalhado

### Semana 1: Fundação
- **Dia 1-2**: Criar CameraGrid component base
- **Dia 3-4**: Implementar layout responsivo
- **Dia 5**: Criar CameraCard component

### Semana 2: Integração
- **Dia 1-2**: Modificar Viewer para usar grid
- **Dia 3-4**: Integrar controles e estados
- **Dia 5**: Testar integração básica

### Semana 3: Funcionalidades
- **Dia 1-2**: Implementar controles individuais
- **Dia 3-4**: Adicionar controles globais
- **Dia 5**: Implementar persistência

### Semana 4: Polimento
- **Dia 1-2**: Otimizar performance
- **Dia 3-4**: Melhorar UX/UI
- **Dia 5**: Testes finais e ajustes

## Riscos e Mitigações

### Riscos Técnicos
1. **Performance com muitas câmeras**
   - Mitigação: Implementar virtualização e lazy loading

2. **Complexidade de estado**
   - Mitigação: Usar Context API ou Redux para gerenciamento centralizado

3. **Responsividade em dispositivos móveis**
   - Mitigação: Testar extensivamente em diferentes dispositivos

### Riscos de UX
1. **Sobrecarga de informação**
   - Mitigação: Layout limpo e controles intuitivos

2. **Curva de aprendizado**
   - Mitigação: Interface familiar com controles claros

3. **Performance visual**
   - Mitigação: Animações suaves e feedback visual

## Critérios de Sucesso

### Funcionais
- [ ] Grid mostra todas as câmeras relevantes simultaneamente
- [ ] Usuário pode fechar câmeras individuais
- [ ] Layout responsivo funciona em mobile e desktop
- [ ] Controles globais funcionam corretamente
- [ ] Persistência de preferências funciona

### Técnicos
- [ ] Performance aceitável com até 10 câmeras simultâneas
- [ ] Código limpo e bem documentado
- [ ] Testes cobrem casos principais
- [ ] Acessibilidade implementada

### UX
- [ ] Interface intuitiva e fácil de usar
- [ ] Transições suaves e responsivas
- [ ] Feedback visual claro para todas as ações
- [ ] Funciona bem em dispositivos móveis

## Próximos Passos

1. **Aprovação do plano** pelo usuário
2. **Início da Fase 1** - Arquitetura Base
3. **Criação dos componentes** fundamentais
4. **Implementação gradual** seguindo o cronograma
5. **Testes contínuos** durante o desenvolvimento 