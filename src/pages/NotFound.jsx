import { FiCompass } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center">
      <div>
        <FiCompass className="mx-auto text-4xl text-[var(--brand-primary-deep)]" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-stone-500">404</p>
        <h1 className="mt-1 text-2xl font-black">Page not found</h1>
        <p className="mt-2 text-sm font-semibold text-stone-500">
          This Movira Control URL or park section does not exist.
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
