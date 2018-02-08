import { types, getSnapshot, flow } from "mobx-state-tree";
import { isObservableArray } from "mobx";
import produce from "immer";

import { ContextUserReader } from "./user";
import {
  asContext,
  mixinModel,
  optionalModel,
  incrementLetterId
} from "./model-utils";
import { pack, unpack } from "./pack";
import * as Color from "./color";

const gRef = "g";
const dot = ".";
const array = "[";
const object = "{";
const mutate = "@";

const and = "a";
const or = "o";

const add = "+";
const minus = "-";
const times = "*";
const divide = "/";
const mod = "%";

const ifOp = "?";
const switchOp = "s";
const forOp = "f";

const lessThan = "<";
const greaterThan = ">";
const lessThanOrEqual = "v";
const greaterThanOrEqual = "^";

const equal = "=";
const strictEqual = "e";
const notEqual = "!";
const notStrictEqual = "n";

const importOp = "m";
const newOp = "w";
const typeofOp = "t";
const instanceOfOp = "i";
const classOp = "c";
const thisOp = "h";
const undef = "u";

const throwOp = () => {
  throw new Error("Special-cased op...this shouldn't be run!");
};
const opFuncs = {
  [ifOp]: throwOp,
  [switchOp]: throwOp,
  [and]: throwOp,
  [or]: throwOp,
  [gRef]: typeof window !== "undefined" ? window : global,
  [undef]: undefined,
  [dot](obj, key) {
    try {
      return obj[key];
    } catch (ex) {
      return ex;
    }
  },
  [add](...nums) {
    let sum;
    for (let i = 0; i < nums.length; i++) {
      if (i === 0) {
        sum = nums[i];
      } else {
        sum += nums[i];
      }
    }
    return sum;
  },
  [minus](...nums) {
    let sum;
    for (let i = 0; i < nums.length; i++) {
      if (i === 0) {
        sum = nums[i];
      } else {
        sum -= nums[i];
      }
    }
    return sum;
  },
  [array](...items) {
    return items;
  },
  [object](...kvs) {
    const obj = {};
    for (let i = 0; i < kvs.length; i = i + 2) {
      obj[kvs[i]] = kvs[i + 1];
    }
    return obj;
  },
  [lessThan](a, b) {
    return a < b;
  },
  [strictEqual](a, b) {
    return a === b;
  }
};

const ops = [];
for (const op in opFuncs) {
  ops.push(op);
}

export const Pkg = mixinModel(optionalModel({ resolved: false }))("Pkg", {
  id: types.identifier(types.string),
  path: types.string
})
  .actions(self => {
    const { system } = getEnv(self);
    return {
      afterCreate: flow(function*() {
        yield system.import(self.path);
        // TODO: error handling (retry?)
        self.resolved = true;
      })
    };
  })
  .views(self => ({
    get out() {
      if (resolved) {
        return system.get(self.path);
      }
      return Pkg;
    },
    equivalent(other) {
      return other === self || other.pkg === self;
    },
    get name() {
      return self.path.replace("https://unpkg.com/", "").split("/")[0];
    },
    get color() {
      return Color.dep;
    }
  }));

const PkgRef = types
  .model("PkgRef", { pkg: types.reference(Pkg) })
  .views(self => ({
    get out() {
      return self.pkg.out;
    },
    get name() {
      return self.pkg.name;
    },
    get color() {
      return self.pkg.color;
    }
  }));

const Val = types
  .model("Val", {
    val: types.union(types.number, types.string, types.boolean, types.null)
  })
  .views(self => ({
    get out() {
      return self.val;
    },
    get name() {
      const { val } = self;
      if (typeof val === "string") {
        return `'${val}'`;
      } else {
        return String(val);
      }
    },
    get color() {
      return Color.val;
    },
    get width() {
      return Math.ceil((self.name.length + 3) / 6);
    }
  }))
  .actions(self => ({
    select(val) {
      if (typeof self.val === "number") {
        const numVal = Number(val);
        if (isNaN(numVal)) {
          return;
        }
        self.val = numVal;
        return;
      }
      self.val = val;
    }
  }));

const LocaleNameSet = types.map(types.string);
const Named = optionalModel({
  names: types.optional(types.map(LocaleNameSet), {})
});

const defaultOpNames = {
  [gRef]: "🌐",
  [dot]: "•",
  [ifOp]: "IF",
  [switchOp]: "SW",
  [and]: "&&",
  [or]: "||",
  [strictEqual]: "===",
  [undef]: "U"
};

const Op = mixinModel(Named)("Op", {
  op: types.enumeration(ops)
}).views(self => ({
  get out() {
    const { op } = self;
    if (!(op in opFuncs)) {
      throw new Error(self.op + " op not yet implemented!");
    }
    const opFunc = opFuncs[op];
    return opFunc;
  },
  get name() {
    // TODO: look up from context user
    const { op } = self;
    return defaultOpNames[op] || op;
  },
  get color() {
    return Color.op;
  },
  get width() {
    return Math.ceil((self.name.length + 3) / 6);
  }
}));

const integerType = types.refinement(types.number, n => n >= 0 && !(n % 1));
const Arg = mixinModel(ContextUserReader)("Arg", {
  arg: types.refinement(
    types.array(types.union(types.string, integerType)),
    path => {
      const { length } = path;
      if (typeof path[0] === "number" && typeof path[1] === "number") {
        return length === 2;
      }
      for (let i = 0; i < length; i++) {
        if (i === length - 1) {
          if (typeof path[i] !== "number") {
            return false;
          }
        } else if (typeof path[i] !== "string") {
          return false;
        }
      }
      return true;
    }
  )
}).views(self => ({
  get name() {
    return self.user.pathName(self.arg);
  },
  get color() {
    return Color.input;
  },
  get width() {
    return Math.ceil((self.name.length + 3) / 6);
  }
}));

const Ref = mixinModel(ContextUserReader)("Ref", {
  ref: types.union(
    types.string,
    types.refinement(
      types.array(types.union(integerType, types.string)),
      ref => {
        const { length } = ref;
        if (typeof ref[0] === "number") {
          return length === 2 && typeof ref[1] === "string";
        }
        for (let i = 0; i < length; i++) {
          if (typeof ref[i] !== "string") {
            return false;
          }
        }
        return true;
      }
    )
  )
}).views(self => ({
  get name() {
    const { ref } = self;
    return self.user.pathName(ref) || `(${ref.slice()})`;
  },
  get color() {
    return Color.pending;
  },
  get width() {
    return Math.ceil((self.name.length + 3) / 6);
  }
}));

const Node = types.union(Val, Op, Arg, PkgRef, Ref);

const Line = types.refinement(types.array(Node), l => l.length);

const walkPath = (base, up, walk) => {
  const finalPath = [...base];
  while (up--) {
    finalPath.pop();
  }
  for (const token of walk) {
    finalPath.push(token);
  }
  return finalPath;
};

const Dec = types.map(types.union(types.string, Line, types.late(() => Dec)));

const Param = optionalModel("Param", {
  type: types.maybe(types.string)
});

export const Group = mixinModel(
  optionalModel({
    name: types.maybe(types.string),
    decs: types.optional(types.array(types.string), [])
  })
)("Group", {
  id: types.identifier(types.string)
});

export const Repo = types
  .model("Repo", {
    main: Dec,
    params: types.optional(types.map(types.array(types.maybe(Param))), {}),
    groups: types.optional(types.map(Group), {}),
    comments: types.optional(types.map(types.array(types.string)), {})
  })
  .views(self => ({
    get allParams() {
      const plainParams = getSnapshot(self.params);
      return produce(plainParams, draft => {
        const fillParamsFrom = dec => {
          if (isObservableArray(dec)) {
            for (const node of dec) {
              if ("arg" in node) {
                const { arg } = node;
                const scopePath = arg.slice(0, -1);
                const index = arg[arg.length - 1];
                if (!draft[scopePath]) {
                  draft[scopePath] = [];
                }
                draft[scopePath][index] = {};
              }
            }
            return;
          }
          dec.forEach((_, id) => {
            fillParamsFrom(dec.get(id));
          });
        };
        fillParamsFrom(self.main);
      });
    },
    get out() {
      return self.run();
    },
    run(...initialPath) {
      const { main } = self;
      const gen = (path = [], scopes = {}) => {
        let dec = main;
        for (const id of path) {
          dec = dec.get(id);
        }
        if (isObservableArray(dec)) {
          const parseNode = node => {
            if ("out" in node) {
              return node.out;
            } else if ("ref" in node) {
              const { ref } = node;
              if (typeof ref === "string") {
                return gen([ref], scopes);
              } else {
                return gen(ref, scopes);
              }
            } else if ("arg" in node) {
              const { arg } = node;
              const scopePath = arg.slice(0, -1);
              const index = arg[arg.length - 1];
              return scopes[scopePath][index];
            }
          };
          // special-case handling of conditional ops
          // for short-circuiting ("lazy evaluation") flow control behavior
          // as would be expected in plain JS
          const [{ op }] = dec;
          switch (op) {
            case ifOp:
              const cond = parseNode(dec[1]);
              if (cond) {
                return parseNode(dec[2]);
              } else {
                return parseNode(dec[3]);
              }
              break;
            case and:
              let andResult;
              for (let i = 1; i < dec.length; i++) {
                andResult = parseNode(dec[i]);
                if (!andResult) {
                  return andResult;
                }
              }
              return andResult;
              break;
            case or:
              let orResult;
              for (let i = 1; i < dec.length; i++) {
                orResult = parseNode(dec[i]);
                if (orResult) {
                  return orResult;
                }
              }
              return orResult;
              break;
            case switchOp:
              // TODO: try to generate a proper switch statement
              // but this requires "eval" or the Function constructor
              const [, switcherNode, ...casePairs] = dec;
              const { length } = casePairs;
              const switcher = parseNode(switcherNode);
              for (let i = 0; i < length; i += 2) {
                if (switcher === parseNode(casePairs[i])) {
                  return parseNode(casePairs[i + 1]);
                }
              }
              if (length % 2) {
                return parseNode(casePairs[length - 1]);
              }
              // throwing for now, but maybe that's too strict
              throw new Error(
                "Switch case not matched. No default case defined."
              );
              break;
          }
          // TODO: short-circuit "for"?
          const outs = dec.map(parseNode);
          const [head, ...args] = outs;
          return typeof head === "function" ? head(...args) : head;
        }
        return function(...params) {
          scopes[path] = params;
          const retLine = gen([...path, "R"], scopes);
          return retLine;
        };
      };
      return gen(initialPath);
    }
  }))
  .actions(self => {
    const getDec = path => {
      let dec = self.main;
      for (const id of path) {
        dec = dec.get(id);
      }
      return dec;
    };
    return {
      addToDec(scopePath, item) {
        const scope = getDec(scopePath);
        const ids = scope.keys();
        const lastId = ids[ids.length - 1];
        let newId = incrementLetterId(lastId);
        while (scope.get(newId)) {
          newId = incrementLetterId(newId);
        }
        scope.set(newId, item);
        return [...scopePath, newId];
      }
    };
  });

export const ContextRepo = asContext(Repo);
