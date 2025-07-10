# Plano de Correção: Lógica dos Polígonos de Cobertura das Câmeras

## Problema Identificado

Os polígonos de cobertura das câmeras não estão funcionando corretamente. Estes polígonos são essenciais pois representam o campo de visão das câmeras e são fundamentais para:
- Visualizar a área de monitoramento de cada câmera
- Determinar se o Heric está dentro do campo de visão de uma câmera
- Melhorar a experiência do usuário mostrando claramente onde cada câmera pode "ver"

## Análise dos Problemas Atuais

### 1. Problemas no Viewer (src/components/Viewer/index.js)

#### Problema Principal: Renderização dos Polígonos
- **Linha 160-175**: Os polígonos são carregados do Supabase mas podem não estar sendo renderizados corretamente
- **Problema**: O `coverageSource` é criado mas pode não estar sendo adicionado ao mapa adequadamente
- **Verificação**: Console logs mostram que features são adicionadas mas não aparecem visualmente

#### Problemas Específicos:
1. **Projeção de Coordenadas**: Possível problema na conversão entre EPSG:4326 e EPSG:3857
2. **Estilo dos Polígonos**: O estilo `coverageStyle` pode não estar sendo aplicado corretamente
3. **Ordem das Camadas**: A camada de cobertura pode estar sendo sobreposta por outras camadas
4. **Limpeza de Features**: Possível problema na limpeza e recriação das features

### 2. Problemas no CameraEditor (src/components/CameraEditor/index.js)

#### Problema Principal: Criação e Edição de Polígonos
- **Linha 60-90**: Lógica de desenho de polígonos pode ter problemas
- **Problema**: Interações de desenho e modificação podem não estar funcionando corretamente
- **Verificação**: Polígonos desenhados podem não ser salvos ou exibidos corretamente

#### Problemas Específicos:
1. **Interação de Desenho**: O `Draw` interaction pode não estar configurado corretamente
2. **Interação de Modificação**: O `Modify` interaction pode ter problemas de sincronização
3. **Conversão GeoJSON**: Problemas na conversão entre OpenLayers Feature e GeoJSON
4. **Persistência**: Polígonos podem não estar sendo salvos corretamente no Supabase

### 3. Problemas no CameraLayer (src/components/CameraLayer/index.js)

#### Problema Principal: Falta de Integração com Polígonos
- **Problema**: O CameraLayer não renderiza os polígonos de cobertura
- **Verificação**: O componente só renderiza ícones de câmeras, não as áreas de cobertura

## Plano de Correção

### Fase 1: Correção da Renderização dos Polígonos no Viewer

#### 1.1 Verificar Configuração da Camada de Cobertura
```javascript
// Corrigir a criação da camada de cobertura
const coverageLayer = new VectorLayer({
  source: coverageSource.current,
  style: coverageStyle,
  zIndex: 1 // Garantir que fique acima do mapa base
});
```

#### 1.2 Corrigir Projeção de Coordenadas
```javascript
// Verificar se a conversão está correta
const feature = geoJsonFormat.readFeature(camera.coverage_area, {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
});
```

#### 1.3 Melhorar Estilo dos Polígonos
```javascript
const coverageStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 0, 0, 0.8)',
    width: 3,
  }),
  fill: new Fill({
    color: 'rgba(255, 0, 0, 0.2)',
  }),
});
```

#### 1.4 Adicionar Debug Visual
```javascript
// Adicionar logs para debug
console.log('Coverage area data:', camera.coverage_area);
console.log('Feature created:', feature);
console.log('Feature geometry:', feature.getGeometry());
```

### Fase 2: Correção do CameraEditor

#### 2.1 Melhorar Interação de Desenho
```javascript
// Configurar corretamente a interação de desenho
drawInteraction.current = new Draw({
  source: drawSource.current,
  type: 'Polygon',
  style: drawStyle,
  maxPoints: 4, // Limitar a 4 pontos para retângulo
  geometryFunction: Draw.createRegularPolygon(4), // Forçar forma retangular
});
```

#### 2.2 Corrigir Interação de Modificação
```javascript
// Melhorar sincronização da modificação
modifyInteraction.current.on('modifyend', (modifyEvent) => {
  const modifiedFeature = modifyEvent.features.getArray()[0];
  const modifiedGeoJson = geoJsonFormat.current.writeFeatureObject(modifiedFeature, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  setDrawnFeature(modifiedGeoJson);
});
```

#### 2.3 Validar Dados Antes de Salvar
```javascript
// Adicionar validação
const handleSaveCamera = async () => {
  if (!drawnFeature) {
    alert('Por favor, desenhe a área de cobertura da câmera no mapa.');
    return;
  }
  
  // Validar se o GeoJSON é válido
  try {
    const testFeature = geoJsonFormat.current.readFeature(drawnFeature);
    if (!testFeature.getGeometry()) {
      throw new Error('Geometria inválida');
    }
  } catch (error) {
    alert('Área de cobertura inválida. Por favor, desenhe novamente.');
    return;
  }
  
  // Continuar com o salvamento...
};
```

### Fase 3: Integração do CameraLayer com Polígonos

#### 3.1 Adicionar Renderização de Polígonos no CameraLayer
```javascript
// Modificar CameraLayer para incluir polígonos
const CameraLayer = ({ map, cameras, onCameraClick }) => {
  const cameraSourceRef = useRef(new VectorSource());
  const coverageSourceRef = useRef(new VectorSource());
  
  // Renderizar polígonos de cobertura
  useEffect(() => {
    if (!map) return;
    
    const coverageLayer = new VectorLayer({
      source: coverageSourceRef.current,
      style: coverageStyle,
      zIndex: 1,
    });
    
    map.addLayer(coverageLayer);
    
    return () => {
      map.removeLayer(coverageLayer);
    };
  }, [map]);
  
  // Carregar polígonos das câmeras
  useEffect(() => {
    coverageSourceRef.current.clear();
    cameras.forEach(camera => {
      if (camera.coverage_area) {
        const feature = geoJsonFormat.readFeature(camera.coverage_area, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        coverageSourceRef.current.addFeature(feature);
      }
    });
  }, [cameras]);
};
```

### Fase 4: Melhorias na Lógica de Detecção de Proximidade

#### 4.1 Implementar Detecção Dentro do Polígono
```javascript
// Verificar se a localização está dentro da área de cobertura
const isLocationInCoverageArea = (location, camera) => {
  if (!camera.coverage_area) return false;
  
  const feature = geoJsonFormat.readFeature(camera.coverage_area, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  const point = new Point(fromLonLat([location.lng, location.lat]));
  return feature.getGeometry().intersectsCoordinate(point.getCoordinates());
};
```

#### 4.2 Atualizar Lógica de Proximidade
```javascript
// Modificar a lógica de proximidade para considerar polígonos
useEffect(() => {
  if (location) {
    let closestCamera = null;
    let minDistance = Infinity;
    let isInCoverageArea = false;

    cameras.forEach(camera => {
      // Verificar se está dentro da área de cobertura
      if (isLocationInCoverageArea(location, camera)) {
        isInCoverageArea = true;
        closestCamera = camera;
        minDistance = 0; // Prioridade para câmeras com cobertura
      } else {
        // Calcular distância apenas se não estiver em área de cobertura
        const distance = calculateDistance(
          location.lat,
          location.lng,
          camera.lat,
          camera.lng
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestCamera = camera;
        }
      }
    });

    // Lógica de exibição baseada em proximidade ou cobertura
    if (closestCamera && (isInCoverageArea || minDistance <= PROXIMITY_THRESHOLD)) {
      // Mostrar câmera
    }
  }
}, [location, cameras]);
```

## Implementação das Correções

### Passo 1: Testar Renderização Básica
1. Verificar se os polígonos existentes no banco estão sendo carregados
2. Adicionar logs de debug para identificar onde está o problema
3. Testar com um polígono simples (retângulo) para validar a renderização

### Passo 2: Corrigir CameraEditor
1. Implementar as correções na interação de desenho
2. Testar criação de novos polígonos
3. Validar salvamento no Supabase

### Passo 3: Integrar CameraLayer
1. Modificar CameraLayer para renderizar polígonos
2. Testar visualização das áreas de cobertura
3. Implementar lógica de detecção dentro do polígono

### Passo 4: Testes e Validação
1. Testar com diferentes formas de polígonos
2. Validar performance com múltiplas câmeras
3. Testar em diferentes dispositivos e navegadores

## Critérios de Sucesso

### Funcional
- [ ] Polígonos são renderizados corretamente no mapa
- [ ] Novos polígonos podem ser criados no CameraEditor
- [ ] Polígonos existentes podem ser editados
- [ ] Detecção de proximidade considera áreas de cobertura
- [ ] Polígonos são salvos e carregados corretamente do Supabase

### Visual
- [ ] Polígonos são visíveis e distinguíveis
- [ ] Estilo é consistente e profissional
- [ ] Performance não é afetada significativamente
- [ ] Interface é intuitiva para criação/edição

### Técnico
- [ ] Código está limpo e documentado
- [ ] Não há memory leaks
- [ ] Tratamento de erros adequado
- [ ] Logs de debug para troubleshooting

## Próximos Passos

1. **Implementar correções do Viewer** (Fase 1)
2. **Corrigir CameraEditor** (Fase 2)
3. **Integrar CameraLayer** (Fase 3)
4. **Testar e validar** (Fase 4)
5. **Documentar mudanças** e atualizar README

## Recursos Necessários

- Acesso ao banco Supabase para verificar dados existentes
- Tempo para implementação e testes
- Possível necessidade de dados de teste (polígonos válidos)
- Documentação das mudanças para outros desenvolvedores 