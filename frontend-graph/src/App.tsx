import React from "react";
import {
  NeedleThemeProvider,
  SpotlightProvider,
  Toaster,
} from "@neo4j-ndl/react";
import GraphViewer from "./components/Graph/GraphViewer";
import "./App.css";

function App() {
  return (
    <NeedleThemeProvider
      theme="light"
      wrapperProps={{ isWrappingChildren: false }}
    >
      <SpotlightProvider>
        <div className="App">
          <GraphViewer />
        </div>
        <Toaster />
      </SpotlightProvider>
    </NeedleThemeProvider>
  );
}

export default App;
