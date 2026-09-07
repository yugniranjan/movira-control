import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { registerAppDialogHandler } from "../../services/appDialog";

export default function AppDialogHost() {
  const [queue, setQueue] = useState([]);
  const active = queue[0] || null;

  useEffect(() => registerAppDialogHandler((item) => {
    setQueue((current) => [...current, item]);
  }), []);

  if (!active) return null;
  const settle = (value) => {
    active.resolve(value);
    setQueue((current) => current.slice(1));
  };

  return <ConfirmDialog open tone={active.tone} title={active.title} message={active.message} confirmLabel={active.confirmLabel} cancelLabel={active.cancelLabel} onClose={() => settle(false)} onConfirm={({ type }) => type === "confirm" && settle(true)} />;
}
