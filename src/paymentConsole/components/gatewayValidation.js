export function validateField(field, value, { mode } = {}) {
  const trimmed = value == null ? "" : String(value).trim();
  const isEmpty = trimmed === "";
  const isRequired = field.required !== false;
  if (isEmpty) {
    if (isRequired) return { ok: false, message: "Required." };
    return { ok: true };
  }
  if (field.validate?.pattern) {
    const re = new RegExp(field.validate.pattern);
    if (!re.test(trimmed)) {
      return { ok: false, message: field.validate.message || "Invalid format." };
    }
    if (field.validate.modeAware && mode) {
      const expected = mode === "live" ? "live_" : "test_";
      const ok =
        trimmed.startsWith(`pk_${expected}`) ||
        trimmed.startsWith(`sk_${expected}`) ||
        trimmed.startsWith(`rzp_${expected}`) ||
        trimmed.startsWith("whsec_");
      if (!ok) {
        return {
          ok: false,
          message:
            mode === "live"
              ? "Looks like a sandbox/test key - switch Mode to Sandbox or paste a live key."
              : "Looks like a live key - switch Mode to Live or paste a test key.",
        };
      }
    }
  }
  return { ok: true };
}

export function validateAll(schema, values, ctx) {
  const errors = {};
  for (const field of schema.fields) {
    if (field.type === "select") continue;
    const res = validateField(field, values[field.key], ctx);
    if (!res.ok) errors[field.key] = res.message;
  }
  return { ok: Object.keys(errors).length === 0, fieldErrors: errors };
}
