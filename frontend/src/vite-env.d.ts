/// <reference types="vite/client" />

// Side-effect CSS imports (import './App.css') need an ambient module without exports.
declare module '*.css'

declare module '*.scss'
declare module '*.sass'
declare module '*.less'
