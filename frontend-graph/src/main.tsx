import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@neo4j-ndl/base/lib/neo4j-ds-styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
