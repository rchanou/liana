import { types } from "mobx-state-tree";
import { Pkg, ContextRepo } from "./core";
import { ContextUser } from "./user";
import { optionalModel } from "./model-utils";

export const calcWidth = text =>
  typeof text !== "string" ? 1 : Math.ceil((text.length + 3) / 6);

// export const formatOut = out => {
//   if (out instanceof Error) {
//     return out.message;
//   } else if (out === Pkg) {
//     return "...";
//   } else if (typeof out === "function") {
//     // TODO: more elegant display of functions and higher-order functions
//     return "func";
//   } else if (out === undefined || Number.isNaN(out)) {
//     return String(out);
//   } else {
//     return JSON.stringify(out);
//   }
// };

let cursorIdCounter = 0; // TODO: better way to determine IDs?

export const UI = optionalModel("UI", {
  selectedCellIndex: 0,
  repo: ContextRepo,
  user: ContextUser
})
  .views(self => {
    const cursorId = `CURSOR-${cursorIdCounter++}`;
    return {
      get selectedCell() {
        const { baseCells } = self;
        let i = self.selectedCellIndex;
        let selectedCell = baseCells[i];
        while ((!selectedCell || !selectedCell.selectable) && i) {
          selectedCell = baseCells[i--];
        }
        return selectedCell;
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
      get cells() {
        return self.baseCells.concat(self.cursorCell || []);
      },
      get activeCells() {
        return self.cells;
      },
      get baseKeyMap() {
        return {
          1: {
            2: { label: "▲", action: self.moveUp }
          },
          2: {
            0: {
              label: "Jump to Top",
              action() {
                self.selectCellIndex(0);
              }
            },
            1: { label: "◀", action: self.moveLeft },
            2: { label: "▼", action: self.moveDown },
            3: { label: "▶", action: self.moveRight }
          },
          3: {
            0: {
              label: "Jump to End",
              action() {
                const { baseCells } = self;
                let i = baseCells.length;
                let toCellIndex;
                while (toCellIndex === undefined && --i) {
                  if (self.baseCells[i].selectable) {
                    toCellIndex = i;
                  }
                }
                self.selectCellIndex(i);
              }
            }
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
          const { x, y, width = 0, height = 0 } = cell;
          for (let cy = y; cy <= y + height; cy++) {
            for (let cx = x; cx <= x + width; cx++) {
              if (!yx[cy]) {
                yx[cy] = { min: 0, max: 0 };
              }
              if (!xy[cx]) {
                xy[cx] = { min: 0, max: 0 };
              }
              yx[cy][cx] = i;
              xy[cx][cy] = i;
              if (cx > yx[cy].max) {
                yx[cy].max = cx;
              }
              if (cx < yx[cy].min) {
                yx[cy].min = cx;
              }
              if (cy > xy[cx].max) {
                xy[cx].max = cy;
              }
              if (cy < xy[cx].min) {
                xy[cx].min = cy;
              }
            }
          }
        }
        // TODO: logic to fill out "edge" cells for less jumpiness
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
      const currentCell = { ...self.selectedCell };
      const crossSizeProp = crossAxis === "x" ? "width" : "height";
      // TODO: center-finding can likely be improved (maybe try banker's rounding to prevent cursor "drift?")
      const crossCenter = Math.ceil(
        currentCell[crossAxis] + (currentCell[crossSizeProp] - 1 || 0) / 2
      );
      currentCell[crossAxis] = crossCenter;
      const crossAxisMap = self.cellMap[crossAxis];
      if (!currentCell) {
        return;
      }
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
        if (foundIndex !== self.selectedCellIndex && foundIndex !== undefined) {
          self.selectCellIndex(foundIndex);
          return;
        }
      }
      if (axisPos > max) {
        let foundCurrent = false;
        for (const crossAxisPosKey in crossAxisMap) {
          if (crossAxisPos === parseInt(crossAxisPosKey)) {
            foundCurrent = true;
          } else if (foundCurrent) {
            const posList = Object.values(crossAxisMap[crossAxisPosKey]);
            // third-from-last item is actual last pos of row; last two items are min/max of row
            const wrapCellIndex = posList[posList.length - 3];
            self.selectCellIndex(wrapCellIndex);
            return;
          }
        }
      }
      if (axisPos < min) {
        let prevKey = crossAxisPos;
        for (const crossAxisPosKey in crossAxisMap) {
          if (crossAxisPos === parseInt(crossAxisPosKey)) {
            const wrapCellIndex = Object.values(crossAxisMap[prevKey])[0];
            self.selectCellIndex(wrapCellIndex);
            return;
          } else {
            prevKey = crossAxisPosKey;
          }
        }
      }
      // NOTE: Short-circuiting wraparound logic below at the moment (allow param to set?)
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

export const uiModel = (name, ...args) => {
  if (typeof name === "object") {
    return types.compose(types.model(name), UI);
  }
  if (args.length) {
    return types.compose(types.model(name, ...args), UI);
  }
  return types.compose(name, UI);
};

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

export const formatOut = (repo, path) => {
  const result = repo.run(path);
  if (typeof result === "function") {
    return "f";
  }
  if (typeof result === "object") {
    return JSON.stringify(result);
  }
  return String(result);
};
