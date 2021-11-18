import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import katex from 'https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.mjs';

const addr = ":8080";
console.log(`HTTP server listening on http://localhost${addr}`);

serve((request: Request) => {
    const { pathname } = new URL(request.url);
    const html = katex.renderToString(decodeURIComponent(pathname).slice(1), {
        displayMode: true
    });
    return new Response(html);
}, { addr });

await Deno.run({ cmd: ["zola", "build"] }).status();

console.log("END");

Deno.exit();


