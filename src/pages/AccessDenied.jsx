import { FiLock } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center">
      <div>
        <FiLock className="mx-auto text-4xl text-[var(--brand-primary-deep)]" />
        <h1 className="mt-4 text-2xl font-black">Access not assigned</h1>
        <p className="mt-2 text-sm font-semibold text-stone-500">
          Your role does not have permission to open this Movira Control section.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-black text-white"
        >
          Go to available workspace
        </Link>
      </div>
    </section>
  );
}
