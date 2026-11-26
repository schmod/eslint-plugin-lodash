/**
 * @fileoverview Rule to check that all uses of `this` inside collection methods are bound
 */
'use strict'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        docs: {
            url: getDocsUrl('no-unbound-this')
        }
    },

    create(context) {
        const {getLodashMethodCallExpVisitor, getLodashContext, getIterateeNodes} = require('../util/lodashUtil')
        const {isCollectionMethod} = require('../util/methodDataUtil')
        const {isFunctionExpression} = require('../util/astUtil')
        const assign = require('lodash/assign')
        const funcInfos = new Map()
        let currFuncInfo = {
            thisUses: []
        }
        const lodashContext = getLodashContext(context)
        return assign({
            'CallExpression:exit': getLodashMethodCallExpVisitor(lodashContext, (node, iteratee, info) => {
                const {method, version} = info
                if ((isCollectionMethod(version, method) && !/^over/.test(method)) || /^forEach(Right)?$/.test(method)) {
                    getIterateeNodes(node, info).forEach(iterateeNode => {
                        if (funcInfos.has(iterateeNode)) {
                            const {thisUses} = funcInfos.get(iterateeNode)
                            if (isFunctionExpression(iterateeNode) && thisUses.length) {
                                thisUses.forEach(thisNode => {context.report({node: thisNode, message: 'Do not use `this` without binding in collection methods'})})
                            }
                        }
                    })
                }
            }),
            ThisExpression(node) {
                currFuncInfo.thisUses.push(node)
            },
            onCodePathStart(codePath, node) {
                currFuncInfo = {
                    upper: currFuncInfo,
                    codePath,
                    thisUses: []
                }
                funcInfos.set(node, currFuncInfo)
            },
            onCodePathEnd() {
                currFuncInfo = currFuncInfo.upper
            }
        }, lodashContext.getImportVisitors())
    }
}
