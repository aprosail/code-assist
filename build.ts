import terser from "@rollup/plugin-terser"
import typescript from "@rollup/plugin-typescript"
import {createVSIX} from "@vscode/vsce"
import * as jsonc from "comment-json"
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import {dirname, join, normalize, relative} from "node:path"
import {argv} from "node:process"
import * as prettier from "prettier"
import {ExternalOption, rollup} from "rollup"
import {generateInterfaces} from "./src/generate"

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

/**
 * Generate a VSCode settings file based on the settings of the monorepo root.
 * All the comments will be retained,
 * and there will be a line of comment as message to separate
 * the generated {@link additionalOptions} and
 * which copied from the monorepo root.
 *
 * @param root where the template source `.vscode/settings`.json locates.
 * @param childRepo relative path to the child repo folder from {@link root}.
 * @param additionalOptions additional options to add into the settings file.
 */
async function generateVSCodeSettings(
  root: string,
  childRepo: string,
  additionalOptions?: Record<string, unknown>,
) {
  // Resolve paths.
  const vscodeSettingsPaths = [".vscode", "settings.json"]
  const srcFile = join(root, ...vscodeSettingsPaths)
  const outFile = join(childRepo, ...vscodeSettingsPaths)

  // Parse JSON with comments.
  const settings = jsonc.parse(readFileSync(srcFile).toString())
  const stored = jsonc.assign({...additionalOptions}, settings)

  // Generate comment line to separate if necessary.
  if (additionalOptions && Object.keys(additionalOptions).length > 0) {
    const firstKey = Object.keys(additionalOptions)[0]
    const symbolName: jsonc.CommentDescriptor = `after:${firstKey}`
    const comment = "Following settings are copied from the monorepo root."
    const token: jsonc.CommentToken = {
      type: "LineComment",
      value: comment,
      inline: false,
      loc: {
        start: {line: 0, column: 0},
        end: {line: 0, column: comment.length},
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(stored as any)[Symbol.for(symbolName)] = [token]
  }

  // Keep empty lines before the line comments, and then prettier format.
  const content = jsonc.stringify(stored, null, 2).replace(/\/\//g, "\n//")
  const prettierOptions = await prettier.resolveConfig(outFile)
  const result = await prettier.format(content, {
    ...prettierOptions,
    filepath: outFile,
  })
  // Ensure the parent directory exist before potential create file.
  mkdirSync(dirname(outFile), {recursive: true})
  writeFileSync(outFile, result)
}

async function main() {
  const root = import.meta.dirname
  const src = join(root, "src")
  const out = join(root, "out")
  const example = join(root, "example")

  emptyFolder(out)
  const outFilePath = await buildVSCodeExtension(src, out)
  syncManifest(root, out, outFilePath)

  // Update auto generated color layout interfaces.
  const templateJson = join(src, "template-color-theme.json")
  const generateOutput = join(src, "lib", "color-layout.g.ts")
  await generateInterfaces(templateJson, generateOutput)

  // Package the extension if specified by command.
  if (argv.includes("pack")) {
    syncAssets(["README.md", "LICENSE.txt"], root, out)
    await createVSIX({cwd: out})
  }

  // Generate additional VSCode settings before launch.
  if (argv.includes("launch")) {
    await generateVSCodeSettings(root, example, {
      // Enable Git support in the example folder for demonstration about Git.
      "git.openRepositoryInParentFolders": "always",
    })
  }
}
main()
