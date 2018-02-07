import { storiesOf } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import React from "react";
import { destroy } from "mobx-state-tree";

import { ReactGUI } from "../src/react-gui";
import { App, unpackApp } from "../src/app";
import * as T from "../src/_tests"; // importing this file also runs its tests

const LOCAL_STORAGE_KEY = "LIANA";
const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
let snapshotToUse;
if (saved) {
  snapshotToUse = JSON.parse(saved);
  snapshotToUse.engine.tags = {};
} else {
  snapshotToUse = T.app;
}

try {
  window.s = T.strictCreate(App, unpackApp(snapshotToUse));
} catch (ex) {
  console.error(ex);
  console.warn("Loading default snapshot as backup...");
  window.s = T.strictCreate(App, T.app);
}

storiesOf("Liana", module).add("new repo test", () => (
  <ReactGUI store={window.s} />
));
