# Ollama Landing Page Generator

<div align="center">
  <img src="ollama.jpeg" alt="Ollama Logo" style="border-radius: 50%; width: 200px; height: 200px;">
</div>

Este projeto é um gerador de landing pages utilizando IA, que busca imagens no Unsplash e cria páginas HTML responsivas e otimizadas.

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)
- Conta no Unsplash para obter uma chave de acesso

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/Unix-User/LandingPageGenerator.git
   cd landingpagegenerator
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env` na raiz do projeto e adicione suas variáveis de ambiente:
   ```plaintext
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key
   PORT=3001
   AI_MODEL=llama3
   OLLAMA_API_HOST=localhost
   OLLAMA_API_PORT=11434
   ```

## Uso

1. Inicie o servidor:
   ```bash
   node server.js
   ```

2. Abra seu navegador e acesse `http://localhost:3001`.

## Estrutura do Projeto

- `server.js`: Arquivo principal do servidor Node.js.
- `index.html`: Página inicial do projeto.
- `about.html`: Página "Sobre" do projeto.

## Funcionalidades

- Geração de palavras-chave para busca de imagens no Unsplash.
- Criação de landing pages HTML responsivas e otimizadas.
- Tradução e adaptação do conteúdo para o português brasileiro.

## Contribuição

1. Faça um fork do projeto.
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`).
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`).
4. Faça um push para a branch (`git push origin feature/nova-feature`).
5. Abra um Pull Request.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
