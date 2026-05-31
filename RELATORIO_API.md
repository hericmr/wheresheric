# Relatório Técnico — Engenharia Reversa da API quantotempofalta.piracicabana.com.br

**Data:** 2026-05-31  
**Linha analisada:** CIRCULAR 042 (Santos/SP)  
**Objetivo:** Documentar o funcionamento interno da API para uso em projeto externo com mapa próprio e atualização a cada 30 segundos.

---

## 1. Visão Geral do Sistema

O sistema **Quanto Tempo Falta?** é uma aplicação web de rastreamento de ônibus em tempo real da cidade de Santos/SP. Ele expõe indiretamente uma API que retorna:

- **Localização GPS** dos ônibus em operação (latitude e longitude)
- **Identificação** do veículo (prefixo/número do ônibus)
- **Direção** da viagem (ida ou volta)
- **Dados do motorista** e horário da última atualização

A interface pública usa [Leaflet.js](https://leafletjs.com/) para exibir o mapa e atualiza as posições a cada **15 segundos** via AJAX.

---

## 2. Estrutura de URLs e Identificadores

### 2.1 URL pública da linha

```
https://quantotempofalta.piracicabana.com.br/pg_mapaLinha.php?idLinha={HASH}
```

**Exemplo (CIRCULAR 042):**
```
https://quantotempofalta.piracicabana.com.br/pg_mapaLinha.php?idLinha=213554937c50ad7b9d52c4b652be9a85f61f50f1
```

- O parâmetro `idLinha` é um **hash SHA1** que identifica a linha publicamente.
- Acessar essa URL retorna uma página HTML completa com mapa, traçado da rota e script JavaScript que inicia o rastreamento.

### 2.2 Mapeamento hash → ID interno

Dentro do HTML retornado por `pg_mapaLinha.php`, existe a variável JavaScript:

```javascript
var var_linha = 402;
```

Este valor (`402`) é o **ID interno numérico** da linha usado em todas as chamadas à API de rastreamento. O hash SHA1 da URL pública é apenas uma representação alternativa para a interface.

| Identificador público (hash) | ID interno | Linha |
|---|---|---|
| `213554937c50ad7b9d52c4b652be9a85f61f50f1` | `402` | CIRCULAR 042 |

> Para outras linhas, basta acessar o HTML de `pg_mapaLinha.php` com o hash correspondente e localizar `var var_linha = ...` no JavaScript.

---

## 3. API de Localização em Tempo Real

### 3.1 Endpoint

```
POST https://quantotempofalta.piracicabana.com.br/parts/update_bus.php
```

### 3.2 Headers obrigatórios

O servidor bloqueia requisições sem headers de navegador (retorna `403 Forbidden` sem eles).

```http
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Referer: https://quantotempofalta.piracicabana.com.br/
```

### 3.3 Body da requisição

```
linha_id=402
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `linha_id` | inteiro | Sim | ID interno numérico da linha |

### 3.4 Formato da resposta

A API **não retorna JSON válido padrão**. Ela retorna múltiplos objetos JSON **concatenados**, separados por vírgula e newline, sem envolver em array:

```
{"prefixo":"4284","lat":-23.958960,"lng":-46.332030, "sentido":1, "conteudo":"<span>...</span>"},
{"prefixo":"1023","lat":-23.943116,"lng":-46.326283, "sentido":2, "conteudo":"<span>...</span>"},
```

> Cada objeto representa um ônibus diferente em operação na linha. Se só um ônibus estiver ativo, retorna apenas um objeto.

#### Exemplo real capturado (2026-05-31):

```json
{
  "prefixo": "4284",
  "lat": -23.958960000000001,
  "lng": -46.332030000000003,
  "sentido": 1,
  "conteudo": "<span><b>Prefixo:</b> 4284</br><b>Linha: </b>42<br><b>Motorista: </b>ADAILTON<br><b>Horário: </b>00:09:26<br></span>"
}
```

### 3.5 Campos da resposta

| Campo | Tipo | Descrição |
|---|---|---|
| `prefixo` | string | Número identificador do ônibus (ex: `"4284"`) |
| `lat` | float | Latitude GPS em graus decimais (ex: `-23.958960`) |
| `lng` | float | Longitude GPS em graus decimais (ex: `-46.332030`) |
| `sentido` | inteiro | `1` = Ida (ex: Terminal Valongo → Ferry Boat), `2` = Volta |
| `conteudo` | string | HTML com info detalhada: linha, motorista, sentido textual e horário |

#### Extração dos dados do campo `conteudo`:

O HTML dentro de `conteudo` contém:
- **Prefixo:** número do veículo
- **Linha:** número da linha (ex: `42`)
- **Motorista:** nome do motorista em serviço
- **Sentido:** descrição textual da direção (ex: `Terminal Valongo > Ferry Boat`)
- **Horário:** tempo desde o início da viagem ou horário de partida no formato `HH:MM:SS`

---

## 4. Traçado do Percurso (Coordenadas da Rota)

As coordenadas do traçado completo da rota (ida e volta) estão embutidas no HTML de `pg_mapaLinha.php` nas variáveis JavaScript:

```javascript
var latlngIda = [
  {lat: -23.93543, lng: -46.33393},
  {lat: -23.93547, lng: -46.33382},
  // ... centenas de pontos
];

var latlngVolta = [
  {lat: -23.98626, lng: -46.29473},
  // ... centenas de pontos
];
```

Essas coordenadas podem ser extraídas via regex e usadas para desenhar o traçado em qualquer mapa.

### Paradas do percurso

As paradas individuais (pontos de ônibus) são definidas via chamadas JavaScript:

```javascript
ExibePontosLinha(lat, lng, 'NOME DA PARADA', PontosIcon, init);
```

O último argumento `init=1` na última chamada indica o fim da lista.

**Exemplos de paradas da CIRCULAR 042:**
- `TERMINAL VALONGO (PLATAFORMA C)` — lat: -23.935034, lng: -46.333655
- `AV. ANA COSTA, 64` — lat: -23.946562, lng: -46.330413
- `AV. REI ALBERTO I - SENAI - B` — lat: -23.988280, lng: -46.298218
- `PRAÇA ALMIRANTE GAGO COUTINHO` — lat: -23.986255, lng: -46.294681

---

## 5. Outros Endpoints Encontrados

### 5.1 Itinerário e horários

```
GET https://quantotempofalta.piracicabana.com.br/pg_FindLinesDt.php?idLinha={HASH}
```

Retorna página HTML com:
- Itinerário completo (ruas percorridas, sentido ida e volta)
- Tabela de horários (dias úteis, sábados, domingos/feriados)
- Intervalo entre partidas por período do dia

### 5.2 CSS e JavaScript da aplicação

```
https://quantotempofalta.piracicabana.com.br/css_js/mapa_functions.js?v=1755532215
https://quantotempofalta.piracicabana.com.br/css_js/functions.js?v=1755532215
```

O parâmetro `?v=` é um timestamp Unix usado para cache busting — pode mudar entre deploys.

---

## 6. Comportamento da Aplicação Original

```
┌─────────────────────────────────────────────────────┐
│              pg_mapaLinha.php (HTML)                │
│                                                     │
│  1. Carrega Leaflet.js + mapa_functions.js          │
│  2. Inicializa mapa centrado em Santos/SP           │
│  3. Desenha polyline Ida (verde) e Volta (azul)     │
│  4. Adiciona marcadores de paradas (zoom >= 16)     │
│  5. Chama AtualizaCarros() imediatamente            │
│  6. Repete AtualizaCarros() a cada 15 segundos      │
└─────────────────────────────────────────────────────┘
                          │
                          │ POST linha_id=402
                          ▼
┌─────────────────────────────────────────────────────┐
│           parts/update_bus.php (API)                │
│                                                     │
│  Retorna: JSON concatenados com posição de          │
│  cada ônibus ativo na linha                         │
└─────────────────────────────────────────────────────┘
```

O parser JavaScript original lê a resposta caractere a caractere, acumulando até encontrar `}`, então faz `JSON.parse` do trecho acumulado — isso explica o formato não-padrão da resposta.

---

## 7. Implementação para Projeto Externo

### 7.1 Estratégia recomendada

Para um novo projeto com mapa próprio e atualização a cada 30 segundos:

1. **Extrair coordenadas da rota** uma vez (do HTML de `pg_mapaLinha.php`) e armazenar localmente.
2. **Consultar `update_bus.php`** a cada 30 segundos para posições em tempo real.
3. **Parsear a resposta** com regex (não usar `JSON.parse` diretamente no texto completo).
4. **Atualizar marcadores** no mapa sem redesenhar a rota a cada ciclo.

### 7.2 Implementação Python (requests)

```python
import requests
import re
import json
import time

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
    "Referer": "https://quantotempofalta.piracicabana.com.br/",
}

def get_bus_positions(linha_id: int) -> list[dict]:
    """Retorna lista de ônibus ativos com lat, lng, prefixo, sentido."""
    resp = requests.post(
        "https://quantotempofalta.piracicabana.com.br/parts/update_bus.php",
        data=f"linha_id={linha_id}",
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    # Resposta: objetos JSON concatenados, não um array padrão
    return [json.loads(obj) for obj in re.findall(r'\{[^{}]+\}', resp.text)]

def get_route_coordinates(id_linha_hash: str) -> dict:
    """Extrai coordenadas de ida/volta e paradas do HTML da página."""
    resp = requests.get(
        f"https://quantotempofalta.piracicabana.com.br/pg_mapaLinha.php?idLinha={id_linha_hash}",
        headers=HEADERS,
        timeout=10,
    )
    html = resp.text

    # Extrair linha_id interna
    linha_id_match = re.search(r'var var_linha\s*=\s*(\d+)', html)
    linha_id = int(linha_id_match.group(1)) if linha_id_match else None

    # Extrair coordenadas de ida
    ida_match = re.search(r'var latlngIda\s*=\s*(\[.*?\]);', html, re.DOTALL)
    ida_coords = json.loads(ida_match.group(1)) if ida_match else []

    # Extrair coordenadas de volta
    volta_match = re.search(r'var latlngVolta\s*=\s*(\[.*?\]);', html, re.DOTALL)
    volta_coords = json.loads(volta_match.group(1)) if volta_match else []

    # Extrair paradas
    stops = re.findall(
        r"ExibePontosLinha\(([-\d.]+),\s*([-\d.]+),\s*'([^']+)'",
        html
    )
    paradas = [{"lat": float(s[0]), "lng": float(s[1]), "nome": s[2]} for s in stops]

    return {
        "linha_id": linha_id,
        "ida": ida_coords,
        "volta": volta_coords,
        "paradas": paradas,
    }

# --- Uso ---
HASH = "213554937c50ad7b9d52c4b652be9a85f61f50f1"

# Buscar rota uma vez
rota = get_route_coordinates(HASH)
print(f"Linha ID: {rota['linha_id']}")
print(f"Pontos ida: {len(rota['ida'])}, volta: {len(rota['volta'])}")
print(f"Paradas: {len(rota['paradas'])}")

# Loop de atualização a cada 30 segundos
while True:
    onibus = get_bus_positions(rota["linha_id"])
    for o in onibus:
        sentido = "Ida" if o["sentido"] == 1 else "Volta"
        print(f"Ônibus {o['prefixo']} | {sentido} | ({o['lat']:.6f}, {o['lng']:.6f})")
    time.sleep(30)
```

### 7.3 Implementação JavaScript/Node.js (fetch)

```javascript
const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0",
  "Referer": "https://quantotempofalta.piracicabana.com.br/",
};

async function getBusPositions(linhaId) {
  const resp = await fetch(
    "https://quantotempofalta.piracicabana.com.br/parts/update_bus.php",
    { method: "POST", headers: HEADERS, body: `linha_id=${linhaId}` }
  );
  const text = await resp.text();
  // Parsear objetos JSON concatenados
  return [...text.matchAll(/\{[^{}]+\}/g)].map(m => JSON.parse(m[0]));
}

// Atualização a cada 30 segundos
const LINHA_ID = 402;

async function loop() {
  const onibus = await getBusPositions(LINHA_ID);
  onibus.forEach(o => {
    const sentido = o.sentido === 1 ? "Ida" : "Volta";
    console.log(`Ônibus ${o.prefixo} | ${sentido} | (${o.lat}, ${o.lng})`);
    // Atualizar marcador no seu mapa aqui
  });
}

loop(); // primeira chamada imediata
setInterval(loop, 30_000); // repetir a cada 30s
```

### 7.4 Integração com mapas

A API retorna coordenadas no formato padrão **WGS84 (EPSG:4326)** — compatível diretamente com:

| Biblioteca | Como usar as coordenadas |
|---|---|
| **Leaflet.js** | `L.marker([lat, lng])` |
| **Google Maps JS** | `new google.maps.LatLng(lat, lng)` |
| **Mapbox GL** | `[lng, lat]` (ordem invertida!) |
| **OpenLayers** | `ol.proj.fromLonLat([lng, lat])` |
| **Folium (Python)** | `folium.Marker([lat, lng])` |

> **Atenção Mapbox:** a ordem é `[longitude, latitude]`, ao contrário dos demais.

---

## 8. Considerações e Limitações

| Aspecto | Detalhe |
|---|---|
| **Autenticação** | Nenhuma — apenas headers de navegador são necessários |
| **Rate limiting** | Não identificado, mas respeitar intervalo mínimo de 15s é recomendado |
| **Disponibilidade** | Depende da infraestrutura do sistema de Santos — sem SLA público |
| **Formato de resposta** | Não é JSON padrão; usar regex para split dos objetos |
| **Sem ônibus ativos** | Fora do horário de operação, a resposta pode ser vazia ou ausente |
| **Precisão GPS** | Coordenadas com até 15 casas decimais, mas precisão real é ~10 metros |
| **HTTPS** | O servidor usa HTTPS; requisições HTTP são redirecionadas |
| **CORS** | Pode haver bloqueio de CORS em chamadas diretas do navegador — usar backend próprio como proxy |

### Sobre CORS no frontend

Se o projeto externo fizer chamadas diretamente do navegador (JavaScript no cliente), o servidor pode rejeitar por política de CORS. Solução recomendada: criar um **endpoint proxy no seu próprio backend** que faça a chamada ao `update_bus.php` e repasse os dados ao frontend.

```
Navegador → seu backend (proxy) → update_bus.php
```

---

## 9. Resumo Rápido para Implementação

```
ENDPOINT DE POSIÇÕES:
  URL    : POST https://quantotempofalta.piracicabana.com.br/parts/update_bus.php
  BODY   : linha_id=402
  HEADERS: Content-Type: application/x-www-form-urlencoded
           User-Agent: Mozilla/5.0 ...
           Referer: https://quantotempofalta.piracicabana.com.br/

RESPOSTA (JSON concatenado, não array):
  {"prefixo":"4284","lat":-23.9589,"lng":-46.3320,"sentido":1,"conteudo":"...html..."},

CAMPOS:
  prefixo → ID do ônibus
  lat/lng → posição GPS (WGS84)
  sentido → 1=Ida, 2=Volta

ROTA (extraída do HTML da página):
  latlngIda[]  → array de {lat, lng} do percurso de ida
  latlngVolta[] → array de {lat, lng} do percurso de volta
  ExibePontosLinha() → paradas individuais

INTERVALO ORIGINAL: 15 segundos
INTERVALO DO PROJETO: 30 segundos (configurável)
```
