# Funcionalidade: Múltiplas Câmeras Simultâneas

## Visão Geral

O sistema agora suporta a exibição de múltiplas câmeras quando o Heric está na área de cobertura de várias câmeras simultaneamente. Isso permite uma visualização mais completa do ambiente quando há sobreposição de áreas de monitoramento.

## Funcionalidades Implementadas

### 1. Detecção de Múltiplas Câmeras na Área de Cobertura

#### Lógica de Detecção
```javascript
// Verificar todas as câmeras na área de cobertura
let camerasInCoverageArea = [];

cameras.forEach(camera => {
  if (isLocationInCoverageArea(location, camera)) {
    camerasInCoverageArea.push(camera);
  }
});
```

#### Priorização
1. **Câmeras com Cobertura**: Prioridade para câmeras onde o Heric está dentro da área de cobertura
2. **Câmera Mais Próxima**: Fallback para a câmera mais próxima por distância se não houver cobertura

### 2. Interface de Navegação Entre Câmeras

#### Controles de Navegação
- **Botão Anterior**: Navega para a câmera anterior na lista
- **Botão Próximo**: Navega para a próxima câmera na lista
- **Swipe em Mobile**: Deslizar para esquerda/direita para navegar
- **Indicador de Posição**: Mostra "Câmera X (Y de Z)" no título

#### Exemplo de Título
```
Câmera Central (1 de 3)  // Primeira câmera de 3 ativas
Câmera Norte (2 de 3)    // Segunda câmera de 3 ativas
Câmera Sul (3 de 3)      // Terceira câmera de 3 ativas
```

### 3. Estados do Sistema

#### Estados Adicionados
```javascript
const [activeCameras, setActiveCameras] = useState([]); // Lista de câmeras ativas
```

#### Gerenciamento de Estado
- **Ativação**: Quando detecta múltiplas câmeras na área de cobertura
- **Navegação**: Atualiza câmera atual mantendo a lista completa
- **Limpeza**: Remove todas as câmeras ativas ao sair da área

## Fluxo de Funcionamento

### 1. Detecção Inicial
```
Heric entra na área de cobertura de múltiplas câmeras
↓
Sistema detecta todas as câmeras com cobertura
↓
Mostra a primeira câmera com indicador "1 de N"
↓
Armazena lista completa de câmeras ativas
```

### 2. Navegação
```
Usuário clica em "Próximo" ou desliza para direita
↓
Sistema navega para próxima câmera na lista
↓
Atualiza título para "Câmera X (Y de N)"
↓
Mantém lista de câmeras ativas
```

### 3. Saída da Área
```
Heric sai da área de cobertura de todas as câmeras
↓
Sistema fecha visualização em tela cheia
↓
Limpa lista de câmeras ativas
↓
Retorna ao estado inicial
```

## Implementação Técnica

### 1. Componente Viewer

#### Novas Funções
```javascript
// Abrir múltiplas câmeras
const handleOpenMultipleCameras = useCallback((cameras) => {
  if (cameras.length === 1) {
    handleOpenFullScreenImage(cameras[0].link, cameras[0].name);
  } else {
    handleOpenFullScreenImage(cameras[0].link, `${cameras[0].name} (1 de ${cameras.length})`);
    setActiveCameras(cameras);
  }
}, [handleOpenFullScreenImage]);

// Navegar para próxima câmera
const handleNextCamera = useCallback(() => {
  if (activeCameras.length > 1) {
    const currentIndex = activeCameras.findIndex(cam => cam.link === fullScreenImageUrl);
    const nextIndex = (currentIndex + 1) % activeCameras.length;
    const nextCamera = activeCameras[nextIndex];
    setFullScreenImageUrl(nextCamera.link);
    setFullScreenImageTitle(`${nextCamera.name} (${nextIndex + 1} de ${activeCameras.length})`);
  }
}, [activeCameras, fullScreenImageUrl]);

// Navegar para câmera anterior
const handlePreviousCamera = useCallback(() => {
  if (activeCameras.length > 1) {
    const currentIndex = activeCameras.findIndex(cam => cam.link === fullScreenImageUrl);
    const prevIndex = (currentIndex - 1 + activeCameras.length) % activeCameras.length;
    const prevCamera = activeCameras[prevIndex];
    setFullScreenImageUrl(prevCamera.link);
    setFullScreenImageTitle(`${prevCamera.name} (${prevIndex + 1} de ${activeCameras.length})`);
  }
}, [activeCameras, fullScreenImageUrl]);
```

### 2. Componente FullScreenImage

#### Props Atualizadas
```javascript
function FullScreenImage({ imageUrl, close, title, next, previous }) {
  // next: função para navegar para próxima câmera
  // previous: função para navegar para câmera anterior
}
```

#### Navegação por Toque
```javascript
const handleTouchEnd = useCallback(() => {
  if (!touchStartX.current || !touchEndX.current) return;
  
  const difference = touchStartX.current - touchEndX.current;
  const minSwipeDistance = 50;
  
  if (difference > minSwipeDistance && next) {
    next(); // Próxima câmera
  } else if (difference < -minSwipeDistance && previous) {
    previous(); // Câmera anterior
  }
}, [previous, next]);
```

## Casos de Uso

### 1. Câmera Única
- **Comportamento**: Funciona como antes
- **Interface**: Sem botões de navegação
- **Título**: Nome da câmera apenas

### 2. Múltiplas Câmeras
- **Comportamento**: Mostra primeira câmera com navegação
- **Interface**: Botões anterior/próximo visíveis
- **Título**: "Câmera X (Y de N)"

### 3. Transição Entre Estados
- **Entrada**: Heric entra na área de múltiplas câmeras
- **Saída**: Heric sai da área de todas as câmeras
- **Mudança**: Heric muda de uma área para outra

## Vantagens da Implementação

### ✅ Experiência do Usuário
- **Visão Completa**: Vê todas as câmeras relevantes
- **Navegação Intuitiva**: Controles claros e responsivos
- **Feedback Visual**: Indicadores de posição na lista

### ✅ Funcionalidade
- **Detecção Precisa**: Identifica todas as câmeras na área
- **Navegação Fluida**: Transições suaves entre câmeras
- **Estado Consistente**: Mantém contexto durante navegação

### ✅ Performance
- **Carregamento Eficiente**: Só carrega câmeras necessárias
- **Memória Otimizada**: Limpa estados quando não necessário
- **Responsividade**: Interface responsiva em diferentes dispositivos

## Testes Recomendados

### 1. Teste de Detecção
- [ ] Heric em área de uma câmera
- [ ] Heric em área de múltiplas câmeras
- [ ] Heric em área sem câmeras (fallback por distância)

### 2. Teste de Navegação
- [ ] Navegar entre múltiplas câmeras
- [ ] Navegação circular (última → primeira)
- [ ] Navegação por toque em mobile

### 3. Teste de Transições
- [ ] Entrar em área de múltiplas câmeras
- [ ] Sair de área de todas as câmeras
- [ ] Mudar de uma área para outra

### 4. Teste de Interface
- [ ] Botões de navegação aparecem/desaparecem
- [ ] Títulos são atualizados corretamente
- [ ] Indicadores de posição são precisos

## Próximos Passos

1. **Testar funcionalidade** com diferentes cenários
2. **Otimizar performance** se necessário
3. **Adicionar animações** de transição
4. **Considerar layout em grid** para múltiplas câmeras
5. **Implementar modo picture-in-picture** para comparação simultânea 