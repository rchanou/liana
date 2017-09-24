import React from "react";
import { observer } from "mobx-react";

const containerStyle = {
  position: "absolute",
  height: "100vh",
  width: "100vw"
};

const unit = 40;
const spacer = 0.1 * unit;
const darkGray = "#222";

const nodeStyle = {
  position: "absolute",
  border: `1px solid ${darkGray}`,
  borderRadius: 4,
  height: unit - 2 * spacer,
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const lineStyle = {
  position: "absolute",
  background: darkGray,
  width: 2 * spacer,
  height: 3 * spacer,
  zIndex: -1
};

export const Tree = observer(({ nodes }) => {
  const test = [];

  const displayNodes = nodes.map(({ x, y, size, color, key, group, index, form, text, link }) => {
    let left, width;
    switch (form) {
      case "mid":
        left = x * unit;
        width = size * unit;
        break;
      case "start":
        left = x * unit + spacer;
        width = size * unit - spacer;
        break;
      case "end":
        left = x * unit;
        width = size * unit - spacer;
        break;
      case "lone":
        left = x * unit + spacer;
        width = size * unit - 2 * spacer;
        break;
      default:
        throw new Error(`Provided form "${form}" is invalid.`);
    }

    const style = {
      ...nodeStyle,
      top: y * unit,
      left,
      width,
      background: color
    };

    const finalKey = key || `${group}-${index}`;
    test.push(finalKey);
    const connector = link ? (
      <div
        key={`${finalKey}-L`}
        style={{
          ...lineStyle,
          left: unit * (x + 0.5 * size) - spacer,
          top: y * unit - 3 * spacer
        }}
      />
    ) : null;

    return [
      connector,
      <div key={finalKey} style={style}>
        {text}
      </div>
    ];
  });

  console.log(test);

  return <div style={containerStyle}>{displayNodes}</div>;
});
