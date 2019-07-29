/**
 * @typedef {Object} DirectiveConfig
 * @property {Hooks} [hooks]
 * @property {string} name the name of the directive (must match directive type definition)
 * @property {resolverReplacerSignature} resolverReplacer
 */

/**
 * @typedef {Object} DirectiveContext
 * @description additional context related to the directive implementation
 * @property {ObjectType} objectType Object Type the directive is applied to
 * @property {ObjectTypeField} field Object Type Field the directive is applied to
 * @property {string} name directive name
 * @property {Object} args directive arguments
 */

/**
 * @typedef {Object} Hooks
 * @description optional hooks fired during directive registration on server startup
 * @property {hookSignature} [onVisitObject] fired just before an Object Type directive registration
 * @property {hookSignature} [onApplyDirective] fired as the directive is being applied
 * @property {hookSignature} [onVisitFieldDefinition] fired just before an Object Type Field directive registration
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
 * @typedef {function} resolverReplacerSignature
 * @description a higher order function that bridges directive registration with your resolverWrapper function
 * @param {resolverSignature} originalResolver the field's original resolver function
 * @param {DirectiveContext} directiveContext
 * @returns {resolverWrapperSignature} resolverWrapper function
 */

/**
 * @typedef {function} hookSignature
 * @param {DirectiveContext} directiveContext
 * @returns {void}
 */
module.exports = {};
