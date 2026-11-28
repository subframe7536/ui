import { createContext, useContext } from 'solid-js'

const LogContext = createContext<(message: string) => void>(() => {})

export function useLog() {
  return useContext(LogContext)
}

export { LogContext }
