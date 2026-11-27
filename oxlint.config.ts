import { subfLint } from '@subf/config/oxlint'

export default subfLint(
  {
    ignorePatterns: ['ref'],
    solid: true,
    options: {
      typeAware: true,
    },
  },
  {
    rules: {
      'typescript/unbound-method': 'off',
    },
  },
)
