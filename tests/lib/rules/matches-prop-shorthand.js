'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const _ = require('lodash')
const rule = require('../../../src/rules/matches-prop-shorthand')
const ruleTesterUtil = require('../testUtil/ruleTesterUtil')
const {methodSupportsShorthand, getIterateeIndex, getIterateeArrayType} = require('../../../src/util/methodDataUtil')

const getMethodData = version => require(`../../../src/util/methodDataByVersion/${version}`)

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = ruleTesterUtil.getRuleTester()
const errors = {
    always: [{message: 'Prefer matches property syntax'}],
    never: [{message: 'Do not use matches property syntax'}]
}

const methodsThatSupportShorthand = _.flatMap([3, 4], version =>
    _(getMethodData(version))
        .map((data, method) => ({
            method,
            version,
            iterateeIndex: getIterateeIndex(version, method),
            iterateeArray: getIterateeArrayType(version, method)
        }))
        .filter(({method}) => methodSupportsShorthand(version, method, 'matchesProp'))
        .value()
)

const getExampleCodeWithPropShorthand = ({version, method, iterateeIndex, iterateeArray}) => {
    const prefix = ['arr', 'foo', 'bar'].slice(0, iterateeIndex)
    const shorthand = version === 3 ? '"id", 3' : (iterateeArray === 'rest' ? '[["id", 3]]' : '["id", 3]')
    return `var isPublic = _.${method}(${[...prefix, shorthand].join(', ')});`
}

const {fromOptions, fromVersion3, withDefaultPragma} = require('../testUtil/optionsUtil')
ruleTester.run('matches-prop-shorthand', rule, {
    valid: [
        'var isPublic = _.find([], function (i) { return x.id; });',
        'var r = _.findIndex(this.packages, {name: name});',
        'lang.fonts = _.filter(lang.fonts, function (font) { return font.permissions !== "legacy"});',
        'var isPublic = _.findLastIndex([], function (i) { return i.id == 3; });',
        'var different = _.reject(A, x => x.a === x.b)',
        '_.sortBy(arr, x => x.a === 1)',
        '_.sortBy(arr, [x => x.a === 1])',
        '_.orderBy(arr, x => x.a === 1, "asc")',
        '_.orderBy(arr, [x => x.a === 1], ["asc"])',
        '_.differenceBy(a, b, x => x.a === 1)',
        '_.intersectionBy(a, b, x => x.a === 1)',
        '_.unionBy(a, b, x => x.a === 1)',
        '_.xorBy(a, b, x => x.a === 1)',
        '_.overSome(x => x.a === 1, x => x.b === 2)',
        {
            code: 'var isPublic = _.findIndex(arr, (i) => {return i.id === b.id})',
            options: ['always', {onlyLiterals: true}]
        },
        ...[
            'var isPublic = _.find([], function(i) { return i.id === 3});',
            '_.sortBy(arr, ["a", "b"]);',
            '_.sortBy(arr, [x => x.a]);',
            '_.sortBy(arr, [["a", "b"]]);',
            '_(arr).sortBy(["a", "b"]).value();',
            '_.orderBy(arr, ["a", "b"], ["asc", "desc"]);',
            '_.orderBy(arr, [["a", "b"]], ["asc"]);',
            '_.differenceBy(a, [1, 2]);',
            '_.intersectionBy(a, [1, 2]);',
            '_.unionBy(a, [1, 2]);',
            '_.xorBy(a, [1, 2]);',
            '_.overEvery([]);',
            '_.overEvery(["a", "b"]);',
            '_.overSome(["a", 1]);',
            '_.over(["a", "b"]);',
            '_.overArgs(fn, ["a", "b"]);',
            ...['_.sortByOrder(arr, "a", true);', '_.sortByAll(arr, "a", "b");'].map(fromVersion3)
        ].map(fromOptions({options: ['never']}))
    ].map(withDefaultPragma).concat([{
        code: 'import {map} from "lodash"; function foo() {map(bar, function(x) { return x})}',
        languageOptions: {
            ecmaVersion: 6,
            sourceType: 'module'
        }
    }]),
    invalid: methodsThatSupportShorthand.map(({version, method, iterateeIndex, iterateeArray}) => ({
        code: getExampleCodeWithPropShorthand({version, method, iterateeIndex, iterateeArray}),
        options: ['never'],
        errors: errors.never,
        settings: {
            lodash: {version}
        }
    })).concat([{
        code: 'var isPublic = _.find([], function (i) { return i.id === 3; });',
        errors: errors.always
    }, {
        code: 'var isPublic = _.find([], _.matchesProperty("id", 3));',
        errors: errors.always
    }, {
        code: 'var isPublic = _.filter(arr, i => i.id === 3)',
        errors: errors.always
    }, {
        code: 'var isPublic = _.find([], i => i[0] === 3);',
        errors: errors.always
    }, {
        code: 'var isPublic = _.findIndex(arr, (i) => {return i.id === b.id})',
        errors: errors.always
    }, {
        code: 'var isPublic = _.filter(arr, i => i.id === 3)',
        options: ['always', {onlyLiterals: true}],
        errors: errors.always
    }, {
        code: '_.overEvery([i => i.id === 3, i => i.active === true]);',
        errors: [...errors.always, ...errors.always]
    }, {
        code: '_.overSome([["id", 3], ["active", true]]);',
        options: ['never'],
        errors: [...errors.never, ...errors.never]
    }, {
        code: '_.over([i => i.id === 3]);',
        errors: errors.always
    }, {
        code: '_.overArgs(fn, [i => i.id === 3]);',
        errors: errors.always
    }, {
        code: '_.overArgs(fn, [["id", 3]]);',
        options: ['never'],
        errors: errors.never
    }]).map(withDefaultPragma)
})
