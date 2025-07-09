# Planejamento: Implementação de Câmeras da Cidade

## Objetivo
Adicionar ao mapa ícones de câmeras em posições geográficas específicas, permitindo fácil expansão para novas câmeras e integração futura com feeds de vídeo ou informações adicionais.

## Funcionalidades
- Exibir ícones de câmera em locais definidos no mapa (ex: 23°59'06.4"S 46°18'31.9"W).
- Utilizar biblioteca de ícones para React (ex: react-icons, FontAwesome, Material Icons).
- Estrutura modular: fácil adicionar, remover ou editar câmeras.
- Possibilidade de expandir para mostrar informações, imagens ou vídeo ao clicar no ícone.
- Código limpo, reutilizável e documentado.

## Etapas de Implementação

### 1. Escolha e Instalação da Biblioteca de Ícones
- Recomenda-se `react-icons` pela variedade e facilidade de uso:
  ```bash
  npm install react-icons
  ```

### 2. Estrutura de Dados das Câmeras
- Criar um arquivo/module (ex: `cityCameras.js`) exportando um array de objetos:
  ```js
  // Exemplo de cityCameras.js
  export const cityCameras = [
    {
      id: 'cam-avenida',
      name: 'Câmera Avenida Central',
      lat: -23.985111, // 23°59'06.4"S
      lng: -46.308861, // 46°18'31.9"W
      icon: 'MdCameraAlt', // Nome do ícone do react-icons/md
      info: 'Câmera de monitoramento da Avenida Central.'
    },
    // Outras câmeras...
  ];
  ```

### 3. Componente Modular CameraLayer
- Criar um componente `CameraLayer` responsável por:
  - Renderizar os ícones das câmeras no mapa usando OpenLayers.
  - Permitir expansão para popups, tooltips ou integração com vídeo.
  - Receber a lista de câmeras como prop.

### 4. Integração com o Viewer
- Importar e renderizar o `CameraLayer` dentro do componente principal do mapa (`Viewer`).
- Garantir que a adição de câmeras não afete a performance ou a experiência do usuário.

### 5. Expansão Futura
- Adicionar suporte a popups com informações da câmera.
- Integrar feeds de vídeo ao clicar no ícone.
- Permitir filtragem/ocultação de câmeras por categoria ou status.

## Exemplo de Uso
```jsx
import { cityCameras } from './cityCameras';
<CameraLayer cameras={cityCameras} />
```

## Observações
- Manter a separação de responsabilidades: dados, visualização e lógica de interação.
- Documentar como adicionar novas câmeras.
- Garantir responsividade e acessibilidade dos ícones. 