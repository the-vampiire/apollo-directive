this library aims to resolve this quote, and commonly shared opinion, from the [Schema Directives docs](https://www.apollographql.com/docs/graphql-tools/schema-directives/#using-schema-directives):

> ...some of the examples may seem quite complicated. No matter how many tools and best practices you have at your disposal, it can be difficult to implement a non-trivial schema directive in a reliable, reusable way.

# concept

implementing a directive used to be a very tedious and confusing process. with the help of the `graphql-tools` `SchemaVisitor` class a big leap in the direction of usability was made. yet even with this class available directives were still difficult enough to implement that most authors opted for alternatives like higher order function resolver wrappers. these wrappers, while simple, are undocumented in the schema and can be a source of confusion for team members and API consumers experiencing "hidden" behavior.

what are the benefits of using implementing proper directives vs using higher order resolver wrappers?

- your directives are officially documented as part of the schema itself
- every team member across the stack is aware of them
- there is no "hidden" magic that may confuse your API's consumers

this library makes the process of implementing directives as simple as writing any other resolver in your Apollo Server. the heavy lifting has been abstracted even further (over the `graphql-tools` `SchemaVisitor` class) so that you only need to write your `directiveResolver` and the rest is taken care of! for those authors who are currently using higher order resolver wrappers transitioning to using actual directives is trivial.

# current support

- currently supported directive targets:
  - `OBJECT`: directives applied to `Type` definitions
    - the directive is applied to all fields of the Object Type
  - `FIELD_DEFINITION`: directives applied to `Type.field` definitions
    - the directive is applied only to the specific Object Type Field
    - note this includes `Query.queryName` and `Mutation.mutationName`
    - `Query` and `Mutation` are considered Object Types
- **each directive resolver must have a corresponding type definition in the schema**
  - see the [schema directive type definitions and usage](#schema-directive-type-definitions-and-usage) section for notes and examples

# usage

```sh
$ npm install apollo-directive
```

- once you have [written the directive type def](#schema-directive-type-definitions-and-usage) you can implement its resolver using the two package utilities: `createDirective` or `createSchemaDirectives`
- both tools make use of a [`directiveConfig` object](#directive-config)

```js
const directiveConfig = {
  name: string, // required, the directive name
  resolverReplacer: function, // required, see details below
  hooks: { function, ... }, // optional, see details below
};
```

## resolverReplacer and directiveResolver

- the `resolverReplacer` and `directiveResolver` functions are used in a higher order function chain that returns a `resolvedValue`
  - `resolverReplacer` -> `directiveResolver` -> `resolvedValue`
- this sounds complicated but as seen below the implementation on your end is as intuitive as writing any other resolver
  - think of the `directiveResolver` as a middleware for your resolvers
  - it receives the original resolver's arguments and should return a resolved value
- `resolverReplacer` is used to replace the original resolver with your `directiveResolver`
  - used as a bridge between `apollo-directive` and your `directiveResolver`
  - `resolverReplacer` brings the `originalResolver` and `directiveContext` parameters into the scope of your `directiveResolver`
- the `directiveResolver` function receives the original field resolver's arguments
  - `(root, args, context, info)`
  - these can be abbreviated into an array as `(...resolverArgs)` to make using the `apply()` syntax easier (see below)
- **the `directiveResolver` must be a function declaration not an arrow function**
  - its declaration must be returned from the `resolverReplacer`

```js
// this is the resolverReplacer function boilerplate
// it should return a directiveResolver function declaration
const resolverReplacer = (originalResolver, directiveContext) =>
  /* async */ function directiveResolver(...resolverArgs) {
    // implement your directive logic in here

    // use any of the original resolver arguments as needed by destructuring
    const [root, args, context, info] = resolverArgs;

    // use the directive context as needed
    // access to information about the directive itself
    const {
      name, // the name of the directive
      objectType, // the Object Type the directive is applied to
      field, // the Object Type Field the directive is applied to
      // can be aliased to avoid namespace conflicts
      args: directiveArgs, // arguments supplied to the directive itself
    } = directiveContext;

    // you can execute the original resolver (to get its original return value):
    const result = originalResolver.apply(this, args);

    // or if the original resolver is async / returns a promise use await
    // if you use await dont forget to make the directiveResolver async!
    const result = await originalResolver.apply(this, args);

    // process the result as dictated by your directive

    // return a resolved value (this is what is sent back in the API response)
    return resolvedValue;
  }
```

- executing the `originalResolver` must be done using the `apply` syntax

```js
// resolverArgs: [root, args, context, info]
result = originalResolver.apply(this, resolverArgs);

// you can await if the original resolver is async / returns a promise
result = await originalResolver.apply(this, resolverArgs);

// if you dont spread the parameters in the directiveResolver
// meaning you have directiveResolver(root, args, context, info)
// they must be placed into an array in the .apply() call
result = originalResolver.apply(this, [root, args, context, info]);
```

## using createDirective

- use for creating a single directive resolver
- add the resolver to the Apollo Server `directiveCschemaDirectives` object
  - **the name must match the `<directive name>` from the corresponding directive type definition in the schema**

```js
const { ApolloServer } = require("apollo-server-X");
const { createDirective } = require("apollo-directives");

// assumes @admin directive type def has been added to schema

const adminDirectiveConfig = {
  name: "admin", // @<name> from directive type def
  resolverReplacer: requireAdminReplacer, // see resolverReplacer docs below
  hooks: { /* optional hooks */ }
};

const adminDirective = createDirective(adminDirectiveConfig);

const server = new ApolloServer({
  // typeDefs, resolvers, context, etc.
  ...
  schemaDirectives: {
    // the name key must match the directive name in the type defs, @admin in this case
    admin: adminDirective,
  },
});
```

## using createSchemaDirectives

- accepts an array of [directive config](#directive-config) objects
- assign the result to `serverConfig.schemaDirectives` in the Apollo Server constructor
- creates each directive and provides them as the schemaDirectives object in `{ name: directiveResolver, ... }` form

```js
const { ApolloServer } = require("apollo-server-X");
const { createSchemaDirectives } = require("apollo-directives");

// assumes @admin directive type def has been added to schema

const adminDirectiveConfig = {
  name: "admin", // @<name> from directive type def
  resolverReplacer: requireAdminReplacer, // see resolverReplacer docs below
  hooks: { /* optional hooks */ }
};

const server = new ApolloServer({
  // typeDefs, resolvers, context, etc.
  ...

  // pass an array of directive config objects to create the schemaDirectives object
  schemaDirectives: createSchemaDirectives([adminDirectiveConfig]),
});
```

# directive config

- `directiveConfig` is validated and will throw an Error for missing or invalid properties
- shape

```js
const directiveConfig = {
  name: string, // required, see details below
  resolverReplacer: function, // required, see signature below
  hooks: { function, ... }, // optional, see signatures below
};
```

## resolverReplacer

- a higher order function used to bridge information between `createDirective` and the directive logic in the `directiveResolver`
- used in `createDirective` `config` parameter
- **may not be** `async`
- **must return a function that implements the `directiveResolver` signature** (the same as the standard Apollo resolver)
- signature

```js
resolverReplacer(originalResolver, directiveContext) ->
    directiveResolver(root, args, context, info) -> resolved value
```

- boilerplates to get started quickly
  - most directive resolvers will need to use promises inside so these functions are `async`
    - it is not required that the `directiveResolver` be async
  - `resolverArgs` is an array of arguments to the original resolver `[root, args, context, info]`

```js
const resolverReplacer = (originalResolver, directiveContext) =>
  async function directiveResolver(...resolverArgs) {
    // implement directive logic
    // return the resolved value
  };

module.exports = (originalResolver, directiveContext) =>
  async function directiveResolver(...resolverArgs) {
    // implement directive logic
    // return the resolved value
  };
```

### directiveContext

- the `directiveContext` object provides access to information about the directive itself
- you can use this information in the `directiveResolver` as needed
- see the [objectType] and [field] shapes

```js
const {
  name, // the name of the directive
  objectType, // the Object Type the directive is applied to
  field, // the Object Type Field the directive is applied to
  // you can alias the args as directiveArgs to avoid naming conflicts in the directiveResolver
  args: directiveArgs, // object of arguments supplied to the directive itself
} = directiveContext;
```

### directiveResolver

- a higher order function used to transform the result or behavior of the `originalResolver`
- **must be a function declaration not an arrow function**
- **may be** `async` if you need to work with promises
- **must return** a valid resolved value (valid according to the schema)
  - for example if your schema dictates that the resolved value may not be `null` then you must support this rule by not returning `undefined` or `null` from the `directiveResolver`
- signature:

```js
directiveResolver(root, args, context, info) -> resolved value

directiveResolver(...resolverArgs) -> resolved value
```

## name

- the name of the directive (same as the name in the directive type definition in the schema)
- used for improving performance when directives are registered on server startup
  - added as `_<name>DirectiveApplied` property on the `objectType`
  - you can read more from this [Apollo Docs: Schema Directives section](https://www.apollographql.com/docs/graphql-tools/schema-directives/#enforcing-access-permissions)
- when using the `createSchemaDirectives` utility
  - used as the directive identifier in the `schemaDirectives` object
  - ex: directive type def `@admin` then `name = "admin"`

## hooks

- provide access to each step of the process as the directive resolver is applied during server startup
- purely observational, nothing returned from these functions is used
- can be used for logging or debugging

### onVisitObject

- called once for each Object Type definition that the directive has been applied to
- called before the directive is applied to the Object Type
- receives the [directiveContext](#directiveContext) object
  - note that `directiveContext.field` will be `undefined` for this hook
- signature

```js
onVisitObject(directiveContext) -> void
```

### onVisitFieldDefinition

- called once for each Object Type field definition that the directive has been applied to
- called before the directive is applied to the field
- receives the [directiveContext](#directiveContext) object
- signature

```js
onvisitFieldDefinition(directiveContext) -> void
```

## onApplyDirective

- called immediately before the directive is applied
  - directive applied to an Object Type (`on OBJECT`): called once for each field in the Object
  - directive applied to a field (`on FIELD_DEFINITION`): called once for the field
  - called after `onVisitObject` or `onVisitFieldDefinition` is executed
- receives the [directiveContext](#directiveContext) object
- technical note: using the directive name, `directiveConfig.name`, the internal method applying the directive will exit early for the following case:
  - directives that are applied to both an object and its individual field(s) will exit early to prevent duplicate application of the directive
  - `onApplyDirective` will not be called a second time for this case due to exiting early
  - this is a performance measure that you can read more about from this [Apollo Docs: Schema Directives section](https://www.apollographql.com/docs/graphql-tools/schema-directives/#enforcing-access-permissions)
- signature

```js
onApplyDirective(directiveContext) -> void;
```

# schema directive type definitions and usage

- learn more about writing directive type defs or see the examples below
  - [official GraphQL Schema Directives spec](https://graphql.github.io/graphql-spec/draft/#sec-Type-System.Directives)
  - [apollo directives examples](https://www.apollographql.com/docs/graphql-tools/schema-directives/#implementing-schema-directives)

## creating schema directive type defs

```graphql
# only able to tag Object Type Fields
directive @<directive name> on FIELD_DEFINITION

# only able to tag Object Types
directive @<directive name> on OBJECT

# able to tag Object Types and Object Type Fields
directive @<directive name> on FIELD_DEFINITION | OBJECT

# alternate accepted syntax
directive @<directive name> on
    | FIELD_DEFINITION
    | OBJECT

# adding a description to a directive
"""
directive description

(can be multi-line)
"""
directive @<directive name> on FIELD_DEFINITION | OBJECT
```

## using directives in your schema type defs

- applying directives is as simple as "tagging" them onto an Object Type or one of its fields

```graphql
# tagging an Object Type Field
type SomeType {
  # the directive resolver is executed when access to the tagged field(s) is made
  aTaggedField: String @<directive name>
}

type Query {
  queryName: ReturnType @<directive name>
}

# tagging an Object Type
type SomeType @<directive name> {
  # the directive is applied to every field in this Type
  # the directive resolver is executed when any access to this Type's fields (through queries / mutations / nesting) are made
}

# multiple directives can be tagged, space-separated
type SomeType @firstDirective @secondDirective {
  # applying a directive to a list type must be to the right of the closing bracket
  aTaggedField: [TypeName] @<directive name>
}
```

## example of defining and using a schema directive

- a basic example

```graphql
"""
returns all String scalar values in upper case
"""
directive @upperCase on FIELD_DEFINITION | OBJECT

# the Object Type itself is tagged
# all of the fields in this object will have the @upperCase directive applied
type User @upperCase {
  id: ID!
  username: String!
  friends: [User!]!
}

type Dog {
  id: ID!
  # only Dog.streetAddress will have the directive applied
  streetAddress: String! @upperCase
}
```

- a more complex example of an authentication / authorization directive
- this directive can receive a `requires` argument with an array of `Role` enum elements
  - directives argument(s) are available in the `directiveResolver` through `directiveContext.args`
- the `requires` argument has a default value set as `[ADMIN]`
  - if no argument is provided (just `@auth`) then this default argument will be provided as `["ADMIN"]`

```graphql
# example of a directive to enforce authentication / authorization
# you can provide a default value just like arguments to any other definition
directive @auth(requires: [Role] = [ADMIN]) on FIELD_DEFINITION | OBJECT

# assumes a ROLE enum has been defined
enum Role {
  USER # any authenticated user
  SELF # the authenticated user only
  ADMIN # admins only
}

# apply the directive to an entire Object Type
# because no argument is provided the default ([ADMIN]) is used
type PaymentInfo @auth {
  # all of the fields in this Object Type will have the directive applied requiring ADMIN permissions
}

type User {
  # authorization for the authenticated user themself or an admin
  email: EmailAddress! @auth(requires: [SELF, ADMIN])
}
```

## what targets should the directive be applied to?

- note that queries and resolver type definitions are considered fields of the `Query` and `Mutation` Object Types
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

# examples

- annotated example from [Apollo Docs: Schema Directives - Uppercase String](https://www.apollographql.com/docs/graphql-tools/schema-directives/#uppercasing-strings)
- corresponds to the following directive type def

```graphql
directive @upperCase on FIELD_DEFINITION | OBJECT
```

```js
// the resolverReplacer function
const upperCaseReplacer = (originalResolver, directiveContext) =>
  // the directiveResolver function
  async function upperCaseResolver(...resolverArgs) {
    // execute the original resolver to store its output for directive processing below
    const result = await originalResolver.apply(this, args);

    // return the a valid resolved value after directive processing
    if (typeof result === "string") {
      return result.toUpperCase();
    }
    return result;
  };

module.exports = upperCaseReplacer;
```

# the objectType and field shapes

- these two objects can be found in the [`directiveContext` object](#directiveContext)
- provide access to information about the Object Type or Object Type Field the directive is being applied to
- use the following shapes as a guide or use the [hooks](#hooks) to log these in more detail as needed
  - to expand the objects (incluidng AST nodes) in your log use `JSON.stringify(objectType | field, null, 2)`

## objectType

- Object Type information

```js
const {
  name,
  type,
  description,
  isDeprecated,
  deprecationReason,
  astNode, // AST object
  _fields, // the Object Type's fields { fieldName: fieldObject }
} = objectType;
```

## field

- Object Type Field information

```js
const {
  name,
  type,
  description,
  isDeprecated,
  deprecationReason,
  astNode, // AST object
} = field;
```

## astNode

- it is unlikely you will need to access this property
- this is a parsed object of the AST for the Object Type or Object Type Field

```js
const {
  kind,
  description: {
    kind,
    value,
    block,
    loc: { start, end },
  },
  name: {
    kind,
    value,
    loc: { start, end },
  },
  interfaces: [],
  directives: [{
    kind,
    name: {
      kind,
      value,
      loc: { start, end },
    },
    arguments: [{
      kind,
      name: {
        kind,
        value,
        loc: { start, end },
      }
    }, ...],
  }, ...],
  fields: [{
    type,
    name,
    description,
    args,
    astNode: [
      // for non-scalar types
    ]
  }, ...],
} = astNode;
```
