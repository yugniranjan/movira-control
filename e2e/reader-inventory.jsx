import React from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import PosCardTree from "../src/paymentConsole/components/PosCardTree";
import AppDialogHost from "../src/components/common/AppDialogHost";
createRoot(document.getElementById("root")).render(<main style={{ maxWidth: 1200, margin: "auto", padding: 20 }}><AppDialogHost /><PosCardTree locationId={3} /></main>);
