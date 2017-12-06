import React from "react";
import { observer } from "mobx-react";

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start"
};

const rowStyle = {
  display: "flex",
  marginBottom: 11
};

const boxStyle = {
  width: 100,
  height: 22,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "right"
};

const noStyle = {};
const headStyle = {
  marginRight: 3,
  justifyContent: "flex-end",
  fontWeight: "bold"
};

export const List = observer(({ rows }) => (
  <div style={containerStyle}>
    {rows.map((boxes, i) => (
      <div style={rowStyle} key={boxes[0].key}>
        {boxes.map((box, i) => (
          <div
            key={box.key}
            style={{
              ...boxStyle,
              ...(i ? noStyle : headStyle),
              background: box.color
            }}
          >
            {box.text}
          </div>
        ))}
      </div>
    ))}
  </div>
));

export default List;
