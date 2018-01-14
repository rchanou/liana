import React from "react";
import { destroy } from "mobx-state-tree";

import { storiesOf } from "@storybook/react";
import { action } from "@storybook/addon-actions";

import { ContextRepo } from "../src/core";
import { Editor } from "../src/editor";
import { ReactEditor } from "../src/react-editor";
import defaultRepo from "./test-repo";

const LOCAL_STORAGE_KEY = "LIANA";

const params = new Map(
  Object.entries({
    0: 4,
    1: { type: "INCREMENT" }
  })
);

window.g = store => getSnapshot(store);

const env = { system: SystemJS };

class Story extends React.Component {
  state = {};

  componentDidMount() {
    // const dom = findDOMNode(this);

    window.s = Editor.create(this.props.editor, env);

    this.setState({ store: window.s });
  }

  componentDidCatch() {
    destroy(this.state.store);

    window.s = Editor.create({
      [ContextRepo.KEY]: defaultRepo,
      repoList: { selectedCellIndex: 75 },
      env
    });

    this.setState({ store: window.s });
  }

  render() {
    const { store } = this.state;

    if (!store) {
      return null;
    }

    return <ReactEditor editor={store} />;
  }
  componentWillUnmount() {
    destroy(this.state.store);
  }
}

const storedRepo = localStorage.getItem(LOCAL_STORAGE_KEY);

const repoToLoad = storedRepo ? JSON.parse(storedRepo) : defaultRepo;

const context = {
  [ContextRepo.KEY]: repoToLoad
};

storiesOf("Liana", module)
  .add("editor", () => (
    <Story
      editor={{
        ...context,
        repoList: { selectedCellIndex: 75 }
      }}
    />
  ))
  .add("editor in chooser", () => (
    <Story
      editor={{
        ...context,
        repoList: { selectedCellIndex: 75, chooser: { forLink: "0" } }
      }}
    />
  ));
