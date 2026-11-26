'use strict'
const _ = require('lodash')
const methodDataUtil = require('./methodDataUtil')
const astUtil = require('./astUtil')
const LodashContext = require('./LodashContext')

/**
 * Returns whether or not a node is a chainable method call in the specified version
 * @param {Object} node
 * @param {number} version
 * @returns {boolean}
 */
function isChainable(node, version) {
    return methodDataUtil.isChainable(version, astUtil.getMethodName(node))
}

/**
 * Returns whether the node is a chain breaker method in the specified version
 * @param {Object} node
 * @param {number} version
 * @returns {boolean}
 */
function isChainBreaker(node, version) {
    return methodDataUtil.isAliasOfMethod(version, 'value', astUtil.getMethodName(node))
}

/**
 * Returns whether the node is a call to the specified method or one of its aliases in the version
 * @param {Object} node
 * @param {number} version
 * @param {string} method
 * @returns {boolean}
 */
function isCallToMethod(node, version, method) {
    return methodDataUtil.isAliasOfMethod(version, method, astUtil.getMethodName(node))
}

/**
 * Returns whether or not the node is a call to a lodash wrapper method
 * @param {Object} node
 * @param {number} version
 * @returns {boolean}
 */
function isLodashWrapperMethod(node, version) {
    return methodDataUtil.isWrapperMethod(version, astUtil.getMethodName(node))
}

/**
 * Gets the 'isX' method for a specified type, e.g. isObject
 * @param {string} name
 * @returns {string|null}
 */
function getIsTypeMethod(name) {
    const types = ['number', 'boolean', 'function', 'Function', 'string', 'object', 'undefined', 'Date', 'Array', 'Error', 'Element']
    return _.includes(types, name) ? `is${_.capitalize(name)}` : null
}

/**
 * Returns whether or not the node is a call to a native collection method
 * @param {Object} node
 * @returns {boolean}
 */
function isNativeCollectionMethodCall(node) {
    return _.includes(['every', 'fill', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'map', 'reduce', 'reduceRight', 'some'], astUtil.getMethodName(node))
}

function getRawIterateeArgs(node, {method, version, callType}) {
    const iterateeIndex = methodDataUtil.getIterateeIndex(version, method)
    if (iterateeIndex === -1) {
        return []
    }
    if (methodDataUtil.getIterateeArrayType(version, method) === 'rest') {
        return node.arguments.slice(Math.max(iterateeIndex - (callType === 'chained' ? 1 : 0), 0))
    }
    const index = callType === 'chained' ? iterateeIndex - 1 : iterateeIndex
    return index >= 0 && node.arguments[index] ? [node.arguments[index]] : []
}

/**
 * Returns all iteratee AST nodes for a lodash call, unwrapping array/rest iteratees where supported.
 * @param {Object} node
 * @param {Object} info
 * @returns {Object[]}
 */
function getIterateeNodes(node, info) {
    const unwrapArray = Boolean(methodDataUtil.getIterateeArrayType(info.version, info.method))
    return _.flatMap(getRawIterateeArgs(node, info), arg =>
        unwrapArray && arg.type === 'ArrayExpression' ? arg.elements : [arg]
    ).filter(el => el && el.type !== 'SpreadElement')
}

/**
 * Gets the context's Lodash settings and a function and returns a visitor that calls the function for every Lodash or chain call
 * @param {LodashContext} lodashContext
 * @param {LodashReporter} reporter
 * @returns {NodeTypeVisitor}
 */
function getLodashMethodCallExpVisitor(lodashContext, reporter) {
    const {version} = lodashContext
    const reportCall = (node, method, callType) => {
        const info = {callType, method, version, lodashContext}
        reporter(node, getRawIterateeArgs(node, info)[0], info)
    }
    return function (node) {
        if (lodashContext.isLodashChainStart(node)) {
            let prevNode = node
            node = node.parent.parent
            while (astUtil.getCaller(node) === prevNode && astUtil.isMethodCall(node) && !isChainBreaker(node, version)) {
                reportCall(node, astUtil.getMethodName(node), 'chained')
                prevNode = node
                node = node.parent.parent
            }
        } else if (lodashContext.isLodashCall(node)) {
            reportCall(node, astUtil.getMethodName(node), 'method')
        } else if (version !== 3) {
            const method = lodashContext.getImportedLodashMethod(node)
            if (method) {
                reportCall(node, method, 'single')
            }
        }
    }
}

function isLodashCallToMethod(node, method, lodashContext) {
    return lodashContext.isLodashCall(node) && isCallToMethod(node, lodashContext.version, method)
}

function isCallToLodashMethod(node, method, lodashContext) {
    if (!node || node.type !== 'CallExpression') {
        return false
    }
    return isLodashCallToMethod(node, method, lodashContext) ||
        methodDataUtil.isAliasOfMethod(lodashContext.version, method, lodashContext.getImportedLodashMethod(node))
}

function getLodashMethodVisitors(context, lodashCallExpVisitor) {
    const lodashContext = new LodashContext(context)
    const visitors = lodashContext.getImportVisitors()
    visitors.CallExpression = getLodashMethodCallExpVisitor(lodashContext, lodashCallExpVisitor)
    return visitors
}

/**
 * @param context
 * @param checks
 * @param messages
 * @param [shorthandType]
 * @returns {{ImportDeclaration({source: *, specifiers: *}): void, VariableDeclarator({init: *, id: *}): void}}
 */
function getShorthandVisitors(context, checks, messages, shorthandType) {
    const isAlways = (context.options[0] || 'always') === 'always'
    return getLodashMethodVisitors(context, (node, iteratee, info) => {
        const {method, version, lodashContext} = info
        if (!methodDataUtil.methodSupportsShorthand(version, method, shorthandType)) {
            return
        }
        if (!isAlways && !iteratee) {
            if (checks.usesShorthand(node, undefined, method)) {
                context.report({node: node.callee.property || node.callee, message: messages.never})
            }
            return
        }
        getIterateeNodes(node, info).forEach(it => {
            const match = isAlways
                ? checks.canUseShorthand(it, lodashContext, {node, iteratee, ...info})
                : checks.usesShorthand(node, it, method)
            if (match) {
                context.report({node: it, message: isAlways ? messages.always : messages.never})
            }
        })
    })
}

/**
 *
 * @param context
 * @returns {LodashContext} a LodashContext for a given context
 */
function getLodashContext(context) {
    return new LodashContext(context)
}

module.exports = {
    isChainable,
    isChainBreaker,
    isCallToMethod,
    isLodashWrapperMethod,
    getIsTypeMethod,
    isNativeCollectionMethodCall,
    getLodashMethodCallExpVisitor,
    getIterateeNodes,
    isCallToLodashMethod,
    getShorthandVisitors,
    getLodashMethodVisitors,
    getLodashContext
}

/**
 @callback LodashReporter
 @param {Object} node
 @param {Object} iteratee
 @param {Object?} options
 */

/**
 @callback NodeTypeVisitor
 @param {Object} node
 */

/**
 * @typedef {Object} ShorthandChecks
 * @property {function} canUseShorthand
 * @property {function} usesShorthand
 */

/**
 * @typedef {object} ShorthandMessages
 * @property {string} always
 * @property {string} never
 */
