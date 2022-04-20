import * as vscode from "vscode";
import { maniHoverValues } from "../../manifest-utils";

class ManiCodeActionsProvider implements vscode.CodeActionProvider {
    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        return new Promise(async resolve => {
            if (context.diagnostics && context.diagnostics.length > 0) {
                // find the default value for the diagnostic
                const diagnostic = context.diagnostics[0];

                // check for a global problem before continuing
                if (diagnostic.code === "global") {
                    for (const value of maniHoverValues) {
                        if (value.member === diagnostic.source) {
                            const fix = new vscode.CodeAction("Manifest missing a required member", vscode.CodeActionKind.QuickFix);
                            fix.diagnostics = [diagnostic];
                            fix.edit = new vscode.WorkspaceEdit();

                            fix.edit.insert(document.uri, new vscode.Position(1, 0), `"${diagnostic.source}": "", \n`);

                            resolve([fix]);
                        }
                    };
                }

                for (const value of maniHoverValues) {
                    if (diagnostic.code === value.member) {
                        // set up quick fix
                        const fix = new vscode.CodeAction(`${diagnostic.code}`, vscode.CodeActionKind.QuickFix);
                        fix.diagnostics = [diagnostic];
                        fix.edit = new vscode.WorkspaceEdit();

                        // figure out range of affected member
                        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
                            const lineOfText = document.lineAt(lineIndex);
                            if (lineOfText.text.includes(value.member)) {
                                // find range after the member + :
                                const start = lineOfText.text.indexOf(':') + 1;
                                const end = lineOfText.text.length;
                                const range = new vscode.Range(lineIndex, start, lineIndex, end);

                                // handle special cases
                                if (value.member === "icons" || value.member === "screenshots") {
                                    fix.edit.replace(document.uri, range, `${value.defaultValue},`);
                                }
                                else {
                                    // add the edit to the fix with appropriate text and range
                                    fix.edit.replace(document.uri, range, ` "${value.defaultValue}",`);
                                }

                            }
                        }

                        resolve([fix]);
                    }
                }
            }

            resolve([]);
        });
    }
}

export function codeActionsActivate(ctx: vscode.ExtensionContext): void {
    ctx.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'json', scheme: 'file' }, new ManiCodeActionsProvider()));
}