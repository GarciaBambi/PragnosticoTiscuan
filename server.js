// server.js
// Servidor "backend" do Apito Final Garcia Aj.
// Guarda a chave da API em segredo (no .env) e entrega ao frontend
// os jogos e odds já processados, no mesmo formato que a app espera.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

// Cache simples em memória: como agora consultamos muitas ligas de uma vez,
// evitamos gastar a quota gratuita da API sempre que alguém abre a página.
// Os dados ficam guardados durante CACHE_TTL_MS e só se busca de novo depois disso.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
let cache = { data: null, timestamp: 0 };

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------
// Competições que a app vai mostrar.
// "sportKey" é o identificador que a The Odds API usa para cada liga.
// Lista completa e atualizada em:
// https://the-odds-api.com/sports-odds-data/sports-apis.html
// ----------------------------------------------------------------
const LEAGUES = [
  // ---------- Europa (ligas nacionais) ----------
  { sportKey: 'soccer_spain_la_liga',            country: 'Espanha',       flag: '🇪🇸', league: 'La Liga' },
  { sportKey: 'soccer_epl',                      country: 'Inglaterra',    flag: '🏴', league: 'Premier League' },
  { sportKey: 'soccer_portugal_primeira_liga',   country: 'Portugal',      flag: '🇵🇹', league: 'Liga Portugal' },
  { sportKey: 'soccer_italy_serie_a',            country: 'Itália',        flag: '🇮🇹', league: 'Serie A' },
  { sportKey: 'soccer_germany_bundesliga',       country: 'Alemanha',      flag: '🇩🇪', league: 'Bundesliga' },
  { sportKey: 'soccer_france_ligue_one',         country: 'França',        flag: '🇫🇷', league: 'Ligue 1' },
  { sportKey: 'soccer_netherlands_eredivisie',   country: 'Países Baixos', flag: '🇳🇱', league: 'Eredivisie' },
  { sportKey: 'soccer_turkey_super_league',      country: 'Turquia',       flag: '🇹🇷', league: 'Süper Lig' },

  // ---------- Europa (competições continentais) ----------
  { sportKey: 'soccer_uefa_champs_league',       country: 'Europa', flag: '🇪🇺', league: 'Liga dos Campeões (UEFA)' },
  { sportKey: 'soccer_uefa_europa_league',       country: 'Europa', flag: '🇪🇺', league: 'Liga Europa (UEFA)' },
  { sportKey: 'soccer_uefa_nations_league',      country: 'Europa', flag: '🇪🇺', league: 'Liga das Nações (UEFA)' },

  // ---------- Internacional / Mundial ----------
  { sportKey: 'soccer_fifa_world_cup',                     country: 'Mundial', flag: '🌐', league: 'Copa do Mundo FIFA' },
  { sportKey: 'soccer_fifa_world_cup_qualifiers_europe',   country: 'Mundial', flag: '🌐', league: 'Qualificação Mundial — Europa' },
  { sportKey: 'soccer_fifa_club_world_cup',                country: 'Mundial', flag: '🌐', league: 'Mundial de Clubes FIFA' },

  // ---------- África ----------
  { sportKey: 'soccer_africa_cup_of_nations',    country: 'África', flag: '🌍', league: 'CAN — Taça Africana das Nações' },

  // ---------- América do Sul ----------
  { sportKey: 'soccer_brazil_campeonato',        country: 'Brasil',     flag: '🇧🇷', league: 'Brasileirão' },
  { sportKey: 'soccer_argentina_primera_division', country: 'Argentina', flag: '🇦🇷', league: 'Primera División' },
  { sportKey: 'soccer_conmebol_copa_libertadores', country: 'América do Sul', flag: '🌎', league: 'Copa Libertadores' },
  { sportKey: 'soccer_conmebol_copa_america',      country: 'América do Sul', flag: '🌎', league: 'Copa América' },
  { sportKey: 'soccer_conmebol_copa_sudamericana', country: 'América do Sul', flag: '🌎', league: 'Copa Sul-Americana' },

  // ---------- América do Norte / Central ----------
  { sportKey: 'soccer_usa_mls',        country: 'Estados Unidos', flag: '🇺🇸', league: 'MLS' },
  { sportKey: 'soccer_mexico_ligamx',  country: 'México',         flag: '🇲🇽', league: 'Liga MX' },

  // ---------- Ásia ----------
  { sportKey: 'soccer_japan_j_league',           country: 'Japão',          flag: '🇯🇵', league: 'J League' },
  { sportKey: 'soccer_saudi_arabia_pro_league',  country: 'Arábia Saudita', flag: '🇸🇦', league: 'Saudi Pro League' },

  // ---------- Oceania ----------
  { sportKey: 'soccer_australia_aleague', country: 'Austrália', flag: '🇦🇺', league: 'A-League' },
];
// Nota: esta API não cobre ligas domésticas africanas (Girabola, Egyptian
// Premier League, etc.) nem mercados de cantos/ambas-marcam — a CAN é a
// única competição africana disponível. Ver README.md para alternativas
// com cobertura mais completa de África.

async function fetchLeagueOdds(sportKey) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/`
    + `?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${sportKey}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Converte um evento da The Odds API para o formato usado pela app
// (o mesmo formato que já estava nos dados de exemplo do ficheiro HTML).
function transformEvent(event, meta) {
  const markets = [];

  // ---- Mercado 1X2 (vitória casa / empate / vitória fora) ----
  const homeOdds = [];
  const drawOdds = [];
  const awayOdds = [];

  (event.bookmakers || []).forEach(bk => {
    const h2h = bk.markets.find(m => m.key === 'h2h');
    if (!h2h) return;
    h2h.outcomes.forEach(o => {
      if (o.name === event.home_team) homeOdds.push(o.price);
      else if (o.name === event.away_team) awayOdds.push(o.price);
      else drawOdds.push(o.price); // "Draw"
    });
  });

  if (homeOdds.length) markets.push({ id: '1', label: `${event.home_team} vence (1)`, odds: homeOdds });
  if (drawOdds.length) markets.push({ id: 'x', label: 'Empate (X)', odds: drawOdds });
  if (awayOdds.length) markets.push({ id: '2', label: `${event.away_team} vence (2)`, odds: awayOdds });

  // ---- Mercado de totais (mais/menos de X.5 golos) ----
  const overByPoint = {};
  (event.bookmakers || []).forEach(bk => {
    const totals = bk.markets.find(m => m.key === 'totals');
    if (!totals) return;
    totals.outcomes.forEach(o => {
      if (o.name === 'Over') {
        overByPoint[o.point] = overByPoint[o.point] || [];
        overByPoint[o.point].push(o.price);
      }
    });
  });
  Object.entries(overByPoint).forEach(([point, odds]) => {
    markets.push({ id: `over${point}`, label: `Mais de ${point} golos`, odds });
  });

  return {
    id: event.id.slice(0, 8).toUpperCase(),
    country: meta.country,
    flag: meta.flag,
    league: meta.league,
    home: event.home_team,
    away: event.away_team,
    date: event.commence_time, // ISO real, usado pelo calendário no frontend
    kickoff: new Date(event.commence_time).toLocaleString('pt-PT', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }),
    markets,
  };
}

// Endpoint que o frontend consome: devolve todos os jogos já processados.
app.get('/api/odds', async (req, res) => {
  if (!ODDS_API_KEY) {
    return res.status(500).json({
      error: 'ODDS_API_KEY não configurada no servidor. Copie .env.example para .env e cole a sua chave.',
    });
  }

  // Se a cache ainda for válida, devolve-a sem gastar quota da API.
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_TTL_MS) {
    return res.json({ ...cache.data, cached: true });
  }

  try {
    const results = await Promise.allSettled(LEAGUES.map(l => fetchLeagueOdds(l.sportKey)));
    const allMatches = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        // todos os jogos disponíveis de cada liga (o filtro por liga/data é feito no frontend)
        r.value.forEach(event => {
          if (event.bookmakers && event.bookmakers.length) {
            allMatches.push(transformEvent(event, LEAGUES[i]));
          }
        });
      } else {
        console.error(`Erro na liga ${LEAGUES[i].league}:`, r.reason.message);
      }
    });

    const payload = { matches: allMatches, updatedAt: new Date().toISOString() };
    cache = { data: payload, timestamp: now };
    res.json(payload);
  } catch (err) {
    console.error(err);
    // se falhar mas ainda houver cache antiga, é melhor devolver isso do que nada
    if (cache.data) return res.json({ ...cache.data, cached: true, stale: true });
    res.status(500).json({ error: 'Erro ao contactar a API de odds.' });
  }
});

app.listen(PORT, () => {
  console.log(`Apito Final Garcia Aj a correr em http://localhost:${PORT}`);
});
