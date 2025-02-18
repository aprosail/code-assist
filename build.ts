import * as jsonc from "comment-json"
import {copyFileSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import * as prettier from "prettier"

const root = import.meta.dirname
const defaultLicenseName = "license.txt"

function syncLicense(
  children: string[],
  licenseName: string | {from?: string; to?: string} = defaultLicenseName,
) {
  const licenseFrom =
    typeof licenseName === "string"
      ? licenseName
      : (licenseName.from ?? defaultLicenseName)

  const licenseTo =
    typeof licenseName === "string"
      ? licenseName
      : (licenseName.to ?? defaultLicenseName)

  for (const child of children) {
    copyFileSync(join(root, licenseFrom), join(root, child, licenseTo))
  }
}

/**
 * Generate a VSCode settings file based on the settings of the monorepo root.
 * All the comments will be retained,
 * and there will be a line of comment as message to separate
 * the generated {@link additionalOptions} and
 * which copied from the monorepo root.
 *
 * @param childRepo relative path to the child repo folder from {@link root}.
 * @param additionalOptions additional options to add into the settings file.
 */
async function generateVSCodeSettings(
  childRepo: string,
  additionalOptions?: Record<string, unknown>,
) {
  // Resolve paths.
  const vscodeSettingsPaths = [".vscode", "settings.json"]
  const srcFile = join(root, ...vscodeSettingsPaths)
  const outFile = join(root, childRepo, ...vscodeSettingsPaths)

  // Parse JSON with comments.
  const settings = jsonc.parse(readFileSync(srcFile).toString())
  let stored = jsonc.assign({...additionalOptions}, settings)

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
    ;(stored as any)[Symbol.for(symbolName)] = [token]
  }

  // Keep empty lines before the line comments, and then prettier format.
  const content = jsonc.stringify(stored, null, 2).replace(/\/\//g, "\n//")
  const prettierOptions = await prettier.resolveConfig(outFile)
  const result = await prettier.format(content, {
    ...prettierOptions,
    filepath: outFile,
  })
  writeFileSync(outFile, result)
}

async function main() {
  const example = "example"
  const children = ["code-assist", "code-icons", "code-themes", example]
  syncLicense(children)
  await generateVSCodeSettings(example, {
    "git.openRepositoryInParentFolders": "always",
  })
}
main()
