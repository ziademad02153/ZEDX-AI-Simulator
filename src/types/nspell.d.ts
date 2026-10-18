declare module 'nspell' {
    interface SpellEngine { correct(word: string): boolean; suggest(word: string): string[]; add(word: string): SpellEngine }
    export default function nspell(dictionary: { aff: string; dic: string }): SpellEngine;
}
