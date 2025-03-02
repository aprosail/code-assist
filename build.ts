import terser from "@rollup/plugin-terser"
import typescript from "@rollup/plugin-typescript"
import {createVSIX} from "@vscode/vsce"
import {
  copyFileSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import {join, normalize, relative} from "node:path"
import {argv} from "node:process"
import {ExternalOption, rollup} from "rollup"

/**
 * Generate bundle for a VSCode extension.
 * The output is optimized and compressed,
 * but the bundling process might be slow.
 *
 * @param src folder where source code file locates.
 * @param out folder to output.
 * @param codeName name of the code file without suffix.
 * @param external what package imports to externalize.
 * @returns the generated output file path.
 */
async function buildVSCodeExtension(
  src: string,
  out: string,
  codeName: string = "extension",
  external: ExternalOption | undefined = (source, _importer, isResolved) => {
    if (isResolved) return false
    return source === "vscode" || source.startsWith("node:")
  },
): Promise<string> {
  const bundle = await rollup({
    plugins: [typescript(), terser()],
    input: join(src, `${codeName}.ts`),
    external,
  })
  const outFilePath = join(out, `${codeName}.js`)
  await bundle.write({file: outFilePath, format: "commonjs"})
  return outFilePath
}

/** Empty everything inside the folder but keep the folder. */
function emptyFolder(path: string) {
  for (const name of readdirSync(path)) {
    rmSync(join(path, name), {recursive: true})
  }
}

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

  manifest.type = undefined
  manifest.scripts = undefined
  manifest.dependencies = undefined
  manifest.devDependencies = undefined
  manifest.peerDependencies = undefined

  manifest.main = normalize(relative(out, outCode))

  const content = JSON.stringify(manifest, null, dev ? 2 : undefined)
  writeFileSync(join(out, filename), content)
}

/** A shortcut to copy asset files into the output folder. */
function syncAssets(filenames: string[], root: string, out: string) {
  for (const name of filenames) copyFileSync(join(root, name), join(out, name))
}

async function main() {
  const root = import.meta.dirname
  const src = join(root, "src")
  const out = join(root, "out")

  emptyFolder(out)
  const outFilePath = await buildVSCodeExtension(src, out)
  syncManifest(root, out, outFilePath)

  // Package the extension if specified by command.
  if (argv.includes("pack")) {
    syncAssets(["README.md", "LICENSE.txt"], root, out)
    await createVSIX({cwd: out})
  }
}
main()
