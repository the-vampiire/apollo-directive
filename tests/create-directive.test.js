const { createDirective } = require("../src");

const {
  shouldApplyToField,
  markDirectiveApplied,
  validateDirectiveConfig,
} = require("../src/utils");

jest.mock("../src/utils.js", () => ({
  shouldApplyToField: jest.fn(),
  markDirectiveApplied: jest.fn(),
  validateDirectiveConfig: jest.fn(config => config),
}));

/* eslint-disable no-param-reassign */
const mockMethods = (directiveInstance, methodsToMock) => {
  Object.keys(methodsToMock).forEach((methodName) => {
    directiveInstance[methodName] = jest.fn();
  });
};
const replaceMethods = (directiveInstance, originalMethods) => {
  Object.entries(originalMethods).forEach((entry) => {
    const [methodName, originalMethod] = entry;
    directiveInstance[methodName] = originalMethod;
  });
};

const resolverReplacer = jest.fn();
const directiveName = "directiveName";
const objectType = { name: "Query " };
const field = { name: "getPerson", resolve: "original resolver" };
const directiveArgs = { first: "first arg", second: ["second", "arg", "list"] };

describe("core export: createDirective", () => {
  const directiveConfig = {
    name: directiveName,
    resolverReplacer,
    hooks: {
      onVisitObject: jest.fn(),
      onApplyDirective: jest.fn(),
      onVisitFieldDefinition: jest.fn(),
    },
  };

  const ApolloDirective = createDirective(directiveConfig);
  const directiveInstance = new ApolloDirective({
    name: directiveName,
    args: directiveArgs,
  });

  it("validates the directiveConfig object and returns an ApolloDirective class", () => {
    expect(validateDirectiveConfig).toHaveBeenCalled();
    expect(directiveInstance.constructor.name).toBe("ApolloDirective");
  });

  it("can be used without providing hooks", () => {
    const hooklessDirective = new (createDirective({
      ...directiveConfig,
      hooks: undefined,
    }))({ name: directiveName, args: directiveArgs });

    expect(hooklessDirective.constructor.name).toBe("ApolloDirective");
  });

  describe("visitObject behavior", () => {
    const { applyToObject, createDirectiveContext } = directiveInstance;

    beforeAll(() => {
      jest.clearAllMocks();
      mockMethods(directiveInstance, { applyToObject, createDirectiveContext });
      directiveInstance.visitObject(objectType);
    });
    afterAll(() => replaceMethods(directiveInstance, {
      applyToObject,
      createDirectiveContext,
    }));

    it("calls onVisitObject hook providing it the directiveContext with objectType", () => {
      expect(directiveInstance.createDirectiveContext).toHaveBeenCalledWith(
        objectType,
      );
      expect(directiveConfig.hooks.onVisitObject).toHaveBeenCalledWith(
        directiveInstance.createDirectiveContext(),
      );
    });

    it("requests the directive be applied to the objectType object", () => expect(directiveInstance.applyToObject).toHaveBeenCalledWith(objectType));
  });

  describe("visitFieldDefinition behavior", () => {
    const { replaceFieldResolver, createDirectiveContext } = directiveInstance;

    beforeAll(() => {
      jest.clearAllMocks();
      mockMethods(directiveInstance, {
        replaceFieldResolver,
        createDirectiveContext,
      });
      directiveInstance.visitFieldDefinition(field, { objectType });
    });
    afterAll(() => replaceMethods(directiveInstance, {
      replaceFieldResolver,
      createDirectiveContext,
    }));

    it("calls onVisitFieldDefinition hook providing it the directiveContext with objectType and field", () => {
      expect(directiveInstance.createDirectiveContext).toHaveBeenCalledWith(
        objectType,
        field,
      );
      expect(directiveConfig.hooks.onVisitFieldDefinition).toHaveBeenCalledWith(
        directiveInstance.createDirectiveContext(),
      );
    });

    it("requests the directive be applied to the field object", () => expect(directiveInstance.replaceFieldResolver).toHaveBeenCalledWith(
      objectType,
      field,
    ));
  });

  describe("createDirectiveContext: builds a context object with information about the directive", () => {
    const expectedContext = {
      objectType,
      name: directiveName,
      args: directiveArgs,
    };

    test("given an objectType: returns { objectType, name, args }", () => expect(directiveInstance.createDirectiveContext(objectType)).toEqual(
      expectedContext,
    ));
    test("given an objectType and field: returns { objectType, field, name, args }", () => expect(
      directiveInstance.createDirectiveContext(objectType, field),
    ).toEqual({
      field,
      ...expectedContext,
    }));
  });

  describe("applyToObject behavior", () => {
    const { replaceFieldResolver } = directiveInstance;
    const mockObjectFields = {
      first: "first",
      second: "second",
      third: "third",
    };
    const mockObjectType = { getFields: () => mockObjectFields };

    beforeAll(() => {
      jest.clearAllMocks();
      mockMethods(directiveInstance, { replaceFieldResolver });
      directiveInstance.applyToObject(mockObjectType);
    });
    afterAll(() => replaceMethods(directiveInstance, { replaceFieldResolver }));

    // see utils.shouldApplyToField for notes
    it("sets the replaceFieldResolver method flag indicating the directive application is occurring from the Object Type level", () => expect(directiveInstance.replaceFieldResolver).toHaveBeenCalledWith(
      mockObjectType,
      mockObjectFields.first,
      true,
    ));

    it("requests the directive be applied for each of the objectType's fields", () => {
      const numFields = Object.keys(mockObjectFields).length;
      expect(directiveInstance.replaceFieldResolver).toHaveBeenCalledTimes(
        numFields,
      );
    });
  });

  describe("replaceFieldResolver behavior", () => {
    const { createDirectiveContext } = directiveInstance;
    beforeAll(() => mockMethods(directiveInstance, { createDirectiveContext }));
    afterAll(() => replaceMethods(directiveInstance, { createDirectiveContext }));

    describe("when the directive has already been applied to the field and is being reapplied from  the Object Type level", () => {
      it("exits early", () => {
        shouldApplyToField.mockImplementationOnce(() => false);
        directiveInstance.replaceFieldResolver(objectType, field, true);
        expect(markDirectiveApplied).not.toHaveBeenCalled();
      });
    });

    describe("when the directive should be applied to the field", () => {
      let originalResolver;
      beforeAll(() => {
        originalResolver = field.resolve;
        shouldApplyToField.mockImplementationOnce(() => true);
        directiveInstance.replaceFieldResolver(objectType, field);
      });

      it("calls onApplyDirective hook providing it the directiveContext with objectType and field", () => {
        expect(directiveInstance.createDirectiveContext).toHaveBeenCalledWith(
          objectType,
          field,
        );
        expect(directiveConfig.hooks.onApplyDirective).toHaveBeenCalledWith(
          directiveInstance.createDirectiveContext(),
        );
      });

      it("replaces the field's original resolver using the resolverReplacer providing it the originalResolver and directiveContext", () => {
        expect(resolverReplacer).toHaveBeenCalledWith(
          originalResolver,
          directiveInstance.createDirectiveContext(),
        );
      });

      it("marks the field as having the directive applied", () => expect(markDirectiveApplied).toHaveBeenCalled());
    });
  });
});
