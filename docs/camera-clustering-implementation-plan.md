# Plano de Implementação: Clusterização de Câmeras (Atualizado)

## Visão Geral
Implementar funcionalidade para agrupar câmeras próximas em clusters no mapa usando OpenLayers native clustering, permitindo visualização de múltiplas câmeras quando um cluster é clicado.

## Objetivos
- Agrupar câmeras dentro de um raio de 50 metros em um único marcador
- Mostrar o número de câmeras no cluster
- Ao clicar no cluster, abrir grid com todas as câmeras do grupo
- Manter funcionalidade individual para câmeras isoladas
- Implementação reversível e testável por etapas

---

## Etapa 1: Preparação e Estrutura Base
**Status:** ✅ Concluída (já temos a estrutura)

### 1.1 Verificar Componentes Existentes
- [x] CameraLayer (renderização de marcadores)
- [x] CameraGrid (exibição em grid)
- [x] CameraCard (card individual)
- [x] FullScreenManager (gerenciamento de tela cheia)
- [x] OpenLayers (ol) já instalado

### 1.2 Criar Branch de Desenvolvimento
```bash
git checkout -b feature/camera-clustering
```

---

## Etapa 2: Implementar Clusterização com OpenLayers
**Status:** 🔄 Próxima etapa

### 2.1 Atualizar CameraLayer com OpenLayers Clustering
**Arquivo:** `src/components/CameraLayer/index.js`

```javascript
import { useEffect, useRef, useMemo } from 'react';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ClusterSource from 'ol/source/Cluster'; // NOVO
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

const CameraLayer = ({ map, cameras, onCameraClick }) => {
  const cameraSourceRef = useRef(new VectorSource());
  const clusterSourceRef = useRef(null); // NOVO
  const coverageSourceRef = useRef(new VectorSource());
  const vectorLayerRef = useRef(null);
  const coverageLayerRef = useRef(null);

  // Criar ClusterSource
  useEffect(() => {
    clusterSourceRef.current = new ClusterSource({
      source: cameraSourceRef.current,
      distance: 50, // 50 metros
      geometryFunction: function(feature) {
        return feature.getGeometry();
      }
    });
  }, []);

  // ... resto do código
```

### 2.2 Atualizar Estilo dos Marcadores
```javascript
style: function (feature) {
  const features = feature.get('features');
  const size = features.length;
  
  if (size > 1) {
    // Estilo para cluster
    return [
      new Style({
        image: new CircleStyle({
          radius: 20,
          fill: new Fill({ color: '#ff4444' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      }),
      new Style({
        text: {
          text: size.toString(),
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color: '#000000', width: 1 }),
          font: 'bold 14px Arial'
        }
      })
    ];
  } else {
    // Estilo para câmera individual
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-video"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    const encodedSvg = encodeURIComponent(svgString);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    return [
      new Style({
        image: new CircleStyle({
          radius: 15,
          fill: new Fill({ color: 'white' }),
          stroke: new Stroke({ color: 'black', width: 1 })
        })
      }),
      new Style({
        image: new Icon({
          src: dataUrl,
          scale: 1,
          anchor: [0.5, 0.9],
        }),
      })
    ];
  }
}
```

### 2.3 Atualizar Click Handler
```javascript
const handleClick = (event) => {
  const feature = map.forEachFeatureAtPixel(event.pixel, (feat, layer) => {
    if (layer === vectorLayerRef.current) return feat;
    return undefined;
  });
  
  if (feature && onCameraClick) {
    const features = feature.get('features');
    if (features && features.length > 0) {
      const cameras = features.map(f => f.get('camera'));
      onCameraClick(cameras);
    }
  }
};
```

**Reversão:** Fazer commit antes desta etapa e usar `git revert` se necessário

---

## Etapa 3: Atualizar CameraGrid para Suportar Múltiplas Câmeras
**Status:** ⏳ Pendente

### 3.1 Modificar CameraGrid para Aceitar Array de Câmeras
**Arquivo:** `src/components/CameraGrid/index.js`

```javascript
const CameraGrid = ({ cameras, onClose }) => {
  // cameras agora pode ser um array de câmeras
  const cameraArray = Array.isArray(cameras) ? cameras : [cameras];
  
  return (
    <div className="camera-grid-overlay">
      <div className="camera-grid-container">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        <div className="camera-grid">
          {cameraArray.map((camera, index) => (
            <CameraCard 
              key={`${camera.id || camera.name}-${index}`}
              camera={camera}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 3.2 Atualizar CSS para Grid Responsivo
```css
.camera-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.camera-grid-container {
  max-height: 90vh;
  overflow-y: auto;
}
```

**Reversão:** Manter versão anterior do componente

---

## Etapa 4: Atualizar Componentes Pais
**Status:** ⏳ Pendente

### 4.1 Atualizar Viewer Component
**Arquivo:** `src/components/Viewer/index.js`

```javascript
const Viewer = ({ cameras, onClose }) => {
  // cameras agora pode ser array ou câmera única
  const isMultiple = Array.isArray(cameras) && cameras.length > 1;
  
  return (
    <div className="viewer-overlay">
      {isMultiple ? (
        <CameraGrid cameras={cameras} onClose={onClose} />
      ) : (
        <FullScreenManager 
          camera={Array.isArray(cameras) ? cameras[0] : cameras} 
          onClose={onClose} 
        />
      )}
    </div>
  );
};
```

### 4.2 Atualizar App.js
```javascript
const handleCameraClick = (cameras) => {
  setSelectedCameras(cameras);
  setShowViewer(true);
};
```

**Reversão:** Fazer commit antes desta etapa

---

## Etapa 5: Testes e Validação
**Status:** ⏳ Pendente

### 5.1 Testes Manuais
- [ ] Verificar se câmeras próximas são agrupadas
- [ ] Verificar se câmeras isoladas mantêm marcador individual
- [ ] Testar clique em cluster (deve abrir grid)
- [ ] Testar clique em câmera individual (deve abrir tela cheia)
- [ ] Verificar responsividade do grid

### 5.2 Testes de Performance
- [ ] Verificar se não há lag com muitas câmeras
- [ ] Testar com diferentes distâncias de agrupamento
- [ ] Verificar uso de memória

### 5.3 Testes de Edge Cases
- [ ] Câmeras com coordenadas idênticas
- [ ] Câmeras muito próximas (1-2 metros)
- [ ] Câmeras muito distantes
- [ ] Câmeras sem coordenadas

---

## Etapa 6: Configuração e Personalização
**Status:** ⏳ Pendente

### 6.1 Adicionar Configuração de Distância
**Arquivo:** `src/config/camera.js`

```javascript
export const CLUSTER_CONFIG = {
  distance: 50, // metros
  maxClusterSize: 10, // máximo de câmeras por cluster
  enableClustering: true
};
```

### 6.2 Adicionar Toggle para Clusterização
```javascript
const [enableClustering, setEnableClustering] = useState(true);

// No componente de configurações
<label>
  <input 
    type="checkbox" 
    checked={enableClustering} 
    onChange={(e) => setEnableClustering(e.target.checked)} 
  />
  Agrupar câmeras próximas
</label>
```

---

## Etapa 7: Deploy e Monitoramento
**Status:** ⏳ Pendente

### 7.1 Deploy Gradual
```bash
# Fazer commit final
git add .
git commit -m "Implement camera clustering with OpenLayers"

# Deploy
npm run build
npm run deploy
```

### 7.2 Monitoramento
- [ ] Verificar logs de erro no console
- [ ] Monitorar performance
- [ ] Coletar feedback dos usuários

---

## Pontos de Reversão

### Reversão Rápida (Etapa 2)
```bash
git revert HEAD~1  # Reverte última mudança
npm run build && npm run deploy
```

### Reversão Completa
```bash
git checkout main
git branch -D feature/camera-clustering
```

### Reversão Seletiva
```bash
git checkout HEAD~1 -- src/components/CameraLayer/index.js
git checkout HEAD~1 -- src/components/CameraGrid/index.js
```

---

## Cronograma Estimado

- **Etapa 1:** ✅ Concluída
- **Etapa 2:** 2-3 horas (OpenLayers clustering)
- **Etapa 3:** 1-2 horas
- **Etapa 4:** 1 hora
- **Etapa 5:** 2-3 horas
- **Etapa 6:** 1-2 horas
- **Etapa 7:** 30 minutos

**Total estimado:** 7-11 horas

---

## Vantagens do OpenLayers Clustering

### ✅ **Vantagens:**
1. **Performance otimizada** - algoritmo nativo do OpenLayers
2. **Menos código** - não precisamos implementar do zero
3. **Mais robusto** - testado e usado em produção
4. **Configurável** - fácil ajustar distância e comportamento
5. **Integração perfeita** - funciona nativamente com o mapa

### 🔧 **Funcionalidades:**
- Agrupamento automático baseado em distância
- Estilo personalizável para clusters e câmeras individuais
- Click handler que retorna todas as features do cluster
- Performance otimizada para grandes quantidades de dados

---

## Riscos e Mitigações

### Riscos
1. **Configuração complexa** do OpenLayers clustering
2. **Compatibilidade** com código existente
3. **Performance** com muitas câmeras

### Mitigações
1. **Implementação gradual** com testes em cada etapa
2. **Documentação** do OpenLayers clustering
3. **Fallback** para comportamento individual se houver problemas
4. **Commits frequentes** para facilitar reversão

---

## Critérios de Sucesso

- [ ] Câmeras próximas são agrupadas visualmente
- [ ] Clique em cluster abre grid com todas as câmeras
- [ ] Câmeras isoladas mantêm comportamento individual
- [ ] Performance não degrada significativamente
- [ ] Interface responsiva em diferentes tamanhos de tela
- [ ] Funcionalidade pode ser desabilitada se necessário 