import terser from "@rollup/plugin-terser"
import typescript from "@rollup/plugin-typescript"
import {createVSIX} from "@vscode/vsce"
import {copyFileSync, readFileSync, writeFileSync} from "node:fs"
import {join, normalize, relative} from "node:path"
import {argv} from "node:process"
import {rollup} from "rollup"

const root = import.meta.dirname
const src = join(root, "src")
const out = join(root, "out")

/**
 * Sync manifest (`package.json` file)
 * from the {@link root} folder to the {@link out} folder.
 * All its options are prepared for what a VSCode extension requires.
 *
 * @param root path to the root folder.
 * @param out path to the output folder.
 * @param outCode path to the output entry file of the extension.
 * @param dev whether to use dev mode.
 */
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

/** A shortcut to copy asset files into the output folder. */
function syncAssets(filenames: string[], root: string, out: string) {
  for (const name of filenames) copyFileSync(join(root, name), join(out, name))
}

/** Build a ts project into an output es file. */
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
  await bundle(srcCode, outCode)

  // Package the extension if specified by command.
  if (argv.includes("pack")) {
    syncAssets(["readme.md", "license.txt"], root, out)
    await createVSIX({cwd: out})
  }
}
main()
