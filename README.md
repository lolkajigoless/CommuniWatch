# ComuniWatch

ComuniWatch é uma plataforma de monitoramento comunitário para registrar ocorrências, acompanhar comunidades, sinalizar locais de risco e facilitar a mobilização entre moradores e autoridades.

## Visão geral

O projeto reúne:

- backend em Node.js + Express
- banco PostgreSQL
- cache Redis
- app mobile em React Native + Expo
- orquestração por Docker Compose

## Stack tecnológica

- Node.js
- Express
- PostgreSQL
- Redis
- React Native
- Expo
- JWT
- Socket.IO
- Docker

## Estrutura do projeto

- [backend/](backend/) — API da aplicação e autenticação
- [database/](database/) — script SQL do banco
- [mobile/](mobile/) — aplicativo móvel
- [docker-compose.yml](docker-compose.yml) — serviços do projeto
- [README.md](README.md) — documentação do projeto

## Requisitos

- Node.js 18+
- npm ou yarn
- Docker + Docker Compose
- Expo Go ou emulador Android/iOS

## Como rodar localmente

### 1) Clone o projeto

```bash
git clone https://github.com/SEU_USUARIO/ComuniWatch.git
cd ComuniWatch
```

### 2) Suba os serviços com Docker

```bash
docker compose up --build
```

Isso sobe:

- backend em http://localhost:3000
- PostgreSQL em localhost:5432
- Redis em localhost:6379

### 3) Rode o app mobile

```bash
cd mobile
npm install
npx expo start
```

Depois:

- Android emulador: use o menu do Expo ou `a`
- iPhone/Android físico: escaneie o QR code com o Expo Go

### 4) Variáveis de ambiente

Crie os arquivos `.env` conforme necessário para o backend e mobile, por exemplo:

```bash
# backend/.env
PORT=3000
JWT_SECRET=sua_chave
DB_HOST=localhost
DB_PORT=5432
DB_NAME=communiwatch
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
```

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.9:3000/api
EXPO_PUBLIC_OPENROUTESERVICE_KEY=sua_chave_opensource
```

> Ajuste o IP conforme o ambiente em que o app está rodando.

## Usuário inicial

- E-mail: admin@communiwatch.com
- Senha: Admin123!

## Funcionalidades principais

- Login e cadastro de usuários
- Criação e gestão de comunidades
- Registro de ocorrências
- Visualização de incidentes no mapa
- Busca de rotas com endereço ou coordenadas
- Cadastro de desaparecidos
- Alertas e mobilização comunitária

## Como publicar no GitHub

### Opção 1: criar um repositório novo pelo terminal

```bash
git init
git add .
git commit -m "Primeiro commit do ComuniWatch"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ComuniWatch.git
git push -u origin main
```

### Opção 2: criar no GitHub e conectar depois

1. Acesse github.com
2. Clique em New repository
3. Dê um nome ao repositório, por exemplo: `ComuniWatch`
4. Crie o repositório
5. Volte no terminal e rode:

```bash
git init
git add .
git commit -m "Primeiro commit do ComuniWatch"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ComuniWatch.git
git push -u origin main
```

## Dicas importantes

- Nunca envie arquivos `.env` para o GitHub
- Use um arquivo `.gitignore` para ignorar `node_modules`, `.expo`, `.env`, caches e arquivos locais
- Antes de cada push, rode:

```bash
git status
git add .
git commit -m "Ajustes do projeto"
git push
```

## Licença

Este projeto foi desenvolvido para uso acadêmico e de demonstração. Ajuste a licença conforme a sua necessidade antes de publicar em produção.
