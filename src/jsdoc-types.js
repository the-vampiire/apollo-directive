/**
 * @typedef {Object} DirectiveConfig
 * @property {Hooks} [hooks]
 * @property {string} name
 * @property {replaceResolverSignature} resolverReplacer
 */

/**
 * @typedef {Object} DirectiveContext
 * @property {ObjectType} objectType
 * @property {ObjectTypeField} field
 */

/**
 * @typedef {Object} Hooks
 * @property {visitObjectHookSignature} [onVisitObject]
 * @property {visitObjectHookSignature} [onApplyDirective]
 * @property {visitFieldHookSignature} [onVisitFieldDefinition]
 */

/**
 * @typedef {function} resolverSignature
 * @param {object} root
 * @param {object} args
 * @param {object} context
 * @param {object} info
 */

/**
 * @typedef {resolverSignature} resolverWrapperSignature
 */

/**
 * @typedef {function} replaceResolverSignature
 * @param {resolverSignature} originalResolver
 * @param {DirectiveContext} directiveContext
 * @returns {resolverWrapperSignature} resolverWrapper function
 */

/**
 * @typedef {function} visitObjectHookSignature
 * @param {ObjectType} objectType
 * @returns {void}
 */

/**
 * @typedef {function} visitFieldHookSignature
 * @param {ObjectTypeField} field
 * @param {{ objectType: ObjectType }} details
 * @returns {void}
 */

module.exports = {};
