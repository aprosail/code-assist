import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext) {
  const hello = vscode.commands.registerCommand("hello", () => {
    vscode.window.showInformationMessage("it works")
  })
  context.subscriptions.push(hello)
}
