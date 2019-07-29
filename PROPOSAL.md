# apollo-directives library proposal

resources used to learn:

- [Apollo Docs: Schema Directives](https://www.apollographql.com/docs/graphql-tools/schema-directives/)
- [graphql-tools repo: SchemaVisitor class](https://github.com/apollographql/graphql-tools/blob/master/src/schemaVisitor.ts)

the proposed library aims to resolve this quote, and commonly shared opinion, from the [Schema Directives docs](https://www.apollographql.com/docs/graphql-tools/schema-directives/#using-schema-directives):

> ...some of the examples may seem quite complicated. No matter how many tools and best practices you have at your disposal, it can be difficult to implement a non-trivial schema directive in a reliable, reusable way.

# documentation draft

- currently supported directive targets:
  - `FIELD`: `Type.field`, `Query.queryName`, `Mutation.mutationName`
  - `OBJECT`: `Type`, `Query`, `Mutation`
- **no current support for directive arguments**
- **each directive resolver must have a corresponding type definition in the schema**
- learn more about writing directive type defs
  - [official GraphQL directives spec]()
  - [apollo directives examples]()

## writing a directive type def

```graphql
# only able to tag Object Type Fields
directive @<directive name> on FIELD

# only able to tag Object Types
directive @<directive name> on OBJECT

# able to tag Object Types and Type Fields
directive @<directive name> on FIELD | OBJECT

# alternate accepted syntax
directive @<directive name> on
    | FIELD
    | OBJECT

# adding a description to a directive
"""
directive description

(can be multi-line)
"""
directive @<directive name> on FIELD | OBJECT

```

## using a directive type def

```graphql
# tagging an Object Type Field
# directive is executed when access to the tagged field(s) is made
type SomeType {
  aTaggedField: String @<directive name>
}

type Query {
  queryName: ReturnType @<directive name>
}

# tagging an Object Type
type SomeType @<directive name> {
  # the directive is applied to every field in this Type
  # directive is executed when any access to this Type (through queries / mutations / nesting) is made
}
```

## what should the directive be applied to?

- note that queries and resolver definitions are considered fields of the `Query` and `Mutation` objects
- directive needs to transform the result of a resolver
  - tag the directive on a field
  - any access to the field will execute the directive
  - examples
    - upper case a value
    - translate a value
    - format a date string
- directive needs to do some auxiliary behavior in a resolver
  - tag the directive on a field, object, or both
  - any queries that request values (directly or through nesting) from the tagged object and / or field will execute the directive
  - examples
    - enforcing authentication / authorization
    - logging

## using apollo-directives

- once you have written the directive type def you can implement its resolver using `createDirective` or `createSchemaDirectives`
- both tools make use of a [`directiveConfig` object](#directive-config)

```js
const directiveConfig = {
  hooks: { function, ... }, // optional, see signatures below
  name: string, // required, see details below
  resolverReplacer: function, // required, see signature below
};
```

### using createDirective

- use for creating a single directive resolver
- add the resolver to the Apollo Server `config.schemaDirectives` object
  - **the name must match the `<directive name>` from the corresponding directive definition in the schema**

```js
const { ApolloServer } = require("apollo-server-X");
const { createDirective } = require("apollo-directives");

// assumes @admin directive type def has been added to schema

const adminDirectiveConfig = {
  name: "admin",
  /*
    assumes the following function has been implemented somewhere:

    requireAdmin(originalResolver, { objectType, field }) ->
        adminResolverWrapper(root, args, context, info)
  */
  resolverReplacer: requireAdmin,
  hooks: { /* optional hooks */ }
};

const adminDirective = createDirective(adminDirectiveConfig);

const server = new ApolloServer({
  // typeDefs, resolvers, context, etc.
  ...
  schemaDirectives: {
    // the name must match the directive name in the type defs, @admin in this case
    admin: adminDirective,
  },
});
```

### using createSchemaDirectives

- accepts an array of [directive config](#directive-config) objects
- assign the result to `serverConfig.schemaDirectives` in the Apollo Server constructor
- creates each directive and provides them as the schemaDirectives object in `{ name: directiveConfig, ... }` form

```js
const { ApolloServer } = require("apollo-server-X");
const { createSchemaDirectives } = require("apollo-directives");

// assumes @admin directive type def has been added to schema

const adminDirectiveConfig = {
  name: "admin",
  /*
    assumes the following function has been implemented somewhere:

    requireAdmin(originalResolver, { objectType, field }) ->
        adminResolverWrapper(root, args, context, info)
  */
  resolverReplacer: requireAdmin,
  hooks: { /* optional hooks */ }
};

const server = new ApolloServer({
  // typeDefs, resolvers, context, etc.
  ...

  // pass an array of directive config objects
  // creates each directive and provides them as the schemaDirectives object in { name: directiveConfig, ... } form
  schemaDirectives: createSchemaDirectives([adminDirectiveConfig]),
});
```

### resolverReplacer and resolverWrapper

- the `resolverReplacer` and `resolverWrapper` functions are used in a higher order function chain that returns a `resolvedValue`
  - `resolverReplacer` -> `resolverWrapper` -> `resolvedValue`
- this sounds complicated but as seen below the implementation is intuitive
- only the directive behavior logic needs to be written in `resolverWrapper` which returns a valid `resolvedValue`
  - `resolverReplacer` has a standard boilerplate
  - `resolverReplacer` curries (HoF term for carrying arguments through the chain) the `originalResolver` and `directiveContext` so they are in scope in `resolverWrapper`
  - the `resolverWrapper` function receives the original field resolver's arguments `(root, args, context, info)`
- general example

```js
// this is the resolverReplacer function boilerplate
module.exports = (originalResolver, directiveContext) =>
// this is the resolverWrapper function that you implement
  function resolverWrapper(...args) { // put all the args into an array (makes it easier to use the .apply() syntax)

    // use any of the original resolver arguments as needed
    const [root, args, context, info] = args;

    // use the directive context as needed
    // access to information about the object or field that is being resolved
    const { objectType, field } = directiveContext;

    // implement directive logic

    // you can execute the original resolver (to get its return value):
    const result = originalResolver.apply(this, args);

    // or if the original resolver is async / returns a promise
    // if you use await dont forget to make the resolverWrapper async!
    const result = await originalResolver.apply(this, args);

    // process the result as dictated by your directive

    // return a resolved value (this is what is sent back in the API response)
    return resolvedValue;
  }
```

- annotated example from [Apollo Docs: Schema Directives - Uppercase String](https://www.apollographql.com/docs/graphql-tools/schema-directives/#uppercasing-strings)

```js
// the resolverReplacer function
const upperCaseReplacer = (originalResolver, { objectType, field }) =>
  // the resolverWrapper function
  async function upperCaseResolver(...args) {
    // execute the original resolver to store its output
    const result = await originalResolver.apply(this, args);

    // return the a valid resolved value after directive processing
    if (typeof result === "string") {
      return result.toUpperCase();
    }
    return result;
  };

module.exports = upperCaseReplacer;
```

- executing the `originalResolver` must be done using the `apply` syntax

```js
// args: [root, args, context, info]
result = originalResolver.apply(this, args);

// you can await if the original resolver is async / returns a promise
result = await originalResolver.apply(this, args);
```

## directive config

- `directiveConfig` is validated and will throw an Error for missing or invalid properties
- shape

```js
const directiveConfig = {
  name: string, // required, see details below
  resolverReplacer: function, // required, see signature below
  hooks: { function, ... }, // optional, see signatures below
};
```

### resolverReplacer

- a higher order function used to bridge information between `createDirective` and the directive logic in the `resolverWrapper`
- used in `createDirective` `config` parameter
- **may not be** `async`
- **must return a function that implements the `resolverWrapper` signature** (the same as the standard Apollo resolver)
- signature

```js
// directiveContext: { objectType, field }
resolverReplacer(originalResolver, directiveContext) ->
    resolverWrapper(root, args, context, info)
```

- boilerplate

```js
const resolverReplacer = (originalResolver, { objectType, field }) =>
  function resolverWrapper(root, args, context, info) {};
```

### resolverWrapper

- a higher order function used to transform the result or behavior of the `originalResolver`
- **must be returned from `resolverReplacer`**
- **must be a function declaration not an arrow function**
- **may be** `async`
- signature:

```js
resolverWrapper(root, args, context, info) -> resolved value
```

### name

- unique identifier for the directive
- **must be unique across all directives registered on the schema**
- used for improving performance when directives are registered on server startup
  - added as `_<nameIsWrapped` property on the `objectType`
  - you can read more from this [Apollo Docs: Schema Directives section](https://www.apollographql.com/docs/graphql-tools/schema-directives/#enforcing-access-permissions)
- when using the `createSchemaDirectives` utility
  - used as the directive identifier in the `schemaDirectives` object
  - **must use the same name as the directive in your type defs**
  - ex: directive type def `@admin` then `name = "admin"`

### hooks

- provide access to each step of the process as the directive resolver is applied during server startup

#### onVisitObject

- called once for each Object Type definition that the directive has been applied to
- called before the directive is applied to the Object Type
- signature

```js
onVisitObject(objectType);
```

#### onVisitFieldDefinition

- called once for each Object Type field definition that the directive has been applied to
- called before the directive is applied to the field
- signature

```js
onvisitFieldDefinition(field, details);
```

- `objectType` can be accessed from `details.objectType`

#### onApplyToObjectType

- called as the directive is being applied to an object or field
  - called once immediately after `onVisitObject` or `onVisitFieldDefinition` is called
- technical note: using the directive name, `config.name`, the internal method applying the directive will exit early instead of reapplying the directive
  - directives that are applied to both an object and its field(s) will trigger this behavior
  - `onApplyToObjectType` will still be called even if it exits early
  - this is a performance measure that you can read more about from this [Apollo Docs: Schema Directives section](https://www.apollographql.com/docs/graphql-tools/schema-directives/#enforcing-access-permissions)
- signature

```js
onApplyToObjectType(objectType);
```

## the objectType and field shapes

- these two objects can be found in the `reaplceResolver(originalResolver, directiveContext)` parameter
  - `directiveContext: { objectType, field }`
- provide access to information about the object type or field as the directive is being executed on it

### objectType

```json
objectType {

}
```

### field

```json
field {

}
```

# implementations draft

- currently covers Object Types (`OBJECT` target) and Object Field Types (`FIELD` target)
- currently does not support directive arguments

## createDirective

- individual directive: `createDirective`
- build the directive then assign as an entry in Apollo Server `config.schemaDirectives` object

```js
const createDirective = config => {
  const { name, resolverReplacer, hooks = {} } = validateConfig(config);
  const { onVisitObject, onVisitFieldDefinition, onApplyToObjectType } = hooks;

  return class Directive extends SchemaDirectiveVisitor {
    visitObject(objectType) {
      if (onVisitObject) onVisitObject(objectType);
      this.applyToObjectType(objectType);
    }

    visitFieldDefinition(field, details) {
      if (onVisitFieldDefinition) onVisitFieldDefinition(field, details);
      this.applyToObjectType(details.objectType);
    }

    applyToObjectType(objectType) {
      if (onApplyToObjectType) onApplyToObjectType(objectType);

      // exit early if the directive has already been applied to the object type
      if (objectType[`_${name}DirectiveApplied`]) return;
      objectType[`_${name}DirectiveApplied`] = true; // otherwise set _<name>DirectiveApplied flag

      const fields = objectType.getFields();

      Object.values(fields).forEach(field => {
        // mapped scalar fields (without custom resolvers) will use the defaultFieldResolver
        const originalResolver = field.resolve || defaultFieldResolver;

        // replace the original resolver with the resolverWrapper returned from resolverReplacer
        field.resolve = resolverReplacer(originalResolver, {
          field,
          objectType,
        });
      });
    }
  };
};
```

## createSchemaDirectives

- builds a `schemaDirectives` object in `{ name: directiveConfig, ... ]` form
- accepts an array of directive config objects
- assign its output to Apollo Server `serverConfig.schemaDirectives`

```js
const createSchemaDirectives = directiveConfigs =>
  directiveConfigs.reduce(
    (schemaDirectives, directiveConfig) => ({
      ...schemaDirectives,
      [directiveConfig.name]: createDirective(directiveConfig),
    }),
    {},
  );
```

## validateConfig

```js
const validateConfig = config => {
  const { name, resolverReplacer } = config;

  let message;
  if (!name || !resolverReplacer) {
    message = "config.name is required";
  } else if (!resolverReplacer) {
    message = "config.resolverReplacer is required";
  } else if (typeof name !== "string") {
    message = "config.name must be a string";
  } else if (typeof resolverReplacer !== "function") {
    message = "config.resolverReplacer must be a function";
  } else {
    return config;
  }

  const error = new Error(message);
  error.name = "CreateDirectiveError";

  throw error;
};
```

# notes on deriving the pattern

- the `visitX` methods are executed on server startup to register the respective directive implementation
- each `visitX` method should utilize (at minimum) a function that wraps the `objectType`
  - **`applyToObjectType` function **
  - executes the function reassignment for `field.resolve`
    - **`resolverReplacer` function**
  - captures the resolver wrapper function returned by the `resolverReplacer` function
    - **`resolverWrapper` function**
- adding a marker flag property to the Object prevents redundant application of a directive that has already been applied
- for cases where more than one `visitX` method / directive target like `OBJECT` and `FIELD` are used
  - [apollo docs discussing this concept](https://www.apollographql.com/docs/graphql-tools/schema-directives/#enforcing-access-permissions)
  - best practice to implement and utilize the `applyToObjectType` function even if only a single visitor method / directive target is used
    - consistency of usage pattern
    - makes extending the directive to multiple locations less error-prone
  - **`_<name>DirectiveApplied` property** should be added directly to the `objectType` in the `applyToObjectType` function
    - each directive needs a unique `<name>` because an Object Type can be tagged with multiple directives
    - **`<name>` must be unique across all directive `SchemaVisitor` subclass implementations to avoid naming collisions**

## directives vs higher order resolver wrappers

- HoF have traditionally been much easier to write
- directives are known to be complicated to implement and even moreso to explain / understand
- but directives have the benefit of being documented and visible across the team's stack by being written directly in the schema, the contract of your API
- AED extends the abstraction that `SchemaVisitor` began
- finally makes the process of designing and implementing directives painless and with easy to follow code
- AED makes it easy to transition existing HoF wrappers into directives
  - most HoF implementations can be easily transition into the `resolverReplacer` and `resolverWrapper` signatures
  - after the HoF is transition the consumer just has to implement the directive type defs and provide their corresponding `name`

## [internal] visitObject method

- called during server startup directive registration chain
  - once for each Object Type definition that the directive has been tagged on
- exposed through `onVisitObject` hook
  - signature: `onVisitObject(objectType)`
  - called before the `applyToObjectType` method is executed

## [internal] visitFieldDefinition method

- called during server startup directive registration chain
  - once for each Object Type field definition that the directive has been tagged on
- exposed through `onvisitFieldDefinition` hook
  - signature: `onvisitFieldDefinition(field, details)`
    - `details.objectType` access
  - called before the `applyToObjectType` method is executed

## [internal] applyToObjectType function

- called during server startup directive registration chain

## resolverReplacer and resolverWrapper

- the `resolverReplacer` and `resolverWrapper` functions are used in a higher order function chain which must return a `resolvedValue` that is allowed by the schema's definitions
  - `resolverReplacer` -> `resolverWrapper` -> `resolvedValue`
- the library consumer only has to implement directive behavior logic in `resolverWrapper` and return a valid `resolvedValue`
  - the `resolverWrapper` function receives the original field resolver's arguments `(root, args, context, info)`
  - `resolverReplacer` curries the `originalResolver` and `directiveContext` so they are in scope in `resolverWrapper`
  - they can be used as needed in when implementing the directive logic

### [library] resolverReplacer function

- implemented by library consumer
- a higher order function used to bridge information between `createDirective` and the consumer's directive resolver logic
- provided by library consumer in `createDirective` `config` parameter
- **may not be** `async`
- **must return a function that implements the `resolverWrapper` signature** (the same as the standard Apollo resolver)
- signature

```js
// directiveContext: { objectType, field }
resolverReplacer(originalResolver, directiveContext) ->
    resolverWrapper(root, args, context, info)
```

- example

```js
module.exports = (originalResolver, { objectType, field }) =>
  function resolverWrapper(...args) {
    // implement directive logic

    return resolvedValue;
  };
```

### [library] resolverWrapper function

- a higher order function used to transform the result or behavior of the `originalResolver`
- **must be returned from `resolverReplacer`**
- **must be a function declaration not an arrow function**
- **may be** `async`
- signature:

```js
resolverWrapper(root, args, context, info) -> resolved value
```

- annotated example from [Apollo Docs: Schema Directives - Uppercase String](https://www.apollographql.com/docs/graphql-tools/schema-directives/#uppercasing-strings)

```js
async function (...args) {
  // use any of the original resolver arguments as needed
  // args: [root, args, context, info]

  // execute the original resolver to store its output
  const result = await originalResolver.apply(this, args);

  // implement other directive logic as needed

  // return the resolved value after directive processing
  if (typeof result === "string") {
    return result.toUpperCase();
  }
  return result;
};
```

## the objectType and field shapes

### objectType

- can be found in:
  - `visitObject(objectType)`: first parameter
  - `visitFieldDefinition(field, details)`: second parameter
    - through `details.objectType`
  - `resolverReplacer(originalResolver, directiveContext)`: second parameter
    - through `directiveContext.objectType`
- shape

```json

```

### field

- can be found in: `visitFieldDefinition` first parameter
- shape

```json

```
