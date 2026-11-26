/**
 * @fileoverview Rule to check if the property shorthand can be used
 */
'use strict'

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            url: getDocsUrl('prop-shorthand')
        },
        schema: [{
            enum: ['always', 'never']
        }]
    },

    create(context) {
        const {isCallToLodashMethod, getShorthandVisitors} = require('../util/lodashUtil')
        const {methodSupportsShorthand} = require('../util/methodDataUtil')
        const {isMemberExpOf, getValueReturnedInFirstStatement, getFirstParamName} = require('../util/astUtil')
        const {version} = require('../util/settingsUtil').getSettings(context)

        function isExplicitParamFunction(func) {
            return isMemberExpOf(getValueReturnedInFirstStatement(func), getFirstParamName(func), {allowComputed: false})
        }

        function canUseShorthand(iteratee, lodashContext) {
            return isCallToLodashMethod(iteratee, 'property', lodashContext) || isExplicitParamFunction(iteratee)
        }

        function usesShorthand(node, iteratee, method) {
            if (!iteratee) {
                return false
            }
            if (iteratee.type === 'Literal') {
                return version !== 3 || iteratee.parent !== node || !methodSupportsShorthand(3, method, 'matchesProp') || !node.arguments[node.arguments.indexOf(iteratee) + 1]
            }
            return version === 4 && iteratee.parent !== node && !methodSupportsShorthand(4, method, 'matchesProp') && iteratee.type === 'ArrayExpression'
        }

        return getShorthandVisitors(context, {
            canUseShorthand,
            usesShorthand
        }, {
            always: 'Prefer property shorthand syntax',
            never: 'Do not use property shorthand syntax'
        }, 'prop')
    }
}
