import { build } from "esbuild"
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const packageDir = process.cwd()
const sourceDir = path.join(packageDir, "src")
const outDir = path.join(packageDir, "dist")
const solidDir = path.join(outDir, "solid")

const require = createRequire(path.join(packageDir, "package.json"))
const { transform } = require("@solidjs/compiler")

function listSourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full)
    }
  }
  return out
}

function resolveRelative(specifier, resolveDir, jsxExt) {
  const base = path.resolve(resolveDir, specifier)
  if (existsSync(`${base}.tsx`)) return `${specifier}${jsxExt}`
  if (existsSync(`${base}.ts`)) return `${specifier}.js`
  if (existsSync(path.join(base, "index.tsx"))) return `${specifier}/index${jsxExt}`
  if (existsSync(path.join(base, "index.ts"))) return `${specifier}/index.js`
  return specifier
}

function externalImports(jsxExt) {
  return {
    name: "external-imports",
    setup(b) {
      b.onResolve({ filter: /.*/ }, ({ kind, path: specifier, resolveDir }) => {
        if (kind === "entry-point") return undefined
        if (!specifier.startsWith(".")) return { path: specifier, external: true }
        return { path: resolveRelative(specifier, resolveDir, jsxExt), external: true }
      })
    },
  }
}

function compileSolidJsx() {
  return {
    name: "solid-jsx",
    setup(b) {
      b.onLoad({ filter: /\.tsx$/ }, ({ path: file }) => {
        const { code } = transform(readFileSync(file, "utf8"), {
          filename: file,
          generate: "dom",
          hydratable: true,
        })
        return { contents: code, loader: "ts" }
      })
    },
  }
}

rmSync(outDir, { recursive: true, force: true })

const files = listSourceFiles(sourceDir)

// 1. Compiled browser ESM (`dist/*.js`)
await build({
  entryPoints: files,
  outdir: outDir,
  outbase: sourceDir,
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  plugins: [externalImports(".js"), compileSolidJsx()],
})

// 2. Preserved JSX for Solid bundlers (`dist/solid/*.{js,jsx}`)
await build({
  entryPoints: files.filter((f) => f.endsWith(".tsx")),
  outdir: solidDir,
  outbase: sourceDir,
  outExtension: { ".js": ".jsx" },
  bundle: true,
  jsx: "preserve",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  plugins: [externalImports(".jsx")],
})

await build({
  entryPoints: files.filter((f) => f.endsWith(".ts")),
  outdir: solidDir,
  outbase: sourceDir,
  bundle: true,
  jsx: "preserve",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  plugins: [externalImports(".jsx")],
})

// 3. Emit `.d.ts` declarations
execFileSync(
  path.join(packageDir, "node_modules/.bin/tsc"),
  ["-p", "tsconfig.build.json"],
  { stdio: "inherit" }
)
