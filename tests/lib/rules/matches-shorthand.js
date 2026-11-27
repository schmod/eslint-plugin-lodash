'use strict'
// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const _ = require('lodash')
const rule = require('../../../src/rules/matches-shorthand')
const ruleTesterUtil = require('../testUtil/ruleTesterUtil')
const {methodSupportsShorthand, getIterateeIndex, getIterateeArrayType} = require('../../../src/util/methodDataUtil')
const {fromOptions, withDefaultPragma} = require('../testUtil/optionsUtil')

const getMethodData = version => require(`../../../src/util/methodDataByVersion/${version}`)

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = ruleTesterUtil.getRuleTester()
const messages = {
    always: 'Prefer matches syntax',
    never: 'Do not use matches syntax'
}

const methodsThatSupportShorthand = _.flatMap([3, 4], version =>
    _(getMethodData(version))
        .map((data, method) => ({
            method,
            version,
            iterateeIndex: getIterateeIndex(version, method),
            iterateeArray: getIterateeArrayType(version, method)
        }))
        .filter(({method}) => methodSupportsShorthand(version, method, 'matches'))
        .value()
)

const getExampleCodeWithShorthand = ({method, iterateeIndex}, inArray = false) => {
    const prefix = ['arr', 'foo', 'bar'].slice(0, iterateeIndex === 'last' ? 2 : iterateeIndex)
    const shorthand = inArray ? '[{b: {c: compId}}]' : '{b: {c: compId}}'
    return `_.${method}(${[...prefix, shorthand].join(', ')});`
}

const invalidExamples = [
    {
        code: 'var isPublic = _.find([], function (i) { return i.id === id; });',
        errors: [{message: messages.always, column: 27}]
    }, {
        code: 'var isPublic = _.find([], function (i) { return id === i.id; });',
        errors: [{message: messages.always, column: 27}]
    }, {
        code: 'var isPublic = _.find([], function (i) { return i.id === 3 && i.a === "string" && {a: 10} === i.b;});',
        errors: [{message: messages.always, column: 27}]
    }, {
        code: 'var isPublic = _.find([], _.matches({id: id}));',
        errors: [{message: messages.always, column: 27}]
    }, {
        code: 'var isPublic = _.filter(arr, i => i.id === 3 && i.name === name)',
        errors: [{message: messages.always, column: 30}]
    }, {
        code: 'var isPublic = _.findIndex(arr, (i) => {return i.id === id})',
        errors: [{message: messages.always, column: 33}]
    }, {
        code: 'var isPublic = _.some(arr, (i) => {return i.id === 3 && i.a === "string" && {a: 10} === i.b})',
        errors: [{message: messages.always, column: 28}]
    },
    {
        code: '_.findLastIndex(arr, function(i) { return i[b].c === compId && i[b].d === x});',
        options: ['always', 3, true],
        errors: [{message: messages.always, column: 22}]
    },
    {
        code: 'var isPublic = _.find([], function(i) { return i.id === 3 && i.a === "b"; });',
        options: ['always', 1, true, {onlyLiterals: true}],
        errors: [{message: messages.always, column: 27}]
    },
    {
        code: '_.orderBy(arr, [i => i.id === 3 && i.name === name, "age"], ["desc", "asc"]);',
        errors: [{message: messages.always, column: 17}]
    },
    {
        code: '_.orderBy(arr, [{id: 3}, "age"], ["desc", "asc"]);',
        options: ['never'],
        errors: [{message: messages.never, column: 17}]
    },
    {
        code: '_(arr).orderBy([i => i.id === 3 && i.name === name], ["desc"]).value();',
        errors: [{message: messages.always, column: 17}]
    },
    {
        code: '_.sortBy(arr, [i => i.id === 3 && i.name === name, i => i.a === 1 && i.b === 2]);',
        errors: [{message: messages.always, column: 16}, {message: messages.always, column: 52}]
    },
    {
        code: '_.sortBy(arr, {id: 3}, {a: 1});',
        options: ['never'],
        errors: [{message: messages.never, column: 15}, {message: messages.never, column: 24}]
    },
    {
        code: '_.overEvery([i => i.id === 3 && i.name === name, i => i.active === true && i.role === "admin"]);',
        errors: [{message: messages.always, column: 14}, {message: messages.always, column: 50}]
    },
    {
        code: '_.overSome([{id: 3}, {active: true}]);',
        options: ['never'],
        errors: [{message: messages.never, column: 13}, {message: messages.never, column: 22}]
    },
    {
        code: '_.over([i => i.id === 3 && i.name === name]);',
        errors: [{message: messages.always, column: 9}]
    },
    {
        code: '_.overArgs(fn, [i => i.id === 3 && i.name === name]);',
        errors: [{message: messages.always, column: 17}]
    },
    {
        code: '_.differenceBy(a, b, i => i.id === 3 && i.name === name);',
        errors: [{message: messages.always, column: 22}]
    },
    {
        code: '_.keyBy(arr, i => i.id === 3 && i.name === name);',
        errors: [{message: messages.always, column: 14}]
    }
].map(withDefaultPragma)

const map = _.flatMap(methodsThatSupportShorthand, spec => {
    const codes = [getExampleCodeWithShorthand(spec)]
    if (spec.iterateeArray) {
        codes.push(getExampleCodeWithShorthand(spec, true))
    }
    return codes.map(code => ({
        code,
        options: ['never'],
        errors: [{message: messages.never}],
        settings: {lodash: {version: spec.version}}
    }))
}).map(withDefaultPragma)

ruleTester.run('matches-shorthand', rule, {
    valid: [
        'var isPublic = _.find([], function (i) { return x.id; });',
        'var r = _.findIndex(this.packages, {name: name});',
        'var isPublic = _.map([], function (i) { return i.id + "?"; });',
        'lang.fonts = _.filter(lang.fonts, function (font) { return font.permissions !== "legacy"});',
        'var isPublic = _.findLastIndex([], function (i) { return i.id == 3 && f(i); });',
        {
            code: 'var b = 1; var isPublic = _.find([], function(i) { return i.id === 3 && i.a === b; });',
            options: ['always', 1, true, {onlyLiterals: true}]
        },
        ...[
            'var isPublic = _.find([], function(i) { return i.id === 3});',
            '_.orderBy(arr, ["name", "age"], ["asc", "desc"]);',
            '_.sortBy(arr, ["name", "age"]);',
            '_.differenceBy(a, [1, 2]);'
        ].map(fromOptions({options: ['never']}))
    ].map(withDefaultPragma),
    invalid: [
        ...map,
        ...invalidExamples
    ]
})
