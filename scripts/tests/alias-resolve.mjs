import path from "node:path";
import fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function tryTs(abs) {
  if (fs.existsSync(abs)) return abs;
  if (!path.extname(abs) && fs.existsSync(abs + ".ts")) return abs + ".ts";
  if (!path.extname(abs) && fs.existsSync(abs + ".tsx")) return abs + ".tsx";
  if (!path.extname(abs) && fs.existsSync(path.join(abs, "index.ts")))
    return path.join(abs, "index.ts");
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const abs = tryTs(path.join(root, specifier.slice(2)));
    if (abs) {
      return { shortCircuit: true, url: pathToFileURL(abs).href };
    }
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const abs = tryTs(path.resolve(parentDir, specifier));
    if (abs) {
      return { shortCircuit: true, url: pathToFileURL(abs).href };
    }
  }
  return nextResolve(specifier, context);
}
