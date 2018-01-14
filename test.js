const base = {
  i: { 0: 3, 1: 5, 2: 12 },
  0: [{ o: "." }, { o: "g" }, "Math"],
  1: [{ o: "." }, { r: 0 }, "pow"],
  2: [{ r: 1 }, { i: 0 }, 2],
  3: [{ r: 1 }, { i: 1 }, 2],
  4: [{ o: "." }, { r: 0 }, "sqrt"],
  5: [{ o: "+" }, { r: 2 }, { r: 3 }],
  6: [{ r: 4 }, { r: 5 }],
  7: [{ r: 1 }, { i: 2 }, 3],
  8: { f: [6, 0, 1] }
};

const calc = (repo, id) => {
  if (!Array.isArray(repo[id])) {
    const def = repo[id];
    return defn(repo, ...def.f);
  }

  const calcNode = node => {
    if (typeof node !== "object") {
      return node;
    }

    if ("i" in node) {
      return repo.i[node.i];
    }

    switch (node.o) {
      case "g":
        return global;
      case ".":
        return function(a, b) {
          return a[b];
        };
      case "+":
        return function(a, b) {
          return a + b;
        };
    }

    return calc(repo, node.r);
  };

  const nodes = repo[id];
  // console.log(nodes);
  // if (!Array.isArray(nodes)) {
  // return calcNode(nodes);
  // }

  const [funcNode, ...argNodes] = nodes;
  const funcVal = calcNode(funcNode);

  if (typeof funcVal !== "function") {
    // TODO: could this possibly have different behavior?
    return funcVal;
  }

  const argVals = argNodes.map(calcNode);
  return funcVal(...argVals);
};

const defn = (repo, id, ...argIds) => {
  return (...args) => {
    for (let i = 0; i < argIds.length; i++) {
      repo.i[argIds[i]] = args[i];
    }

    return calc(repo, id);
  };
};

const a = calc(base, 2);
console.log(a, global.Math.pow(3, 2));

const b = defn(base, 7, 2);
console.log(b(9), Math.pow(9, 3));

const d = calc(base, 8);
console.log(d(11, 60), 61);
console.log(d(7, 24), 25);
console.log(d());
console.log(d(3));
