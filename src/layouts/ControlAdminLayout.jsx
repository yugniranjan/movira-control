import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiCreditCard, FiGrid, FiLogOut, FiMapPin, FiSettings } from "react-icons/fi";
import { logout } from "../features/auth/authSlice";

const navItems = [
  { to: "/movira-control/parks", label: "Control", icon: FiGrid },
  { to: "/payment-console", label: "Payments", icon: FiCreditCard },
  { to: "/payment-console/venues", label: "Venues", icon: FiMapPin },
  { to: "/payment-console/payments", label: "Gateways", icon: FiSettings },
];

function initialsFor(user) {
  const name = user?.name || user?.firstName || user?.email || "MC";
  return name
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ControlAdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  function handleLogout() {
    localStorage.removeItem("movira.superadmin.auth");
    dispatch(logout());
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--surface-app)] text-[var(--text-strong)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col bg-[#4b1205] shadow-[8px_0_24px_rgba(75,18,5,0.14)] lg:flex">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-600 text-sm font-black text-white shadow-[0_3px_0_#b43a05]">
            M
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-2 py-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/payment-console"}
              className={({ isActive }) =>
                `mx-auto flex h-[56px] w-[60px] flex-col items-center justify-center gap-1 rounded-lg text-center text-[10px] font-black leading-tight transition ${
                  isActive
                    ? "bg-orange-500 text-white shadow-[0_3px_0_#b43a05]"
                    : "text-stone-200/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="text-sm" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="mx-auto flex h-[56px] w-[60px] flex-col items-center justify-center gap-1 rounded-lg text-center text-[10px] font-black text-stone-200/80 transition hover:bg-white/10 hover:text-white"
          >
            <FiLogOut className="text-sm" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-[76px]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--stroke-soft)] bg-[#fffaf2]/95 px-3 backdrop-blur lg:px-5">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-600 text-sm font-black text-white shadow-[0_3px_0_#b43a05]">
              M
            </div>
            <div>
              <p className="text-lg font-black">Movira Control</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                SaaS admin
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-4 lg:flex">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-600 text-sm font-black text-white shadow-[0_3px_0_#b43a05]">
              M
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">Movira Control</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700">
                Parks, billing, onboarding, and payment routing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-black">{user?.name || user?.email || "Admin"}</p>
              <p className="text-xs font-semibold text-stone-500">{user?.email || "Movira"}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-stone-950 bg-violet-600 text-sm font-black text-white shadow-[0_3px_0_#111]">
              {initialsFor(user)}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] overflow-x-hidden bg-[#fff7ed] p-3 sm:p-4 lg:p-5">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
