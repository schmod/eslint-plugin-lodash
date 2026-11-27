'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const rule = require('../../../src/rules/prop-shorthand')
const ruleTesterUtil = require('../testUtil/ruleTesterUtil')


// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = ruleTesterUtil.getRuleTester()
const messages = {
    always: 'Prefer property shorthand syntax',
    never: 'Do not use property shorthand syntax'
}
const {withDefaultPragma} = require('../testUtil/optionsUtil')
ruleTester.run('prop-shorthand', rule, {
    valid: [
        'var ids = _.map([], function (i) { return x.id; });',
        'var ids = _.map([], function (i) { return i.id + "?"; });',
        'var publicModules = _(files).map(readModule).compact().value();',
        'var ids = _.map([], function (i) { return i[k]; });',
        'var r = _.map([], function() { return React.PropTypes.object; })',
        'var r = _.map([])',
        'var r = _.map(results, result => result[result.length - 1]);',
        'var x = _.mixedInMethod()',
        {
            code: 'var r = _.map([], function(x) { return x.id})',
            options: ['never']
        },
        {
            code: 'const r = _.map([], x => x.id)',
            options: ['never']
        },
        {
            code: '_.overSome([["a", 1]]);',
            options: ['never']
        },
        {
            code: '_.orderBy(arr, null, ["desc"]);',
            options: ['never']
        },
        {
            code: '_.find(arr, "a", 1);',
            options: ['never'],
            settings: {lodash: {version: 3}}
        }
    ].map(withDefaultPragma),
    invalid: [{
        code: 'var ids = _(arr).map(function (i) { return i.a.b.c; });',
        errors: [{message: messages.always, column: 22}]
    }, {
        code: 'var ids = _(arr).map(_.property("a.b.c"));',
        errors: [{message: messages.always, column: 22}]
    }, {
        code: 'var ids = _.map([], function (i) { return i.a; });',
        errors: [{message: messages.always, column: 21}]
    }, {
        code: 'var ids = _(arr).filter({id: 3}).map("i.a.b");',
        options: ['never'],
        errors: [{message: messages.never, column: 38}]
    }, {
        code: 'var ids = _(arr).map("x").map("y").map(function (i) { return i.a.b; });',
        errors: [{message: messages.always, column: 40}]
    }, {
        code: 'var ids = _.map([], function (i) { return i["a"]; });',
        errors: [{message: messages.always, column: 21}]
    }, {
        code: 'var ids = _.map([], i => i.a.b.c);',
        errors: [{message: messages.always, column: 21}]
    }, {
        code: 'var ids = _.sortBy(arr, i => i.a);',
        errors: [{message: messages.always}]
    }, {
        code: 'var ids = _.sortBy(arr, [i => i.a, i => i.b]);',
        errors: [{message: messages.always, column: 26}, {message: messages.always, column: 36}]
    }, {
        code: 'var ids = _.sortBy(arr, i => i.a, i => i.b);',
        errors: [{message: messages.always, column: 25}, {message: messages.always, column: 35}]
    }, {
        code: 'var ids = _.sortBy(arr, ["a", "b"]);',
        options: ['never'],
        errors: [{message: messages.never, column: 26}, {message: messages.never, column: 31}]
    }, {
        code: 'var ids = _.sortBy(arr, "a", "b");',
        options: ['never'],
        errors: [{message: messages.never, column: 25}, {message: messages.never, column: 30}]
    }, {
        code: 'var ids = _.sortBy(arr, [["a", "b"]]);',
        options: ['never'],
        errors: [{message: messages.never, column: 26}]
    }, {
        code: 'var ids = _.orderBy(arr, [i => i.a, i => i.b], ["asc", "desc"]);',
        errors: [{message: messages.always, column: 27}, {message: messages.always, column: 37}]
    }, {
        code: 'var ids = _.orderBy(arr, ["a", "b"], ["asc", "desc"]);',
        options: ['never'],
        errors: [{message: messages.never, column: 27}, {message: messages.never, column: 32}]
    }, {
        code: 'var ids = _.orderBy(arr, "a", "desc");',
        options: ['never'],
        errors: [{message: messages.never, column: 26}]
    }, {
        code: 'var ids = _.orderBy(arr, [["a", "b"]], ["asc"]);',
        options: ['never'],
        errors: [{message: messages.never, column: 27}]
    }, {
        code: 'var fn = _.overEvery([i => i.a, i => i.b]);',
        errors: [{message: messages.always, column: 23}, {message: messages.always, column: 33}]
    }, {
        code: 'var fn = _.overEvery(["a", "b"]);',
        options: ['never'],
        errors: [{message: messages.never, column: 23}, {message: messages.never, column: 28}]
    }, {
        code: 'var res = _.differenceBy(a, b, i => i.id);',
        errors: [{message: messages.always, column: 32}]
    }, {
        code: 'var res = _.differenceBy(a, b, "id");',
        options: ['never'],
        errors: [{message: messages.never, column: 32}]
    }, {
        code: 'var res = _.find(arr, "a", 2);',
        options: ['never'],
        errors: [{message: messages.never, column: 23}]
    }, {
        code: 'var ids = _.map(arr, "id");',
        options: ['never'],
        errors: [{message: messages.never, column: 22}]
    }].map(withDefaultPragma)
})
