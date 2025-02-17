import terser from "@rollup/plugin-terser"
import typescript from "@rollup/plugin-typescript"
import {readFileSync, writeFileSync} from "node:fs"
import {join, normalize, relative} from "node:path"
import {rollup} from "rollup"

const root = import.meta.dirname
const src = join(root, "src")
const out = join(root, "out")

function syncManifest(root: string, out: string, outCode: string, dev = false) {
  const filename = "package.json"
  const manifest = JSON.parse(readFileSync(join(root, filename)).toString())

  manifest["type"] = undefined
  manifest["scripts"] = undefined
  manifest["dependencies"] = undefined
  manifest["devDependencies"] = undefined
  manifest["peerDependencies"] = undefined

  manifest["main"] = normalize(relative(out, outCode))

  const content = JSON.stringify(manifest, null, dev ? 2 : undefined)
  writeFileSync(join(out, filename), content)
}

async function bundle(src: string, out: string) {
  const bundle = await rollup({
    plugins: [typescript(), terser()],
    input: src,
    external(source, _importer, isResolved) {
      if (isResolved) return false
      return source === "vscode" || source.startsWith("node:")
    },
  })
  return bundle.write({
    file: out,
    format: "commonjs",
  })
}

async function main() {
  const codeName = "extension"
  const srcCode = join(src, `${codeName}.ts`)
  const outCode = join(out, `${codeName}.js`)

  syncManifest(root, out, outCode)
  return bundle(srcCode, outCode)
}
main()
