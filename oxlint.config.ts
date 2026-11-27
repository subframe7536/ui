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
      'jsdoc/check-tag-names': ['error', { definedTags: ['stable', 'experimental'] }],
      // Custom foundation primitives take reactive accessors and track them internally.
      'subf/solid-reactivity': [
        'warn',
        {
          customReactiveFunctions: [
            'renderPart',
            'registerComponent',
            'createControlledSignal',
            'useControllerTarget',
            'useControllerEntry',
            'usePopupPosition',
            'useDismissLayer',
            'useFocusManagement',
            'runAction',
          ],
        },
      ],
    },
  },
)
