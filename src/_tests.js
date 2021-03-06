import { strictEqual, deepStrictEqual, throws } from "assert";
import { types, getSnapshot } from "mobx-state-tree";

import { ContextRepo } from "./core";
import { pack, unpack, unpackDecNew } from "./pack";
import { optionalModel, incrementLetterId } from "./model-utils";
import { app, fullApp } from "./_test-data";
const { repo, user } = fullApp;
export * from "./_test-data";

window.g = getSnapshot;

export const strictCreate = (Model, snapshot) => {
  const store = Model.create(snapshot);
  const postSnapshot = getSnapshot(store);
  const validate = (preSnap, postSnap) => {
    for (const prePropKey in preSnap) {
      const subPreSnap = preSnap[prePropKey];
      const subPostSnap = postSnap[prePropKey];
      if (typeof subPreSnap !== "object") {
        if (subPreSnap !== subPostSnap) {
          const message = `Possibly invalid: ${prePropKey}: ${subPreSnap}`;
          throw new Error(message);
          // console.warn(message);
        }
        continue;
      } else if (typeof subPostSnap !== "object") {
        const message = `Invalid object: ${prePropKey} - ${subPostSnap}`;
        throw new Error(message);
        // console.warn(message);
      } else {
        validate(subPreSnap, subPostSnap);
      }
    }
  };
  validate(snapshot, postSnapshot);
  return store;
};

const t = ContextRepo.create(repo);
window.t = t;
strictEqual(t.run("c")(3), 5);
strictEqual(t.run("e")(3)(5)(7), 15);
strictEqual(t.run("n")(11, 60), 61);
const counter = t.run("o");
strictEqual(counter(), 0);
strictEqual(counter(5), 5);
strictEqual(counter(5, { type: "INCREMENT" }), 6);
strictEqual(counter(5, { type: "DECREMENT" }), 4);
strictEqual(counter(5, { type: "Invalid action!" }), 5);

const packTest = pack(repo.main);
// console.log(packTest);
const unpackTest = unpack(packTest);
// console.log(unpackTest);
const packLen = JSON.stringify(packTest).length;
const fullLen = JSON.stringify(unpackTest).length;
console.log(fullLen, packLen, packLen / fullLen);
window.u = unpackTest;
const unpackStore = strictCreate(ContextRepo, { main: unpackTest });
window.u = unpackStore;

strictEqual(incrementLetterId("a"), "b");
strictEqual(incrementLetterId("z"), "a0");
strictEqual(incrementLetterId("a0"), "a1");
strictEqual(incrementLetterId("a1"), "a2");
strictEqual(incrementLetterId("zz"), "a00");
strictEqual(incrementLetterId("a0z"), "a10");
strictEqual(incrementLetterId("dog"), "doh");

const B = types.model("B", { a: types.string, z: types.number });
let l = 0;
const PrivTest = optionalModel("A", {
  b: "default",
  c: 3,
  d: NaN,
  e: types.optional(types.number, () => 7),
  f: types.optional(types.array(types.string), ["a", "b", "c"]),
  g: 0,
  h: types.optional(types.string, ""),
  i: types.optional(B, { z: 5, a: "what" }),
  j: false,
  k: true,
  l: types.optional(types.number, () => l++)
});
const privStore = PrivTest.create({ d: 2 });
const privSnapshot = getSnapshot(privStore);
strictEqual(privStore.b, "default");
deepStrictEqual(privSnapshot, { d: 2, e: 7, l: 1 });
// TODO: assert throws for erroneous private models

let idCounter = 0;
const DD = types.model("B", {
  id: types.optional(types.identifier(types.number), () => idCounter++),
  name: types.string
});
const D = types.model("D", {
  b: types.optional(DD, { name: "fuf" }),
  c: types.number,
  e: types.maybe(types.string)
});
throws(() => strictCreate(D, { c: 5, na: "bruv" }));
throws(() => strictCreate(D, { c: 5, badObj: { zoop: "poop" } }));
deepStrictEqual(strictCreate(D, { c: 7 }).toJSON(), {
  b: { id: 3, name: "fuf" },
  c: 7,
  e: null
});

const fullDecList = unpackDecNew(app.repo.m);
console.log(fullDecList);
deepStrictEqual(fullDecList[20].b[4], { val: "DECREMENT" });
