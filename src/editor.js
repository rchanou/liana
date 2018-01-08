import { types } from "mobx-state-tree";

import { setupContext } from "./context";
import { Node, ContextRepo } from "./core";
import { LinkCell, CellList } from "./cell";
import { ContextUser } from "./user";

export const TREE = "TREE";
export const LIST = "LIST";

const keyLayout = {
  "65": [0, 2],
  "66": [4, 3],
  "67": [2, 3],
  "68": [4, 2],
  "69": [7, 2],
  "70": [2, 1],
  "71": [4, 1],
  "72": [5, 2],
  "73": [8, 2],
  "74": [5, 1],
  "75": [5, 3],
  "76": [6, 1],
  "77": [6, 3],
  "78": [6, 2],
  "79": [9, 2],
  "80": [3, 1],
  "81": [0, 1],
  "82": [1, 2],
  "83": [2, 2],
  "84": [3, 2],
  "85": [7, 1],
  "86": [3, 3],
  "87": [1, 1],
  "88": [1, 3],
  "89": [8, 1],
  "90": [0, 3],
  "186": [9, 1],
  "188": [7, 3],
  "190": [8, 3],
  "191": [9, 3]
};

const opYXGrid = {
  0: {
    0: "@",
    1: "[",
    2: "{",
    3: ".",
    4: "g",
    5: "+",
    6: "-",
    7: "*",
    8: "/",
    9: "%"
  },
  1: { 1: "f", 2: "s", 3: "?", 6: "<", 7: ">", 8: "<=", 9: ">=" },
  2: { 6: "==", 7: "===", 8: "!=", 9: "!==" }
};

export const Editor = types
  .model("Editor", {
    ...ContextRepo.Mixin,
    ...ContextUser.Mixin,
    // tree: Tree,
    // root: types.maybe(LinkCell),
    cellList: types.optional(CellList, {})
    // currentView: types.optional(types.enumeration([TREE, LIST]), LIST)
  })
  .views(self => ({
    get user() {
      return self[ContextUser.Key];
    },
    get repo() {
      return self[ContextRepo.Key];
    },
    get repoCells() {
      return self.cellList.cells(0, 0);
    },
    get selectedCell() {
      return self.repoCells[self.user.selectedCellIndex];
    },
    get cursorCell() {
      const { inputMode } = self.user;
      const { selectedCell } = self;

      const finalCell = {
        ...selectedCell,
        input: inputMode,
        key: "CURSOR"
      };
      delete finalCell.text;

      if (inputMode) {
        finalCell.value = selectedCell.value;
      }

      return finalCell;
    },
    get cells() {
      return self.repoCells.concat(self.cursorCell);

      if (self.root) {
        return self.root.rootBoxes;
      }
      // TODO: switch on type here
      return self.projection.boxes;
    },
    get keyBoxes() {
      return [];
    }
  }))
  .actions(self => ({
    moveUp() {
      const { cells, user, selectedCell } = self;

      const gotoCellIndex = cells.findIndex(
        cell => cell.selectable && cell.x === selectedCell.x && cell.y === selectedCell.y - 1
      );

      if (gotoCellIndex !== -1) {
        user.selectedCellIndex = gotoCellIndex;
      }
    },
    moveDown() {
      const { cells, user, selectedCell } = self;

      const gotoCellIndex = cells.findIndex(
        cell => cell.selectable && cell.x === selectedCell.x && cell.y === selectedCell.y + 1
      );

      if (gotoCellIndex !== -1) {
        user.selectedCellIndex = gotoCellIndex;
      }
    },
    moveLeft() {
      const { cells, user, selectedCell } = self;

      const gotoCellIndex = cells.findIndex(
        cell => cell.selectable && cell.x === selectedCell.x - 2 && cell.y === selectedCell.y
      );

      if (gotoCellIndex !== -1) {
        user.selectedCellIndex = gotoCellIndex;
      }
    },
    moveRight() {
      const { cells, user, selectedCell } = self;

      const gotoCellIndex = cells.findIndex(
        cell => cell.selectable && cell.x === selectedCell.x + 2 && cell.y === selectedCell.y
      );

      if (gotoCellIndex !== -1) {
        user.selectedCellIndex = gotoCellIndex;
      }
    }
  }))
  .actions(self => ({
    handleInput(e) {
      self.selectedCell.value = e.target.value;
    },
    handleKeyPress(e) {
      const { keyCode } = e;

      console.log(keyCode);

      const { user, selectedCell } = self;

      if (user.inputMode) {
        if (e.keyCode == 13) {
          selectedCell.forLink.setVal(selectedCell.nodeIndex, selectedCell.value);
          user.toggleInputMode();
          self.moveRight();
        }
        return;
      }

      if (user.changeOpMode) {
        user.toggleChangeOpMode();
      }

      const coords = keyLayout[keyCode];
      if (!coords) {
        return;
      }

      e.preventDefault();

      const [x, y] = coords;

      const { forLink, nodeIndex } = selectedCell;

      if (x === 6 && y === 3) {
        user.toggleChangeCellMode();
        return;
      }

      if (user.changeCellMode) {
        if (x === 6 && y === 1) {
          forLink.setNode(nodeIndex, { val: 0 });
          user.toggleInputMode();
        }
        if (x === 7 && y === 1) {
          forLink.setNode(nodeIndex, { val: "" });
          user.toggleInputMode();
        }
        if (x === 8 && y === 1) {
          forLink.setNode(nodeIndex, { val: false });
        }
        if (x === 6 && y === 2) {
          forLink.setNode(nodeIndex, { op: "." });
        }
        if (x === 7 && y === 2) {
          forLink.setNode(nodeIndex, {
            ref: self.repo.linkList[0]
          });
        }
        if (x === 8 && y === 2) {
          forLink.setNode(nodeIndex, {
            input: self.repo.inputList[0]
          });
        }
        if (x === 9 && y === 2) {
          forLink.setNode(nodeIndex, {
            dep: self.repo.depList[0]
          });
        }
        user.toggleChangeCellMode();
        return;
      }

      if (user.addNodeMode) {
        if (x === 6 && y === 1) {
          forLink.addNode({ val: 0 });
        }
        if (x === 7 && y === 1) {
          forLink.addNode({ val: "" });
        }
        if (x === 8 && y === 1) {
          forLink.addNode({ val: false });
        }
        if (x === 6 && y === 2) {
          forLink.addNode({ op: "." });
        }
        if (x === 7 && y === 2) {
          forLink.addNode({ ref: self.repo.linkList[0] });
        }
        if (x === 8 && y === 2) {
          forLink.addNode({ input: self.repo.inputList[0] });
        }
        if (x === 9 && y === 2) {
          forLink.addNode({ dep: self.repo.depList[0] });
        }
        user.toggleAddNodeMode();
        return;
      }

      if (x === 9 && y === 2) {
        if (typeof nodeIndex === "number") {
          const deleted = selectedCell.forLink.deleteNode(nodeIndex);

          if (nodeIndex > selectedCell.forLink.nodes.length - 1) {
            self.moveLeft();
          }
          return;
        }
      }

      if (x === 6 && y === 1) {
        user.toggleAddNodeMode();
        return;

        if (selectedCell.forLink) {
          selectedCell.forLink.addNode();
          return;
        }
      }

      if (x === 7 && y === 1) {
        if (selectedCell.gotoCellKey) {
          const gotoCellIndex = self.cells.findIndex(cell => cell.key === selectedCell.gotoCellKey);

          if (gotoCellIndex !== -1) {
            user.selectedCellIndex = gotoCellIndex;
          }

          return;
        }
      }

      if (x === 8 && y === 2) {
        user.toggleInputMode();
        return;
      }

      if (x === 5 && y === 1) {
        self.repo.addLink();
      }

      if (x === 2 && y === 1) {
        self.moveUp();
      }
      if (x === 2 && y === 2) {
        self.moveDown();
      }
      if (x === 1 && y === 2) {
        self.moveLeft();
      }
      if (x === 3 && y === 2) {
        self.moveRight();
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      document.addEventListener("keydown", self.handleKeyPress);
    },
    beforeDestroy() {
      document.removeEventListener("keydown", self.handleKeyPress);
    }
  }));

export default Editor;
