export interface LanguageDef {
  id: string;
  label: string;
  filename: string;
  sample: string;
}

const L = (lines: string[]) => lines.join("\n");

export const LANGUAGES: LanguageDef[] = [
  { id: "python", label: "Python", filename: "main.py", sample: 'print("Hello, CodeVault!")' },
  { id: "javascript", label: "JavaScript", filename: "main.js", sample: 'console.log("Hello, CodeVault!");' },
  { id: "typescript", label: "TypeScript", filename: "main.ts", sample: 'const msg: string = "Hello, CodeVault!";\nconsole.log(msg);' },
  { id: "java", label: "Java", filename: "Main.java", sample: L([
    "public class Main {",
    "  public static void main(String[] args) {",
    '    System.out.println("Hello, CodeVault!");',
    "  }",
    "}",
  ]) },
  { id: "c", label: "C", filename: "main.c", sample: L([
    "#include <stdio.h>",
    "",
    "int main(void) {",
    '  printf("Hello, CodeVault!\\n");',
    "  return 0;",
    "}",
  ]) },
  { id: "cpp", label: "C++", filename: "main.cpp", sample: L([
    "#include <iostream>",
    "",
    "int main() {",
    '  std::cout << "Hello, CodeVault!" << std::endl;',
    "  return 0;",
    "}",
  ]) },
  { id: "csharp", label: "C#", filename: "main.cs", sample: L([
    "using System;",
    "",
    "class Program {",
    "  static void Main() {",
    '    Console.WriteLine("Hello, CodeVault!");',
    "  }",
    "}",
  ]) },
  { id: "go", label: "Go", filename: "main.go", sample: L([
    "package main",
    "",
    'import "fmt"',
    "",
    "func main() {",
    '  fmt.Println("Hello, CodeVault!")',
    "}",
  ]) },
  { id: "rust", label: "Rust", filename: "main.rs", sample: L([
    "fn main() {",
    '  println!("Hello, CodeVault!");',
    "}",
  ]) },
  { id: "php", label: "PHP", filename: "main.php", sample: '<?php\necho "Hello, CodeVault!\\n";' },
  { id: "ruby", label: "Ruby", filename: "main.rb", sample: 'puts "Hello, CodeVault!"' },
  { id: "kotlin", label: "Kotlin", filename: "main.kt", sample: L([
    "fun main() {",
    '  println("Hello, CodeVault!")',
    "}",
  ]) },
];

export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);

export function getLanguage(id: string): LanguageDef | undefined {
  return LANGUAGES.find((l) => l.id === id);
}
