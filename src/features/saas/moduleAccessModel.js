const fallbackModules = [
  {
    key: "bookings",
    label: "Bookings",
    capabilities: ["Booking calendar", "Orders and payments", "Guest check-in"],
    requires: [],
    recommendedWith: ["booking_portal", "waivers", "reports"],
  },
  {
    key: "pos",
    label: "POS",
    capabilities: ["Counter checkout", "Terminals and tills", "Receipts and refunds"],
    requires: ["bookings"],
    recommendedWith: ["inventory", "reports"],
  },
  {
    key: "booking_portal",
    label: "Booking portal",
    capabilities: ["Online availability", "Guest self-checkout", "Booking confirmation"],
    requires: ["bookings"],
    recommendedWith: ["waivers", "crm"],
  },
  {
    key: "crm",
    label: "CRM",
    capabilities: ["Customer profiles", "Segments and campaigns", "Journey automation"],
    requires: [],
    recommendedWith: ["booking_portal", "reports"],
  },
  {
    key: "staff",
    label: "Staff",
    capabilities: ["Team scheduling", "Time and attendance", "Leave and availability"],
    requires: [],
    recommendedWith: ["reports"],
  },
  {
    key: "inventory",
    label: "Inventory",
    capabilities: ["Stock control", "Retail products", "Gift cards and add-ons"],
    requires: ["pos"],
    recommendedWith: ["reports"],
  },
  {
    key: "waivers",
    label: "Waivers",
    capabilities: ["Digital waiver forms", "Signature collection", "Waiver holder records"],
    requires: ["bookings"],
    recommendedWith: ["booking_portal"],
  },
  {
    key: "reports",
    label: "Reports",
    capabilities: ["Revenue reporting", "Booking performance", "Operating insights"],
    requires: ["bookings"],
    recommendedWith: ["crm", "staff"],
  },
];

export const fallbackModuleWorkflows = [
  {
    key: "online_booking",
    label: "Online booking journey",
    description: "Customer discovers availability, books online, signs, and receives follow-up.",
    requiredModules: ["bookings", "booking_portal"],
    recommendedModules: ["waivers", "crm"],
  },
  {
    key: "front_desk",
    label: "Front desk operations",
    description: "Staff creates a booking, takes payment, checks in guests, and issues a receipt.",
    requiredModules: ["bookings", "pos"],
    recommendedModules: ["waivers", "inventory"],
  },
  {
    key: "retail",
    label: "Retail and add-on sales",
    description: "Sell products and add-ons at the counter with stock visibility.",
    requiredModules: ["bookings", "pos", "inventory"],
    recommendedModules: ["reports"],
  },
  {
    key: "workforce",
    label: "Workforce operations",
    description: "Schedule the team, track attendance, and review labor performance.",
    requiredModules: ["staff"],
    recommendedModules: ["reports"],
  },
  {
    key: "growth",
    label: "Customer growth loop",
    description: "Use booking history to segment customers, automate outreach, and measure results.",
    requiredModules: ["bookings", "crm", "reports"],
    recommendedModules: ["booking_portal"],
  },
];

const unique = (values = []) => [...new Set(values.map(String).filter(Boolean))];

export function normalizeModuleCatalog(catalog = []) {
  const fallbackByKey = new Map(fallbackModules.map((module) => [module.key, module]));
  const source = catalog.length ? catalog : fallbackModules;
  return source.map((module) => {
    const fallback = fallbackByKey.get(module.key) || {};
    return {
      ...fallback,
      ...module,
      capabilities: unique(module.capabilities?.length ? module.capabilities : fallback.capabilities),
      requires: unique(module.requires?.length ? module.requires : fallback.requires),
      recommendedWith: unique(
        module.recommendedWith?.length ? module.recommendedWith : fallback.recommendedWith
      ),
      requiredBy: unique(module.requiredBy),
    };
  });
}

export function expandModuleSelection(moduleKeys = [], catalog = []) {
  const moduleMap = new Map(normalizeModuleCatalog(catalog).map((module) => [module.key, module]));
  const expanded = new Set(unique(moduleKeys));
  let changed = true;

  while (changed) {
    changed = false;
    for (const key of [...expanded]) {
      for (const dependency of moduleMap.get(key)?.requires || []) {
        if (!expanded.has(dependency)) {
          expanded.add(dependency);
          changed = true;
        }
      }
    }
  }

  return [...expanded];
}

export function getRemovalBlockers(moduleKey, selectedKeys = [], catalog = []) {
  const selected = new Set(unique(selectedKeys));
  return normalizeModuleCatalog(catalog)
    .filter(
      (module) =>
        module.key !== moduleKey &&
        selected.has(module.key) &&
        expandModuleSelection([module.key], catalog).includes(moduleKey)
    )
    .map((module) => module.key);
}

export function getWorkflowState(workflow, selectedKeys = [], catalog = []) {
  const selected = new Set(expandModuleSelection(selectedKeys, catalog));
  const requiredModules = expandModuleSelection(workflow.requiredModules || [], catalog);
  const recommendedModules = unique(workflow.recommendedModules);
  const missingRequired = requiredModules.filter((key) => !selected.has(key));
  const missingRecommended = recommendedModules.filter((key) => !selected.has(key));

  return {
    requiredModules,
    recommendedModules,
    missingRequired,
    missingRecommended,
    ready: missingRequired.length === 0,
    complete: missingRequired.length === 0 && missingRecommended.length === 0,
  };
}

export function modulesForCompleteWorkflow(workflow, catalog = []) {
  return expandModuleSelection(
    [...(workflow.requiredModules || []), ...(workflow.recommendedModules || [])],
    catalog
  );
}

