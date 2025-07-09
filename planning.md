# Plano de Estrutura de Projeto para Repositórios Separados

Este documento descreve o plano para a divisão do projeto "Onde Estão Heric?" em dois repositórios distintos, visando uma arquitetura robusta, modular, expansível e de fácil manutenção.

## 1. Visão Geral dos Repositórios

### 1.1. `onde_esta_heric` (Repositório do Viewer)

*   **Propósito:** Contém a aplicação frontend principal responsável pela visualização e monitoramento das câmeras. É a interface que o usuário final interage para ver os feeds de vídeo, informações das câmeras, etc.
*   **Tecnologias:** React.js, Supabase (para consumo de dados).
*   **Conteúdo:**
    *   Componentes de UI específicos do Viewer (e.g., `Viewer`, `CameraCard`, `CameraGrid`, `FullScreenImage`).
    *   Lógica de apresentação e interação do usuário.
    *   Configurações de roteamento para o Viewer.
    *   Integração com APIs (provavelmente do Transmitter ou de um backend centralizado).

### 1.2. `onde_esta_heric_trans` (Repositório do Transmitter)

*   **Propósito:** Contém a aplicação ou serviço responsável por transmitir os dados das câmeras, processá-los e disponibilizá-los. Pode atuar como um backend para o Viewer, fornecendo os dados das câmeras.
*   **Tecnologias:** (A definir, mas pode ser Node.js/Express, Python/FastAPI, ou até mesmo um serviço de transmissão de vídeo dedicado).
*   **Conteúdo:**
    *   Lógica de aquisição e processamento de dados de câmeras.
    *   APIs para o Viewer consumir (e.g., endpoints para listar câmeras, obter streams de vídeo, dados de telemetria).
    *   Lógica de autenticação/autorização para acesso aos dados das câmeras (se aplicável).
    *   Componentes ou serviços específicos do Transmitter.

## 2. Comunicação e Integração entre Repositórios

A comunicação entre o Viewer e o Transmitter será primariamente via **APIs RESTful** ou **WebSockets** (para streams de vídeo em tempo real).

*   **Viewer -> Transmitter:** O Viewer fará requisições HTTP (GET, POST, etc.) para os endpoints expostos pelo Transmitter para obter dados das câmeras. Para streams de vídeo, WebSockets podem ser utilizados.
*   **Contratos de API:** É crucial definir e manter contratos de API claros (especificações de endpoints, formatos de requisição/resposta) para garantir a compatibilidade entre as duas aplicações. Ferramentas como OpenAPI/Swagger podem ser úteis aqui.

## 3. Gerenciamento de Código Compartilhado

Para evitar duplicação de código e garantir consistência, especialmente para utilitários e configurações que podem ser comuns a ambos, considere as seguintes abordagens:

*   **Bibliotecas Compartilhadas (Monorepo Light):** Para utilitários como `supabaseClient.js` ou `calculateDistance.js`, que são pequenos e independentes, eles podem ser duplicados inicialmente se a complexidade de um monorepo for excessiva. No entanto, para utilitários maiores ou modelos de dados, considere:
    *   **Publicação como Pacote NPM/PyPI:** Se houver código JavaScript/Python reutilizável, ele pode ser publicado como um pacote privado (npm package, PyPI package) e instalado como dependência em ambos os repositórios.
    *   **Git Submodules:** Para módulos de código que precisam ser compartilhados e desenvolvidos em conjunto, mas mantidos em seus próprios repositórios, Git Submodules podem ser uma opção, embora adicionem complexidade ao fluxo de trabalho.
*   **Duplicação Consciente:** Para utilitários muito pequenos e estáveis, uma duplicação consciente pode ser aceitável para evitar a sobrecarga de gerenciamento de pacotes ou submodules, desde que a manutenção seja mínima.

## 4. Considerações de Implantação (Deployment)

Cada repositório será implantado de forma independente.

*   **Viewer:** Será uma aplicação estática (React build) servida por um servidor web (e.g., Nginx, Apache, Vercel, Netlify).
*   **Transmitter:** Será um serviço de backend que pode ser implantado em um servidor (e.g., AWS EC2, Google Cloud Run, Heroku) ou como um serviço serverless (e.g., AWS Lambda, Google Cloud Functions).
*   **Variáveis de Ambiente:** Cada aplicação terá suas próprias variáveis de ambiente, incluindo as URLs das APIs que precisam se comunicar.

## 5. Robustez, Modularidade e Expansibilidade

*   **Modularidade:** A divisão em dois repositórios força a modularidade, pois cada um terá responsabilidades bem definidas. A comunicação via API garante baixo acoplamento.
*   **Robustez:** A separação permite que falhas em um serviço não afetem diretamente o outro (e.g., se o Transmitter cair, o Viewer pode exibir uma mensagem de erro, mas não necessariamente travar). Testes independentes para cada serviço são mais fáceis de implementar.
*   **Expansibilidade:**
    *   **Escalabilidade Independente:** Cada serviço pode ser escalado horizontalmente de forma independente, conforme a demanda.
    *   **Tecnologias Diferentes:** Permite o uso de diferentes tecnologias e linguagens para cada serviço, otimizando para suas necessidades específicas.
    *   **Equipes Separadas:** Facilita o trabalho de equipes diferentes em cada parte do sistema.
    *   **Novas Funcionalidades:** Novas funcionalidades podem ser adicionadas a um repositório sem impactar diretamente o outro, desde que os contratos de API sejam respeitados.

## 6. Próximos Passos

1.  **Definir Tecnologias para o Transmitter:** Escolher a stack tecnológica para o repositório `onde_esta_heric_trans`.
2.  **Criar o Repositório `onde_esta_heric_trans`:** Iniciar o novo projeto com a estrutura básica.
3.  **Migrar Código do Transmitter:** Mover o código específico do Transmitter para o novo repositório.
4.  **Definir Contratos de API:** Esboçar os endpoints e modelos de dados que o Transmitter irá expor e o Viewer irá consumir.
5.  **Implementar Comunicação:** Desenvolver a lógica de comunicação entre o Viewer e o Transmitter.
