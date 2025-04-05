var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// public/plugins/cad-helper-tools/components/CircleTool.tsx
import React, { useState } from "react";
function CircleTool({ tooltip, icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const circleTools = [
    { id: "circle-by-3-points", name: "Circle by 3 Points" },
    { id: "circle-by-diameter", name: "Circle by Diameter" },
    { id: "circle-by-center-radius", name: "Circle by Center & Radius" }
  ];
  const activateTool = (toolId) => {
    console.log(`Activating circle tool: ${toolId}`);
    setIsOpen(false);
    const event = new CustomEvent("cadtool:activate", {
      detail: { toolId }
    });
    document.dispatchEvent(event);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "cad-helper-tools-button",
      title: tooltip,
      onClick: () => setIsOpen(!isOpen)
    },
    /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement("circle", { cx: "10", cy: "10", r: "8", fill: "none", stroke: "currentColor", strokeWidth: "2" }))
  ), isOpen && /* @__PURE__ */ React.createElement("div", { className: "absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" }, /* @__PURE__ */ React.createElement("div", { className: "py-1" }, circleTools.map((tool) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: tool.id,
      className: "block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100",
      onClick: () => activateTool(tool.id)
    },
    tool.name
  )))));
}

// public/plugins/cad-helper-tools/components/SymmetryTool.tsx
import React2, { useState as useState2 } from "react";
function SymmetryTool({ tooltip, icon }) {
  const [isOpen, setIsOpen] = useState2(false);
  const symmetryTools = [
    { id: "symmetry-tool", name: "Symmetry Across Axis" },
    { id: "mirror-tool", name: "Mirror Across Line" },
    { id: "polar-array", name: "Polar Array" }
  ];
  const activateTool = (toolId) => {
    console.log(`Activating symmetry tool: ${toolId}`);
    setIsOpen(false);
    const event = new CustomEvent("cadtool:activate", {
      detail: { toolId }
    });
    document.dispatchEvent(event);
  };
  return /* @__PURE__ */ React2.createElement("div", { className: "relative" }, /* @__PURE__ */ React2.createElement(
    "button",
    {
      className: "cad-helper-tools-button",
      title: tooltip,
      onClick: () => setIsOpen(!isOpen)
    },
    /* @__PURE__ */ React2.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React2.createElement("path", { fillRule: "evenodd", d: "M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z", clipRule: "evenodd" }), /* @__PURE__ */ React2.createElement("path", { d: "M5 8a3 3 0 116 0 3 3 0 01-6 0zM15 8a3 3 0 11-6 0 3 3 0 016 0z" }))
  ), isOpen && /* @__PURE__ */ React2.createElement("div", { className: "absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" }, /* @__PURE__ */ React2.createElement("div", { className: "py-1" }, symmetryTools.map((tool) => /* @__PURE__ */ React2.createElement(
    "button",
    {
      key: tool.id,
      className: "block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100",
      onClick: () => activateTool(tool.id)
    },
    tool.name
  )))));
}

// public/plugins/cad-helper-tools/components/ToolsPanel.tsx
import React3, { useState as useState3, useEffect } from "react";
function ToolsPanel({ title, icon }) {
  var _a;
  const [selectedTool, setSelectedTool] = useState3(null);
  const [activeTools, setActiveTools] = useState3([]);
  const tools = [
    {
      id: "circle-by-3-points",
      name: "Circle by 3 Points",
      description: "Create a circle through three points",
      icon: "circle"
    },
    {
      id: "circle-by-diameter",
      name: "Circle by Diameter",
      description: "Create a circle by specifying diameter",
      icon: "circle-diameter"
    },
    {
      id: "symmetry-tool",
      name: "Symmetry",
      description: "Create a symmetrical copy",
      icon: "symmetry"
    },
    {
      id: "mirror-tool",
      name: "Mirror",
      description: "Create a mirrored copy across a line",
      icon: "mirror"
    }
  ];
  useEffect(() => {
    const handleToolActivation = (event) => {
      const { toolId } = event.detail;
      setSelectedTool(toolId);
      setActiveTools((prev) => {
        if (prev.includes(toolId)) {
          return prev;
        }
        return [toolId, ...prev].slice(0, 5);
      });
    };
    document.addEventListener("cadtool:activate", handleToolActivation);
    return () => {
      document.removeEventListener("cadtool:activate", handleToolActivation);
    };
  }, []);
  const activateTool = (toolId) => {
    setSelectedTool(toolId);
    const event = new CustomEvent("cadtool:activate", {
      detail: { toolId }
    });
    document.dispatchEvent(event);
  };
  return /* @__PURE__ */ React3.createElement("div", { className: "cad-helper-tools-panel" }, /* @__PURE__ */ React3.createElement("h3", { className: "cad-helper-tools-panel-header" }, title), activeTools.length > 0 && /* @__PURE__ */ React3.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React3.createElement("div", { className: "text-xs font-medium uppercase tracking-wide text-gray-500 mb-2" }, "Recent Tools"), /* @__PURE__ */ React3.createElement("div", { className: "flex flex-wrap gap-2" }, activeTools.map((toolId) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return null;
    return /* @__PURE__ */ React3.createElement(
      "button",
      {
        key: `recent-${toolId}`,
        className: "px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200",
        onClick: () => activateTool(toolId)
      },
      tool.name
    );
  }))), /* @__PURE__ */ React3.createElement("div", { className: "space-y-1" }, tools.map((tool) => /* @__PURE__ */ React3.createElement(
    "div",
    {
      key: tool.id,
      className: `cad-helper-tools-tool-item ${selectedTool === tool.id ? "active" : ""}`,
      onClick: () => activateTool(tool.id)
    },
    /* @__PURE__ */ React3.createElement("div", { className: "cad-helper-tools-tool-icon" }, /* @__PURE__ */ React3.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, tool.icon === "circle" && /* @__PURE__ */ React3.createElement("circle", { cx: "10", cy: "10", r: "8", fill: "none", stroke: "currentColor", strokeWidth: "2" }), tool.icon === "symmetry" && /* @__PURE__ */ React3.createElement("path", { fillRule: "evenodd", d: "M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z", clipRule: "evenodd" }))),
    /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("div", null, tool.name), /* @__PURE__ */ React3.createElement("div", { className: "cad-helper-tools-tool-details" }, tool.description))
  ))), selectedTool && /* @__PURE__ */ React3.createElement("div", { className: "mt-6 p-3 bg-gray-50 rounded" }, /* @__PURE__ */ React3.createElement("h4", { className: "font-medium mb-2" }, (_a = tools.find((t) => t.id === selectedTool)) == null ? void 0 : _a.name, " Options"), selectedTool === "circle-by-3-points" && /* @__PURE__ */ React3.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React3.createElement("div", { className: "text-sm" }, "Click to define three points that the circle will pass through."), /* @__PURE__ */ React3.createElement("div", { className: "flex items-center" }, /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "checkbox",
      id: "snap-to-grid",
      className: "mr-2"
    }
  ), /* @__PURE__ */ React3.createElement("label", { htmlFor: "snap-to-grid", className: "text-sm" }, "Snap to grid"))), selectedTool === "symmetry-tool" && /* @__PURE__ */ React3.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React3.createElement("div", { className: "text-sm" }, "Select elements, then define the axis of symmetry."), /* @__PURE__ */ React3.createElement("div", { className: "grid grid-cols-3 gap-2" }, /* @__PURE__ */ React3.createElement("button", { className: "text-sm bg-blue-500 text-white px-2 py-1 rounded" }, "X Axis"), /* @__PURE__ */ React3.createElement("button", { className: "text-sm bg-blue-500 text-white px-2 py-1 rounded" }, "Y Axis"), /* @__PURE__ */ React3.createElement("button", { className: "text-sm bg-blue-500 text-white px-2 py-1 rounded" }, "Z Axis")), /* @__PURE__ */ React3.createElement("div", { className: "flex items-center" }, /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "checkbox",
      id: "keep-original",
      className: "mr-2",
      checked: true
    }
  ), /* @__PURE__ */ React3.createElement("label", { htmlFor: "keep-original", className: "text-sm" }, "Keep original")))));
}

// public/plugins/cad-helper-tools/components/MeasurementPanel.tsx
import React4, { useState as useState4, useEffect as useEffect2 } from "react";
function MeasurementPanel({ title, icon }) {
  const [selectedTool, setSelectedTool] = useState4(null);
  const [measurementResults, setMeasurementResults] = useState4([]);
  const [units, setUnits] = useState4("mm");
  const tools = [
    {
      id: "measure-distance",
      name: "Distance",
      description: "Measure distance between points or entities",
      icon: "ruler"
    },
    {
      id: "measure-angle",
      name: "Angle",
      description: "Measure angle between lines or three points",
      icon: "protractor"
    },
    {
      id: "measure-area",
      name: "Area",
      description: "Measure area of a closed shape",
      icon: "square"
    }
  ];
  useEffect2(() => {
    const handleMeasurementResult = (event) => {
      const { result, toolId } = event.detail;
      setMeasurementResults((prev) => [result, ...prev.slice(0, 4)]);
    };
    document.addEventListener("measurement:result", handleMeasurementResult);
    return () => {
      document.removeEventListener("measurement:result", handleMeasurementResult);
    };
  }, []);
  const activateTool = (toolId) => {
    setSelectedTool(toolId);
    const event = new CustomEvent("cadtool:activate", {
      detail: { toolId }
    });
    document.dispatchEvent(event);
    setTimeout(() => {
      let result = "";
      if (toolId === "measure-distance") {
        const distance = (Math.random() * 100).toFixed(2);
        result = `Distance: ${distance} ${units}`;
      } else if (toolId === "measure-angle") {
        const angle = (Math.random() * 180).toFixed(1);
        result = `Angle: ${angle}\xB0`;
      } else if (toolId === "measure-area") {
        const area = (Math.random() * 1e3).toFixed(2);
        result = `Area: ${area} ${units}\xB2`;
      }
      const event2 = new CustomEvent("measurement:result", {
        detail: { result, toolId }
      });
      document.dispatchEvent(event2);
    }, 2e3);
  };
  const toggleUnits = () => {
    setUnits((prev) => prev === "mm" ? "in" : "mm");
  };
  return /* @__PURE__ */ React4.createElement("div", { className: "cad-helper-tools-panel" }, /* @__PURE__ */ React4.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ React4.createElement("h3", { className: "font-medium" }, title), /* @__PURE__ */ React4.createElement(
    "button",
    {
      className: "text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200",
      onClick: toggleUnits
    },
    units.toUpperCase()
  )), /* @__PURE__ */ React4.createElement("div", { className: "grid grid-cols-3 gap-2 mb-4" }, tools.map((tool) => /* @__PURE__ */ React4.createElement(
    "button",
    {
      key: tool.id,
      className: `p-2 text-center rounded text-sm ${selectedTool === tool.id ? "bg-blue-100 border border-blue-300" : "bg-gray-100 hover:bg-gray-200"}`,
      onClick: () => activateTool(tool.id),
      title: tool.description
    },
    tool.name
  ))), measurementResults.length > 0 && /* @__PURE__ */ React4.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React4.createElement("div", { className: "text-xs font-medium uppercase tracking-wide text-gray-500 mb-2" }, "Recent Measurements"), /* @__PURE__ */ React4.createElement("div", { className: "space-y-2" }, measurementResults.map((result, index) => /* @__PURE__ */ React4.createElement(
    "div",
    {
      key: index,
      className: "cad-helper-tools-measurement-result"
    },
    result
  )))), selectedTool && /* @__PURE__ */ React4.createElement("div", { className: "mt-4 p-2 bg-blue-50 text-sm rounded" }, selectedTool === "measure-distance" && "Click two points or entities to measure the distance between them.", selectedTool === "measure-angle" && "Select two lines to measure the angle, or click three points.", selectedTool === "measure-area" && "Click on a closed shape to measure its area."));
}

// public/plugins/cad-helper-tools/operations/CircleOperations.ts
function createCircleBy3Points(p1, p2, p3) {
  return __async(this, null, function* () {
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    const z3 = p3.z || 0;
    if (Math.abs(z1 - z2) > 1e-3 || Math.abs(z2 - z3) > 1e-3 || Math.abs(z1 - z3) > 1e-3) {
      console.warn("Points are not coplanar, using XY projection");
    }
    function det(a, b, c, d, e, f, g, h, i) {
      return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    }
    const A = det(
      p1.x,
      p1.y,
      1,
      p2.x,
      p2.y,
      1,
      p3.x,
      p3.y,
      1
    );
    const Bx = -det(
      p1.x * p1.x + p1.y * p1.y,
      p1.y,
      1,
      p2.x * p2.x + p2.y * p2.y,
      p2.y,
      1,
      p3.x * p3.x + p3.y * p3.y,
      p3.y,
      1
    );
    const By = det(
      p1.x * p1.x + p1.y * p1.y,
      p1.x,
      1,
      p2.x * p2.x + p2.y * p2.y,
      p2.x,
      1,
      p3.x * p3.x + p3.y * p3.y,
      p3.x,
      1
    );
    const C = -det(
      p1.x * p1.x + p1.y * p1.y,
      p1.x,
      p1.y,
      p2.x * p2.x + p2.y * p2.y,
      p2.x,
      p2.y,
      p3.x * p3.x + p3.y * p3.y,
      p3.x,
      p3.y
    );
    if (Math.abs(A) < 1e-6) {
      throw new Error("Points are collinear, cannot create a circle");
    }
    const centerX = -Bx / (2 * A);
    const centerY = -By / (2 * A);
    const centerZ = (z1 + z2 + z3) / 3;
    const radius = Math.sqrt(
      Math.pow(centerX - p1.x, 2) + Math.pow(centerY - p1.y, 2) + Math.pow(centerZ - z1, 2)
    );
    console.log("Creating circle by 3 points:", {
      center: { x: centerX, y: centerY, z: centerZ },
      radius,
      points: [p1, p2, p3]
    });
    return `circle-${Date.now()}`;
  });
}
function createCircleByDiameter(p1, p2) {
  return __async(this, null, function* () {
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const centerZ = (z1 + z2) / 2;
    const radius = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(z2 - z1, 2)
    ) / 2;
    console.log("Creating circle by diameter:", {
      center: { x: centerX, y: centerY, z: centerZ },
      radius,
      points: [p1, p2]
    });
    return `circle-${Date.now()}`;
  });
}

// public/plugins/cad-helper-tools/operations/SymmetryOperations.ts
function createSymmetry(elementIds, axis, origin) {
  return __async(this, null, function* () {
    const newElementIds = [];
    const defaultOrigin = { x: 0, y: 0, z: 0 };
    const center = origin || defaultOrigin;
    console.log(`Creating symmetry for ${elementIds.length} elements across ${axis} axis with origin`, center);
    for (let i = 0; i < elementIds.length; i++) {
      newElementIds.push(`symmetry-${axis}-${Date.now()}-${i}`);
    }
    return newElementIds;
  });
}
function createMirror(elementIds, p1, p2) {
  return __async(this, null, function* () {
    const newElementIds = [];
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    console.log(`Creating mirror for ${elementIds.length} elements using line from`, p1, "to", p2);
    for (let i = 0; i < elementIds.length; i++) {
      newElementIds.push(`mirror-${Date.now()}-${i}`);
    }
    return newElementIds;
  });
}

// public/plugins/cad-helper-tools/operations/MeasurementOperations.ts
function measureDistance(p1, p2) {
  return __async(this, null, function* () {
    if (typeof p1 === "string" || typeof p2 === "string") {
      console.log("Measuring distance between entities", p1, p2);
      return {
        distance: Math.random() * 100,
        unit: "mm"
      };
    }
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    const distance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(z2 - z1, 2)
    );
    console.log("Measured distance:", distance);
    return {
      distance,
      unit: "mm"
    };
  });
}
function measureAngle(a, b, c) {
  return __async(this, null, function* () {
    if (typeof a === "string" || typeof b === "string" || c && typeof c === "string") {
      console.log("Measuring angle between entities", a, b, c);
      return {
        angle: Math.random() * 180,
        unit: "degrees"
      };
    }
    let angle;
    if (c) {
      const pointA = a;
      const pointB = b;
      const pointC = c;
      const za = pointA.z || 0;
      const zb = pointB.z || 0;
      const zc = pointC.z || 0;
      const v1x = pointA.x - pointB.x;
      const v1y = pointA.y - pointB.y;
      const v1z = za - zb;
      const v2x = pointC.x - pointB.x;
      const v2y = pointC.y - pointB.y;
      const v2z = zc - zb;
      const dotProduct = v1x * v2x + v1y * v2y + v1z * v2z;
      const v1Mag = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
      const v2Mag = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
      const angleRad = Math.acos(dotProduct / (v1Mag * v2Mag));
      angle = angleRad * (180 / Math.PI);
    } else {
      angle = 0;
    }
    console.log("Measured angle:", angle);
    return {
      angle,
      unit: "degrees"
    };
  });
}
function measureArea(shapeId) {
  return __async(this, null, function* () {
    if (typeof shapeId === "string") {
      console.log("Measuring area of entity", shapeId);
      return {
        area: Math.random() * 1e3,
        unit: "mm\xB2"
      };
    }
    const points = shapeId.points;
    if (points.length < 3) {
      throw new Error("At least 3 points are required to calculate area");
    }
    const xyPoints = points.map((p) => ({ x: p.x, y: p.y }));
    let area = 0;
    for (let i = 0; i < xyPoints.length; i++) {
      const j = (i + 1) % xyPoints.length;
      area += xyPoints[i].x * xyPoints[j].y;
      area -= xyPoints[j].x * xyPoints[i].y;
    }
    area = Math.abs(area) / 2;
    console.log("Measured area:", area);
    return {
      area,
      unit: "mm\xB2"
    };
  });
}

// public/plugins/cad-helper-tools/index.ts
var CADHelperTools = class {
  constructor(api) {
    this.registeredExtensions = [];
    this.api = api;
  }
  /**
   * Called when the plugin is loaded
   */
  onLoad() {
    return __async(this, null, function* () {
      console.log("CAD Helper Tools plugin loaded");
      this.api.registerExtension({
        id: "circle-tool-button",
        type: "toolbar",
        component: CircleTool,
        metadata: {
          tooltip: "Circle by 3 Points",
          icon: "circle",
          position: "right",
          group: "geometry"
        }
      });
      this.api.registerExtension({
        id: "symmetry-tool-button",
        type: "toolbar",
        component: SymmetryTool,
        metadata: {
          tooltip: "Symmetry & Mirror Tools",
          icon: "symmetry",
          position: "right",
          group: "transform"
        }
      });
      this.api.registerExtension({
        id: "helper-tools-panel",
        type: "sidebar",
        component: ToolsPanel,
        metadata: {
          title: "Helper Tools",
          icon: "tools"
        }
      });
      this.registeredExtensions.push("helper-tools-panel");
      this.api.registerExtension({
        id: "measurement-panel",
        type: "sidebar",
        component: MeasurementPanel,
        metadata: {
          title: "Measurements",
          icon: "ruler"
        }
      });
      this.api.registerExtension({
        id: "circle-by-3-points",
        type: "cadTool",
        handler: createCircleBy3Points,
        metadata: {
          name: "Circle by 3 Points",
          description: "Creates a circle that passes through three points",
          category: "geometry",
          icon: "circle-3-points"
        }
      });
      this.registeredExtensions.push("circle-by-3-points");
      this.api.registerExtension({
        id: "circle-by-diameter",
        type: "cadTool",
        handler: createCircleByDiameter,
        metadata: {
          name: "Circle by Diameter",
          description: "Creates a circle by specifying two points for the diameter",
          category: "geometry",
          icon: "circle-diameter"
        }
      });
      this.registeredExtensions.push("circle-by-diameter");
      this.api.registerExtension({
        id: "symmetry-tool",
        type: "cadTool",
        handler: createSymmetry,
        metadata: {
          name: "Symmetry",
          description: "Creates a symmetrical copy of elements across an axis",
          category: "transform",
          icon: "symmetry"
        }
      });
      this.registeredExtensions.push("symmetry-tool");
      this.api.registerExtension({
        id: "mirror-tool",
        type: "cadTool",
        handler: createMirror,
        metadata: {
          name: "Mirror",
          description: "Creates a mirrored copy of elements across a line",
          category: "transform",
          icon: "mirror"
        }
      });
      this.registeredExtensions.push("mirror-tool");
      this.api.registerExtension({
        id: "measure-distance",
        type: "cadTool",
        handler: measureDistance,
        metadata: {
          name: "Measure Distance",
          description: "Measures the distance between two points or entities",
          category: "measure",
          icon: "measure-distance"
        }
      });
      this.registeredExtensions.push("measure-distance");
      this.api.registerExtension({
        id: "measure-angle",
        type: "cadTool",
        handler: measureAngle,
        metadata: {
          name: "Measure Angle",
          description: "Measures the angle between two lines or three points",
          category: "measure",
          icon: "measure-angle"
        }
      });
      this.registeredExtensions.push("measure-angle");
      this.api.registerExtension({
        id: "measure-area",
        type: "cadTool",
        handler: measureArea,
        metadata: {
          name: "Measure Area",
          description: "Measures the area of a closed shape",
          category: "measure",
          icon: "measure-area"
        }
      });
      this.registeredExtensions.push("measure-area");
    });
  }
  /**
   * Called when the plugin is enabled
   */
  onEnable() {
    return __async(this, null, function* () {
      console.log("CAD Helper Tools plugin enabled");
      const linkElement = document.createElement("link");
      linkElement.rel = "stylesheet";
      linkElement.href = "/plugins/cad-helper-tools/styles.css";
      linkElement.id = "cad-helper-tools-styles";
      document.head.appendChild(linkElement);
    });
  }
  /**
   * Called when the plugin is disabled
   */
  onDisable() {
    return __async(this, null, function* () {
      console.log("CAD Helper Tools plugin disabled");
      for (const extensionId of this.registeredExtensions) {
        this.api.unregisterExtension(extensionId);
      }
      this.registeredExtensions = [];
      const styleElement = document.getElementById("cad-helper-tools-styles");
      if (styleElement) {
        styleElement.remove();
      }
    });
  }
  /**
   * Called when the plugin is uninstalled
   */
  onUninstall() {
    return __async(this, null, function* () {
      console.log("CAD Helper Tools plugin uninstalled");
    });
  }
  /**
   * Called when the plugin settings change
   */
  onSettingsChange(settings) {
    console.log("CAD Helper Tools settings changed:", settings);
  }
};
export {
  CADHelperTools as default
};
//# sourceMappingURL=index.js.map
