const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://quantotempofalta.piracicabana.com.br/',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Buscar posições dos ônibus
    if (body.type === undefined || body.type === 'buses') {
      const resp = await fetch(
        'https://quantotempofalta.piracicabana.com.br/parts/update_bus.php',
        {
          method: 'POST',
          headers: { ...UPSTREAM_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `linha_id=${body.linha_id}`,
        }
      );

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ error: `Upstream error: ${resp.status}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const text = await resp.text();
      const matches = [...text.matchAll(/\{[^{}]+\}/g)];
      const buses = matches
        .map((m) => { try { return JSON.parse(m[0]); } catch { return null; } })
        .filter(Boolean);

      return new Response(JSON.stringify(buses), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar traçado da rota (ida e volta)
    if (body.type === 'route') {
      const resp = await fetch(
        `https://quantotempofalta.piracicabana.com.br/pg_mapaLinha.php?idLinha=${body.hash}`,
        { headers: UPSTREAM_HEADERS }
      );

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ error: `Upstream error: ${resp.status}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const html = await resp.text();

      const idaMatch = html.match(/var latlngIda\s*=\s*(\[[\s\S]*?\]);/);
      const voltaMatch = html.match(/var latlngVolta\s*=\s*(\[[\s\S]*?\]);/);

      const ida = idaMatch ? JSON.parse(idaMatch[1]) : [];
      const volta = voltaMatch ? JSON.parse(voltaMatch[1]) : [];

      return new Response(JSON.stringify({ ida, volta }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'type inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
