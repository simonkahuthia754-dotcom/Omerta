import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class Guard extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 28, color: "#eadfc6", font: "16px/1.5 system-ui", background: "#06110d", minHeight: "100vh" }}>
        <h2>Something broke</h2>
        <p>Your save is untouched. Reload to carry on.</p>
        <button onClick={() => location.reload()} style={{ padding: "12px 20px", fontSize: 16 }}>Reload</button>
      </div>
    );
  }
}

window.addEventListener("unhandledrejection", e => console.error("unhandled", e.reason));

ReactDOM.createRoot(document.getElementById("root")).render(
  <Guard><App /></Guard>
);
