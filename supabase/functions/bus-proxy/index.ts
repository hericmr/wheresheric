const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linha_id } = await req.json();

    const resp = await fetch(
      'https://quantotempofalta.piracicabana.com.br/parts/update_bus.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://quantotempofalta.piracicabana.com.br/',
        },
        body: `linha_id=${linha_id}`,
      }
    );

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${resp.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await resp.text();

    // A API retorna objetos JSON concatenados, não um array válido
    const matches = [...text.matchAll(/\{[^{}]+\}/g)];
    const buses = matches
      .map((m) => { try { return JSON.parse(m[0]); } catch { return null; } })
      .filter(Boolean);

    return new Response(JSON.stringify(buses), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
