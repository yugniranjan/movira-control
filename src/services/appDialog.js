let requestHandler = null;
const waitingRequests = [];

export function registerAppDialogHandler(handler) {
  requestHandler = handler;
  while (waitingRequests.length) requestHandler(waitingRequests.shift());
  return () => {
    if (requestHandler === handler) requestHandler = null;
  };
}

export function appConfirm(input) {
  const supplied = typeof input === "object" && input !== null ? input : {};
  const raw = typeof input === "string" ? input : supplied.message || "";
  const questionAt = raw.indexOf("?");
  return new Promise((resolve) => {
    const item = {
      title: supplied.title || (questionAt >= 0 ? raw.slice(0, questionAt + 1) : "Confirm action"),
      message: supplied.title ? raw : questionAt >= 0 ? raw.slice(questionAt + 1).trim() : raw,
      confirmLabel: supplied.confirmLabel || "Confirm",
      cancelLabel: supplied.cancelLabel || "Cancel",
      tone: supplied.tone || "danger",
      resolve,
    };
    if (requestHandler) requestHandler(item);
    else waitingRequests.push(item);
  });
}
