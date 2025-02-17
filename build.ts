import {copyFileSync} from "node:fs"
import {join} from "node:path"

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

function main() {
  const children = ["code-assist", "code-icons", "code-themes"]
  syncLicense(children)
}
main()
