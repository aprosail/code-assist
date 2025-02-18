import * as vscode from "vscode"
import {enableGitLineBlame} from "./lib/git-line-blame"

export function activate(context: vscode.ExtensionContext) {
  enableGitLineBlame(context)
}
