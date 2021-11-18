// # Installation
//
// $ deno install --allow-run --allow-net ihoronigen.ts
//
// # Usage
//
// ## Serve
//
// $ ihoronigen serve
//
// ## Build
//
// $ ihoronigen build
// 

import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.mjs";

const addr = ":8080";

console.log(`KaTeX compile server listening on http://localhost${addr}
`);

serve((request: Request) => {
    const { pathname } = new URL(request.url);
	const data = decodeURIComponent(pathname).slice(1);

	let source = "";
	let displayMode = false;

	if (data.startsWith("block")) {
		source = data.slice("block".length);
		displayMode = true
	}

	if (data.startsWith("inline")) {
		source = data.slice("inline".length);
		displayMode = false;
	}

    const html = katex.renderToString(source, {
        displayMode
    });

    return new Response(html);
}, { addr });

await Deno.run({ cmd: ["zola", Deno.args[0]] }).status();

console.log("END");

Deno.exit();


