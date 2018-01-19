import { types } from "mobx-state-tree";
// import { Dependency, Input, Hole, ContextRepo } from "./core";
import { Declaration, Pkg, ContextRepo } from "./repo";

export const formatOut = out => {
  if (out instanceof Error) {
    return out.message;
  } else if (out === Pkg) {
    return "...";
  } else if (typeof out === "function") {
    // TODO: more elegant display of functions and higher-order functions
    return "func";
  } else if (out === undefined || Number.isNaN(out)) {
    return String(out);
  } else {
    return JSON.stringify(out);
  }
};

let cursorIdCounter = 0; // TODO: better way to determine IDs?

const UI = ContextRepo.refModel("UI", {
  selectedCellIndex: types.optional(types.number, 0)
})
  .views(self => {
    const cursorId = `CURSOR-${cursorIdCounter++}`;

    return {
      get repo() {
        return self[ContextRepo.key];
      },
      get selectedCell() {
        return self.baseCells[self.selectedCellIndex];
      },
      get cursorCell() {
        const { input, selectedCell } = self;
        const { x, y, width } = selectedCell;

        return {
          x,
          y,
          width,
          input,
          cursor: true,
          key: cursorId
        };
      },
      get allCells() {
        return self.baseCells.concat(self.cursorCell || []);
      },
      get baseKeyMap() {
        return {
          1: {
            2: { label: "▲", action: self.moveUp }
          },
          2: {
            1: { label: "◀", action: self.moveLeft },
            2: { label: "▼", action: self.moveDown },
            3: { label: "▶", action: self.moveRight }
          }
        };
      },
      get cellMap() {
        const base = {
          y: {},
          x: {}
        };
        const yx = base.y;
        const xy = base.x;

        const { baseCells } = self;
        const { length } = baseCells;

        for (let i = 0; i < length; i++) {
          const cell = baseCells[i];
          if (!cell.selectable) {
            continue;
          }

          const { x, y } = cell;

          if (!yx[y]) {
            yx[y] = { min: 0, max: 0 };
          }

          yx[y][x] = i;

          if (x > yx[y].max) {
            yx[y].max = x;
          }
          if (x < yx[y].min) {
            yx[y].min = x;
          }

          if (!xy[x]) {
            xy[x] = { min: 0, max: 0 };
          }

          xy[x][y] = i;

          if (y > xy[x].max) {
            xy[x].max = y;
          }
          if (y < xy[x].min) {
            xy[x].min = y;
          }
        }

        return base;
      }
    };
  })
  .actions(self => ({
    selectCellIndex(index) {
      self.selectedCellIndex = index;
    },
    moveBy(step = +1, axis = "x") {
      const crossAxis = axis === "x" ? "y" : "x";
      // debugger;
      const currentCell = self.selectedCell;
      if (!currentCell) {
        return;
      }

      const crossAxisMap = self.cellMap[crossAxis];
      const crossAxisPos = currentCell[crossAxis];

      const crossAxisSet = crossAxisMap[crossAxisPos];
      if (!crossAxisSet) {
        return;
      }

      let axisPos = currentCell[axis];
      const { min } = crossAxisSet;
      const { max } = crossAxisSet;

      while (min <= axisPos && axisPos <= max) {
        axisPos += step;
        const foundIndex = crossAxisSet[axisPos];
        if (foundIndex !== undefined) {
          self.selectCellIndex(foundIndex);
          return;
        }
      }

      // NOTE: Short-circuiting wraparound logic below  at the moment (allow param to set?)
      return;

      if (axis === "y") {
        return;
      }

      let foundIndex;
      if (axisPos > max) {
        foundIndex = crossAxisSet[min];
      } else if (axisPos < min) {
        foundIndex = crossAxisSet[max];
      }
      if (foundIndex !== undefined) {
        self.selectCellIndex(foundIndex);
      }
    },
    moveRight() {
      self.moveBy();
    },
    moveLeft() {
      self.moveBy(-1);
    },
    moveDown() {
      self.moveBy(+1, "y");
    },
    moveUp() {
      self.moveBy(-1, "y");
    }
  }));

export const viewModel = (...args) => types.compose(types.model(...args), UI);

export const cursorify = (baseCell, key, input) => {
  const { x, y, width, forLink, nodeIndex, gotoCellKey } = baseCell;

  return {
    x,
    y,
    width,
    forLink,
    nodeIndex,
    gotoCellKey,
    input,
    cursor: true,
    key: `CURSOR-${key}`
  };
};