/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  HoverParams,
  Hover,
  SignatureHelpParams,
  SignatureHelp,
  DocumentFormattingParams,
  TextEdit,
  DocumentHighlightParams,
  DocumentHighlight,
  DocumentHighlightKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

// 关键点1： 初始化 LSP 连接对象
const connection = createConnection(ProposedFeatures.all);

// 关键点2： 创建文档集合对象，用于映射到实际文档
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  // 明确声明插件支持的语言特性
  const result: InitializeResult = {
    capabilities: {
      // 增量处理
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // 代码补全
      completionProvider: {
        resolveProvider: true,
      },
      // hover 提示
      hoverProvider: true,
      // 签名提示
      signatureHelpProvider: {
        triggerCharacters: ["("],
      },
      // 格式化
      documentFormattingProvider: true,
      // 语言高亮
      documentHighlightProvider: true,
    },
  };
  return result;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

// 增量错误诊断
documents.onDidChangeContent((change) => {
  const textDocument = change.document;

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText();
  const pattern = /\b[A-Z]{2,}\b/g;
  let m: RegExpExecArray | null;

  let problems = 0;
  const diagnostics: Diagnostic[] = [];
  while ((m = pattern.exec(text))) {
    problems++;
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: "Diagnostics Demo",
    };
    // diagnostics.push(diagnostic);
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
});

connection.onHover((params: HoverParams): Promise<Hover> => {
  return Promise.resolve({
    contents: ["Hover Demo"],
  });
});

connection.onDocumentFormatting(
  (params: DocumentFormattingParams): Promise<TextEdit[]> => {
    const { textDocument } = params;
    const doc = documents.get(textDocument.uri)!;
    const text = doc.getText();
    const pattern = /\b[A-Z]{3,}\b/g;
    let match;
    const res = [];
    while ((match = pattern.exec(text))) {
      res.push({
        range: {
          start: doc.positionAt(match.index),
          end: doc.positionAt(match.index + match[0].length),
        },
        newText: match[0].replace(/(?<=[A-Z])[A-Z]+/, (r) => r.toLowerCase()),
      });
    }

    return Promise.resolve(res);
  }
);

connection.onDocumentHighlight(
  (params: DocumentHighlightParams): Promise<DocumentHighlight[]> => {
    const { textDocument } = params;
    const doc = documents.get(textDocument.uri)!;
    const text = doc.getText();
    const pattern = /\bopaque\b/i;
    const res: DocumentHighlight[] = [];
    let match;
    while ((match = pattern.exec(text))) {
      res.push({
        range: {
          start: doc.positionAt(match.index),
          end: doc.positionAt(match.index + match[0].length),
        },
        kind: DocumentHighlightKind.Write,
      });
    }
    return Promise.resolve(res);
  }
);

connection.onSignatureHelp(
  (params: SignatureHelpParams): Promise<SignatureHelp> => {
    return Promise.resolve({
      signatures: [
        {
          label: "Signature Demo",
          documentation: "human readable content",
          parameters: [
            {
              label: "@p1 first param",
              documentation: "content for first param",
            },
          ],
        },
      ],
      activeSignature: 0,
      activeParameter: 0,
    });
  }
);

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // const currentContext = analyzeContext(_textDocumentPosition.textDocument.uri, _textDocumentPosition.position);
    // 假设 analyzeContext 返回一个包含了所有可能的数据类型补全的列表
    const dataTypeKeywords = ['int', 'bool', 'double', 'qubit','unit'];
    const operationKeywords = ['operation', 'opaque'];
    //if|else|while|for|return|break|continue|do|default|goto|label|sizeof|import
    const  controlKeywords = ['if', 'else', 'while', 'for', 'return', 'break', 'continue', 'do', 'default', 'goto', 'label', 'sizeof', 'import'];
    const completionItems: CompletionItem[] = [];

    dataTypeKeywords.forEach(type => {
      completionItems.push({
        label: type,
        kind: CompletionItemKind.Value,
        // detail: `Type ${type}`,
        data: 1,
      });
    });
    // getTextDocumentContent();

    operationKeywords.forEach(operation => {
      completionItems.push({
        label: operation,
        kind: CompletionItemKind.Function, // 或 CompletionItemKind.Method，取决于quingo语言的具体定义
        // detail: `${operation} operation`,
        data: 2,
      });
    });
    
    controlKeywords.forEach(control => {
      completionItems.push({
        label: control,
        kind: CompletionItemKind.Keyword,
        // detail: `Type ${type}`,
        data: 3,
      });
    });
    
    return completionItems;
    // 根据当前上下文补全
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  console.log("request completion resolve");
  // const dataTypeKeywords = ['int', 'bool', 'double', 'qubit','unit'];
  if (item.data === 1) {
    item.detail = `Quingo数据类型`;
    // item.documentation = "Quingo 基本数据类型";
  } else if (item.data === 2) {
    item.detail = "Quingo原子操作";
    // item.documentation = "Quingo language";
  } else if(item.data === 3){
    item.detail = "Quingo控制语句";
  }
  return item;
});
function getTextDocumentContent() {
  throw new Error("Function not implemented.");
}

