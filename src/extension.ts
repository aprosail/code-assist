import * as vscode from "vscode"

export function activation(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("code-assist.hello", () =>
    vscode.window.showInformationMessage("hello, it works."),
  )
  context.subscriptions.push(disposable)
}
