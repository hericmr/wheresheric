# Onde Estão Heric? - Viewer

## Descrição

Este repositório contém a aplicação **Viewer** do projeto "Onde Estão Heric?". Desenvolvido em React.js, o Viewer é responsável pela visualização e monitoramento dos feeds de câmeras. Ele oferece uma interface intuitiva para exibir câmeras em grade, visualização em tela cheia e integração com o Supabase para recuperação de dados.

## Funcionalidades

*   Exibição de feeds de câmeras em formato de grade ou lista.
*   Visualização em tela cheia para imagens de câmeras individuais.
*   Integração com Supabase para persistência e recuperação de dados.
*   Cálculo de distância (baseado em `src/utils/calculateDistance.js`).

## Tecnologias Utilizadas

*   **Frontend:** React.js
*   **Backend/Banco de Dados:** Supabase
*   **Linguagens:** JavaScript, HTML, CSS

## Instalação

Para configurar e executar o projeto localmente, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd ondeestaoheric
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configuração do Supabase:**
    Crie um arquivo `.env` na raiz do projeto e adicione suas credenciais do Supabase:
    ```
    REACT_APP_SUPABASE_URL=sua_url_supabase
    REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
    ```
    Substitua `sua_url_supabase` e `sua_chave_anonima_supabase` pelas suas credenciais reais do projeto Supabase.

4.  **Execute o aplicativo:**
    ```bash
    npm start
    ```

    O aplicativo será iniciado em `http://localhost:3000` (ou outra porta disponível).

## Uso

Após iniciar o aplicativo:

*   Acesse `http://localhost:3000` no seu navegador.
*   Navegue pelos feeds das câmeras exibidas.
*   Clique em uma imagem de câmera para visualizá-la em tela cheia.

## Contribuição

Contribuições são bem-vindas! Para contribuir, por favor, siga os seguintes passos:

1.  Faça um fork do repositório.
2.  Crie uma nova branch (`git checkout -b feature/sua-feature`).
3.  Faça suas alterações e commit-as (`git commit -m 'feat: Adiciona nova funcionalidade'`).
4.  Envie para a branch (`git push origin feature/sua-feature`).
5.  Abra um Pull Request.

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo `LICENSE` para mais detalhes. (Se você não tiver um arquivo LICENSE, considere criá-lo.)