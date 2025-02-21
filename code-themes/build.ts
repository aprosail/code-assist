import {join} from "node:path"
import {generateInterfaces} from "./src/generate"

const root = import.meta.dirname

async function main() {
  const templateJson = join(root, "src", "template-color-theme.json")
  const generateOutput = join(root, "src", "lib", "color-layout.g.ts")
  await generateInterfaces(templateJson, generateOutput)
}
main()
