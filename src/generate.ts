import {readFileSync, writeFileSync} from "node:fs"
import * as prettier from "prettier"
import stripJsonComments from "strip-json-comments"

/**
 * Generate interfaces as the template Json file.
 * Such template Json file should follow the VSCode's color theme scheme,
 * and it is supposed to have all the fields configured,
 * that the interfaces can be fully generated.
 *
 * @param template Json file following the VSCode's color theme scheme.
 * @param out the output ts file.
 * @param rootClassName the generated class name of the root.
 * @param importColor where to import the color class.
 * @param rgbColor the generated class name of the RGB color.
 */
export async function generateInterfaces(
  template: string,
  out: string,
  rootClassName: string = "VSCodeThemeColors",
) {
  // Get and check the colors field from the template Json file.
  const rawContent = readFileSync(template).toString()
  const raw = JSON.parse(stripJsonComments(rawContent)).colors
  if (!raw) throw new Error(`invalid vscode color theme scheme: ${template}`)

  // Handler and setup with the import colors.
  const handler: string[] = []

  // Recursion of generating the interfaces.
  function generateAs(root: object, rootClassName: string) {
    // Buffer for a single interface.
    const buffer: string[] = [`export interface ${rootClassName} {`]
    for (const [key, value] of Object.entries(root)) {
      // When not leaf, generate a new interface.
      if (typeof value === "object") {
        const className = capitalize(key)
        buffer.push(`  ${key}?: ${className}`)
        generateAs(value, className)
      }
      // When leaf, generate direct field using a string to represent the color.
      else if (
        typeof value === "string" &&
        /^(#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})$/g.test(value)
      ) {
        buffer.push(`  ${key}?: string`)
      }
    }
    buffer.push("}")
    handler.push(buffer.join("\n"))
  }
  generateAs(dotToTree(dualLayerPreprocess(raw)), capitalize(rootClassName))

  // Prettier format and output.
  const content = handler.join("\n\n") + "\n"
  const prettierOptions = await prettier.resolveConfig(out)
  const result = await prettier.format(content, {
    ...prettierOptions,
    filepath: out,
  })
  writeFileSync(out, result)
}

export function dualLayerPreprocess(raw: object) {
  const handler: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const index = key.indexOf(".")
    if (index < 0) {
      handler[key] = value
    } else {
      const parent = key.substring(0, index + 1)
      const child = key.substring(index + 1)
      handler[parent + child.replaceAll(".", "_")] = value
    }
  }
  return handler
}

/** Convert path split by dot into a tree-structured object. */
export function dotToTree(raw: object): object {
  const handler: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== "string") continue
    updateObject(handler, key.split("."), value)
  }
  return handler
}

/**
 * Update value on the given {@link raw} object at the given {@link path}.
 *
 * @param raw the raw object to update upon.
 * @param path the path to update.
 * @param value the value on such path.
 */
export function updateObject(
  raw: Record<string, unknown>,
  path: string[],
  value: unknown,
) {
  if (path.length === 0) throw new Error(`path cannot be empty`)
  if (path.length === 1) {
    raw[path[0]] = value
    return
  }
  if (!raw[path[0]]) raw[path[0]] = {}
  updateObject(raw[path[0]] as Record<string, unknown>, path.slice(1), value)
}

function capitalize(raw: string) {
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}
