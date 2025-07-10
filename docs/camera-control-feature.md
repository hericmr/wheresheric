# Funcionalidade: Controle de Câmeras pelo Usuário

## Visão Geral

O sistema agora permite que o usuário tenha controle total sobre quais câmeras estão ativas, podendo fechar câmeras específicas a qualquer momento e reabrir todas as câmeras fechadas quando desejar.

## Funcionalidades Implementadas

### 1. Fechar Câmeras Específicas

#### Botão "Fechar" Individual
- **Localização**: Menu inferior da visualização em tela cheia
- **Visibilidade**: Aparece apenas quando há múltiplas câmeras ativas
- **Funcionalidade**: Fecha apenas a câmera atual sendo exibida

#### Menu de Câmeras
- **Acesso**: Botão "Câmeras" no menu inferior
- **Funcionalidade**: Lista todas as câmeras ativas com opção de fechar individualmente
- **Interface**: 
  - Mostra nome da câmera e posição na lista
  - Indica qual câmera está sendo exibida atualmente
  - Botão vermelho para fechar cada câmera específica

### 2. Reabrir Câmeras Fechadas

#### Botão "Reabrir"
- **Localização**: Menu inferior da visualização em tela cheia
- **Funcionalidade**: Reabre todas as câmeras que foram fechadas pelo usuário
- **Visibilidade**: Sempre disponível

#### Reabertura Automática
- **Condição**: Quando o usuário sai completamente da área de câmeras
- **Comportamento**: Limpa automaticamente a lista de câmeras fechadas
- **Benefício**: Reset automático para próxima entrada na área

### 3. Navegação Inteligente

#### Navegação Após Fechar Câmera
- **Cenário 1**: Se fechar a câmera atual e ainda há outras disponíveis
  - **Ação**: Navega automaticamente para a próxima câmera disponível
  - **Atualização**: Título é atualizado com nova posição

- **Cenário 2**: Se fechar a câmera atual e não há outras disponíveis
  - **Ação**: Fecha completamente a visualização em tela cheia
  - **Reset**: Limpa todos os estados

#### Atualização de Títulos
- **Formato**: "Nome da Câmera (X de Y)"
- **Atualização**: Reflete automaticamente a nova quantidade de câmeras ativas
- **Exemplo**: "Câmera Central (1 de 2)" após fechar uma câmera

## Implementação Técnica

### 1. Estados Adicionados

```javascript
const [closedCameras, setClosedCameras] = useState(new Set()); // Câmeras fechadas pelo usuário
```

### 2. Funções Principais

#### Fechar Câmera Específica
```javascript
const handleCloseSpecificCamera = useCallback((cameraId) => {
  setClosedCameras(prev => new Set([...prev, cameraId]));
  
  // Lógica de navegação após fechar
  if (activeCameras.length > 0) {
    const currentCamera = activeCameras.find(cam => cam.id === cameraId);
    if (currentCamera && currentCamera.link === fullScreenImageUrl) {
      const remainingCameras = activeCameras.filter(cam => cam.id !== cameraId);
      
      if (remainingCameras.length > 0) {
        // Navegar para próxima câmera
        const nextCamera = remainingCameras[0];
        setFullScreenImageUrl(nextCamera.link);
        setFullScreenImageTitle(`${nextCamera.name} (1 de ${remainingCameras.length})`);
        setActiveCameras(remainingCameras);
      } else {
        // Fechar tudo
        handleCloseFullScreenImage();
      }
    }
  }
}, [activeCameras, fullScreenImageUrl, handleCloseFullScreenImage]);
```

#### Reabrir Todas as Câmeras
```javascript
const handleReopenAllCameras = useCallback(() => {
  setClosedCameras(new Set());
}, []);
```

#### Verificar Câmera Fechada
```javascript
const isCameraClosedByUser = useCallback((cameraId) => {
  return closedCameras.has(cameraId);
}, [closedCameras]);
```

### 3. Filtro na Lógica de Proximidade

```javascript
cameras.forEach(camera => {
  // Pular câmeras fechadas pelo usuário
  if (isCameraClosedByUser(camera.id)) {
    return;
  }
  
  // Resto da lógica de detecção...
});
```

## Interface do Usuário

### 1. Menu Inferior Atualizado

#### Novos Botões
- **Fechar**: Fecha câmera atual (apenas com múltiplas câmeras)
- **Câmeras**: Abre menu de câmeras (apenas com múltiplas câmeras)
- **Reabrir**: Reabre todas as câmeras fechadas
- **Sair**: Fecha todas as câmeras (renomeado)

#### Visibilidade Condicional
- Botões específicos aparecem apenas quando relevante
- Interface se adapta ao número de câmeras ativas

### 2. Menu de Câmeras

#### Layout
```
┌─────────────────────────────────┐
│         Câmeras Ativas          │
├─────────────────────────────────┤
│ 🔵 Câmera Central (1 de 3) [X] │
│ ⚪ Câmera Norte   (2 de 3) [X]  │
│ ⚪ Câmera Sul     (3 de 3) [X]  │
├─────────────────────────────────┤
│    [Reabrir Todas as Câmeras]   │
└─────────────────────────────────┘
```

#### Elementos Visuais
- **🔵**: Câmera atual sendo exibida
- **⚪**: Outras câmeras ativas
- **[X]**: Botão para fechar câmera específica
- **Atual**: Indicador de texto para câmera atual

## Casos de Uso

### 1. Usuário Quer Ver Apenas Câmeras Específicas
```
1. Sistema detecta 3 câmeras na área
2. Usuário abre menu de câmeras
3. Fecha câmera que não interessa
4. Continua navegando entre as 2 restantes
```

### 2. Usuário Quer Focar em Uma Câmera
```
1. Sistema detecta múltiplas câmeras
2. Usuário fecha todas exceto a principal
3. Visualização fica focada na câmera escolhida
4. Sistema não abre outras câmeras automaticamente
```

### 3. Usuário Quer Reabrir Todas as Câmeras
```
1. Usuário fechou algumas câmeras
2. Clica em "Reabrir"
3. Todas as câmeras fechadas voltam a ser detectadas
4. Sistema retorna ao comportamento normal
```

### 4. Usuário Sai da Área
```
1. Usuário fechou algumas câmeras
2. Heric sai da área de todas as câmeras
3. Sistema fecha visualização
4. Lista de câmeras fechadas é limpa automaticamente
5. Próxima entrada na área detecta todas as câmeras
```

## Vantagens da Implementação

### ✅ Controle Total
- **Flexibilidade**: Usuário decide quais câmeras ver
- **Personalização**: Experiência adaptada às preferências
- **Foco**: Pode focar em câmeras específicas

### ✅ Interface Intuitiva
- **Clareza**: Botões com funções específicas
- **Feedback**: Indicadores visuais claros
- **Acessibilidade**: Controles fáceis de usar

### ✅ Comportamento Inteligente
- **Navegação**: Transições suaves após fechar câmeras
- **Reset**: Limpeza automática quando apropriado
- **Consistência**: Mantém estado durante navegação

### ✅ Performance
- **Filtro Eficiente**: Câmeras fechadas não são processadas
- **Estado Otimizado**: Apenas dados necessários mantidos
- **Responsividade**: Interface responsiva a mudanças

## Testes Recomendados

### 1. Teste de Fechamento
- [ ] Fechar câmera atual com outras disponíveis
- [ ] Fechar câmera atual sem outras disponíveis
- [ ] Fechar câmera não atual do menu
- [ ] Fechar múltiplas câmeras sequencialmente

### 2. Teste de Navegação
- [ ] Navegar após fechar câmera atual
- [ ] Verificar atualização de títulos
- [ ] Testar navegação circular com câmeras fechadas
- [ ] Verificar botões de navegação aparecem/desaparecem

### 3. Teste de Reabertura
- [ ] Reabrir todas as câmeras fechadas
- [ ] Verificar se câmeras voltam a ser detectadas
- [ ] Testar reabertura automática ao sair da área
- [ ] Verificar reset completo de estados

### 4. Teste de Interface
- [ ] Menu de câmeras abre/fecha corretamente
- [ ] Botões aparecem/desaparecem conforme contexto
- [ ] Indicadores visuais são precisos
- [ ] Interface responsiva em diferentes dispositivos

## Próximos Passos

1. **Testar funcionalidade** com diferentes cenários
2. **Otimizar performance** se necessário
3. **Adicionar animações** de transição
4. **Considerar persistência** de preferências do usuário
5. **Implementar atalhos de teclado** para ações rápidas 