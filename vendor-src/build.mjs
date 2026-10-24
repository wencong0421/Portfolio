// Bundles the vendor libraries into site/vendor so the deployed site has no runtime CDN dependency.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.resolve(here, "../site/vendor");

const common = {
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  legalComments: "eof",
  logLevel: "info",
};

await build({ ...common, entryPoints: [path.join(here, "three-entry.js")], outfile: path.join(outdir, "three.min.js") });
await build({ ...common, entryPoints: [path.join(here, "gsap-entry.js")], outfile: path.join(outdir, "gsap.min.js") });
