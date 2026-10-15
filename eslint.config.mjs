import next from 'eslint-config-next/core-web-vitals'
import ts from 'eslint-config-next/typescript'

const config = [
  ...next,
  ...ts,
  { ignores: ['dist/**', '.next/**', 'node_modules/**', 'components/ui/**', 'next-env.d.ts', 'tailwind.config.ts'] },
  { rules: { 'react-hooks/set-state-in-effect': 'off' } },
]

export default config
