# Guia de Teste: Correções dos Polígonos de Cobertura

## Resumo das Correções Implementadas

### Fase 1: Correção da Renderização dos Polígonos no Viewer ✅
- [x] Configuração da camada de cobertura separada com zIndex
- [x] Correção da projeção de coordenadas (EPSG:4326 ↔ EPSG:3857)
- [x] Melhoria do estilo dos polígonos (mais visível)
- [x] Adição de debug visual com logs detalhados

### Fase 2: Correção do CameraEditor ✅
- [x] Melhoria da interação de desenho com forma retangular
- [x] Correção da interação de modificação
- [x] Validação de dados antes de salvar
- [x] Tratamento de erros melhorado

### Fase 3: Integração do CameraLayer com Polígonos ✅
- [x] Adição de renderização de polígonos no CameraLayer
- [x] Carregamento de polígonos das câmeras
- [x] Separação de camadas (câmeras vs cobertura)

### Fase 4: Melhorias na Lógica de Detecção de Proximidade ✅
- [x] Implementação de detecção dentro do polígono
- [x] Atualização da lógica de proximidade
- [x] Priorização de câmeras com cobertura

## Como Testar as Correções

### 1. Teste de Renderização Básica

#### 1.1 Verificar Console Logs
1. Abra o navegador e acesse a aplicação
2. Abra o Console do navegador (F12)
3. Verifique se aparecem os logs:
   ```
   Fetching cameras...
   Cameras fetched: [array de câmeras]
   Processing camera: [nome] Coverage area: [dados]
   Feature created: [objeto]
   Feature geometry: [objeto]
   Feature geometry type: Polygon
   Added feature for camera: [nome]
   Total features in coverageSource: [número]
   ```

#### 1.2 Verificar Visualização dos Polígonos
1. No mapa, procure por áreas vermelhas (polígonos de cobertura)
2. Os polígonos devem ter:
   - Borda vermelha (rgba(255, 0, 0, 0.8))
   - Preenchimento vermelho claro (rgba(255, 0, 0, 0.2))
   - Largura de borda: 3px

### 2. Teste do CameraEditor

#### 2.1 Criar Nova Câmera com Polígono
1. Acesse `/edit-cameras`
2. Preencha os dados da câmera:
   - Nome: "Câmera Teste"
   - Latitude: -23.985111
   - Longitude: -46.308861
   - Link: "https://exemplo.com/imagem.jpg"
3. No mapa, clique e arraste para desenhar um retângulo
4. O polígono deve aparecer em azul durante o desenho
5. Clique em "Salvar Nova Câmera"
6. Verifique se não há erros no console

#### 2.2 Editar Câmera Existente
1. Clique em "Editar" em uma câmera existente
2. Verifique se o polígono aparece no mapa
3. Arraste os pontos do polígono para modificar
4. Salve as alterações
5. Verifique se as mudanças são refletidas no Viewer

### 3. Teste de Detecção de Proximidade

#### 3.1 Teste Dentro da Área de Cobertura
1. No Viewer, verifique se há câmeras com polígonos
2. Simule uma localização dentro de um polígono
3. Verifique se a câmera é exibida automaticamente
4. Console deve mostrar: "Location is in coverage area of camera: [nome]"

#### 3.2 Teste Fora da Área de Cobertura
1. Simule uma localização fora dos polígonos
2. Verifique se a lógica de proximidade por distância funciona
3. Console deve mostrar a distância calculada

### 4. Teste de Performance

#### 4.1 Múltiplas Câmeras
1. Crie várias câmeras com polígonos
2. Verifique se a performance não é afetada
3. Teste o zoom e pan do mapa

#### 4.2 Atualizações em Tempo Real
1. Modifique uma câmera no CameraEditor
2. Verifique se as mudanças aparecem no Viewer
3. Teste a sincronização entre as abas

## Problemas Comuns e Soluções

### Problema: Polígonos não aparecem
**Possíveis causas:**
- Dados GeoJSON inválidos no banco
- Erro na projeção de coordenadas
- Camada sobreposta por outras

**Soluções:**
1. Verificar console para erros
2. Validar formato dos dados no Supabase
3. Verificar se as coordenadas estão corretas

### Problema: Polígonos aparecem no lugar errado
**Possíveis causas:**
- Projeção de coordenadas incorreta
- Dados de latitude/longitude invertidos

**Soluções:**
1. Verificar se lat/lng estão corretos
2. Validar formato GeoJSON
3. Testar com coordenadas conhecidas

### Problema: Detecção de proximidade não funciona
**Possíveis causas:**
- Função `isLocationInCoverageArea` com erro
- Dados de localização inválidos

**Soluções:**
1. Verificar logs de debug
2. Testar com localização conhecida
3. Validar formato dos polígonos

## Critérios de Sucesso

### ✅ Funcional
- [ ] Polígonos são renderizados corretamente no mapa
- [ ] Novos polígonos podem ser criados no CameraEditor
- [ ] Polígonos existentes podem ser editados
- [ ] Detecção de proximidade considera áreas de cobertura
- [ ] Polígonos são salvos e carregados corretamente do Supabase

### ✅ Visual
- [ ] Polígonos são visíveis e distinguíveis
- [ ] Estilo é consistente e profissional
- [ ] Performance não é afetada significativamente
- [ ] Interface é intuitiva para criação/edição

### ✅ Técnico
- [ ] Código está limpo e documentado
- [ ] Não há memory leaks
- [ ] Tratamento de erros adequado
- [ ] Logs de debug para troubleshooting

## Próximos Passos

1. **Executar todos os testes** listados acima
2. **Documentar problemas encontrados** e suas soluções
3. **Otimizar performance** se necessário
4. **Atualizar documentação** do projeto
5. **Preparar para deploy** das correções

## Comandos Úteis para Debug

```bash
# Verificar se a aplicação está rodando
npm start

# Verificar build de produção
npm run build

# Verificar logs no console do navegador
# F12 → Console → Filtrar por "camera" ou "polygon"
``` 