# Apito Final Garcia Aj — Backend

Este pacote liga a sua aplicação a odds desportivas reais, guardando a chave
da API em segredo num servidor, em vez de a expor no navegador.

```
apito-final-backend/
├── server.js          → o servidor (busca odds e serve a app)
├── package.json       → dependências do servidor
├── .env.example       → modelo do ficheiro de configuração
└── public/
    └── index.html     → a sua aplicação (Prognósticos, Simples, Construída)
```

## 1. Obter uma chave de API

Usei a **The Odds API** (the-odds-api.com) como exemplo porque tem um plano
gratuito simples de testar (500 pedidos/mês, sem cartão de crédito):

1. Vá a https://the-odds-api.com/ e clique em "Get API Key".
2. Registe-se com o seu email — a chave aparece logo no ecrã seguinte.
3. Guarde essa chave, vai precisar dela no passo 3.

**Alternativas**, caso queira outros dados (por exemplo, mercados de cantos,
cartões, ou ligas como o Girabola angolano, que a The Odds API não cobre):
- **API-Football** (api-sports.io) — muito completa, tem plano gratuito limitado.
- **SportMonks** — boa cobertura de ligas africanas, é paga.
- **OddsJam** / **RapidAPI "Odds"** — vários fornecedores agregados, planos pagos.
Qualquer uma delas se liga da mesma forma: a chave fica no `.env`, e ajusta-se
a função `transformEvent()` em `server.js` ao formato de resposta dessa API.

## 2. Instalar o Node.js

Precisa do Node.js versão 18 ou superior instalado no seu computador.
Verifique com:
```bash
node -v
```
Se não tiver, descarregue em https://nodejs.org (escolha a versão "LTS").

## 3. Configurar o projeto

Dentro da pasta `apito-final-backend`:

```bash
npm install
cp .env.example .env
```

Abra o ficheiro `.env` e cole a sua chave:
```
ODDS_API_KEY=a_sua_chave_aqui
PORT=3000
```

## 4. Correr localmente

```bash
npm start
```

Deve ver:
```
Apito Final Garcia Aj a correr em http://localhost:3000
```

Abra esse endereço no navegador. Se a chave estiver correta, o indicador no
topo da página muda para **"Dados ao vivo"**. Se algo falhar (chave errada,
sem internet, limite de pedidos esgotado), a app volta sozinha aos dados de
exemplo e mostra **"Dados de exemplo"**, sem quebrar.

## 5. Colocar online (para outras pessoas acederem)

Localmente só funciona no seu computador. Para publicar a sério, hospede o
mesmo projeto num destes serviços (todos têm planos gratuitos):

- **Render.com** → "New Web Service", ligue o seu repositório, comando de
  arranque `npm start`, e defina `ODDS_API_KEY` nas "Environment Variables".
- **Railway.app** → processo semelhante, também com variáveis de ambiente.
- **Vercel** ou **Fly.io** → também funcionam, com pequenos ajustes.

Em qualquer um destes, a chave da API fica guardada nas configurações do
serviço (nunca no código), exatamente como no `.env` local.

## 6. Como os dados são organizados

O endpoint `/api/odds` devolve algo como:
```json
{
  "matches": [
    {
      "id": "A1B2C3D4",
      "country": "Espanha",
      "flag": "🇪🇸",
      "league": "La Liga",
      "home": "FC Barcelona",
      "away": "Real Madrid",
      "kickoff": "20 set., 20:00",
      "markets": [
        { "id": "1", "label": "FC Barcelona vence (1)", "odds": [1.85, 1.90, 1.88] },
        { "id": "x", "label": "Empate (X)", "odds": [3.40, 3.35, 3.30] },
        { "id": "2", "label": "Real Madrid vence (2)", "odds": [4.10, 4.05, 4.20] },
        { "id": "over2.5", "label": "Mais de 2.5 golos", "odds": [1.90, 1.85, 1.88] }
      ]
    }
  ],
  "updatedAt": "2026-09-22T18:00:00.000Z"
}
```
O `index.html` já sabe ler exatamente este formato — os menus Prognósticos
Geral, Aposta Simples e Aposta Construída continuam a funcionar da mesma
forma, só que agora com dados reais em vez dos de exemplo.

## Avisos importantes

- **Mercados em falta:** a versão gratuita da The Odds API só traz 1X2 e
  golos (mais/menos). Cantos e "ambas marcam" precisam de um fornecedor mais
  completo (normalmente pago) — ajuste `transformEvent()` quando mudar de API.
- **Limites de uso:** o plano gratuito tem um número máximo de pedidos por
  mês. Se a app começar a mostrar "Dados de exemplo" sem motivo aparente,
  verifique o seu consumo no painel da the-odds-api.com.
- **Responsabilidade:** verifique a legislação sobre apostas desportivas e
  publicidade a apostas no seu país antes de publicar esta aplicação para
  terceiros, e inclua sempre uma mensagem de jogo responsável.
