import { createElement, useEffect, useState } from "react";
import { FiExternalLink, FiImage, FiMail, FiSave, FiSettings } from "react-icons/fi";
import { toast } from "sonner";
import PageLayout from "../../layouts/PageLayout";
import Loader from "../../components/Loader";
import ErrorMessage from "../../components/ErrorMessage";
import {
  useGetSaasPlatformSettingsQuery,
  useUpdateSaasPlatformSettingsMutation,
} from "../../features/saas/moviraControlApi";

const emptyForm = {
  brandName: "",
  emailTagline: "",
  emailLogoUrl: "",
  supportEmail: "",
  supportPhone: "",
  supportUrl: "",
  publicWebsiteUrl: "",
  ownerPortalUrl: "",
};

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-(--stroke-soft) bg-(--surface-input) px-3 text-sm font-semibold text-(--text-strong) outline-none transition focus:border-(--brand-primary) focus:ring-4 focus:ring-(--brand-primary)/15";

function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0 text-xs font-black uppercase tracking-[0.08em] text-(--text-muted)">
      {label}
      {children}
      {hint ? <span className="mt-1 block normal-case tracking-normal font-medium">{hint}</span> : null}
    </label>
  );
}

function Panel({ icon, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-(--stroke-soft) bg-(--surface-panel) shadow-(--shadow-card)">
      <div className="flex items-start gap-3 border-b border-(--stroke-soft) bg-(--surface-muted) px-4 py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--brand-primary-soft) text-(--brand-primary)">{createElement(icon)}</span>
        <div><h2 className="font-black">{title}</h2><p className="mt-0.5 text-xs font-semibold text-(--text-muted)">{description}</p></div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ControlSettings() {
  const { data, isLoading, error } = useGetSaasPlatformSettingsQuery();
  const [save, { isLoading: isSaving }] = useUpdateSaasPlatformSettingsMutation();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (data) setForm({ ...emptyForm, ...data });
  }, [data]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    try {
      await save(form).unwrap();
      toast.success("Movira Control settings saved. New platform emails will use these details.");
    } catch (saveError) {
      toast.error(saveError?.data?.message || "Settings could not be saved.");
    }
  }

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error?.data?.message || "Settings could not be loaded."} />;

  return (
    <PageLayout
      heading="Movira Control settings"
      sectionKicker="Platform configuration"
      breadcrumb={[{ label: "Movira Control", link: "/movira-control/parks" }, { label: "Settings" }]}
    >
      <form onSubmit={submit} className="grid gap-3.5">
        <div className="rounded-xl border border-(--brand-primary-border) bg-(--brand-primary-soft) px-4 py-3 text-sm font-semibold text-(--text-base)">
          These are platform-wide values for Movira Control emails. Location booking emails continue to use each location’s own contact details.
        </div>
        <Panel icon={FiImage} title="Branding" description="Logo and identity displayed in Movira Control emails.">
          <Field label="Brand name"><input className={inputClass} value={form.brandName} onChange={set("brandName")} required /></Field>
          <Field label="Email tagline"><input className={inputClass} value={form.emailTagline} onChange={set("emailTagline")} required /></Field>
          <Field label="Email logo URL" hint="Use a public HTTPS image; email clients cannot load localhost URLs."><input type="url" className={inputClass} value={form.emailLogoUrl} onChange={set("emailLogoUrl")} required /></Field>
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-(--stroke-soft) bg-white p-3">
            {form.emailLogoUrl ? <img src={form.emailLogoUrl} alt="Email logo preview" className="max-h-16 max-w-45 object-contain" /> : <span className="text-xs font-bold text-stone-500">Logo preview</span>}
          </div>
        </Panel>
        <Panel icon={FiMail} title="Help & support" description="Shown in platform billing, onboarding and lifecycle emails.">
          <Field label="Support email"><input type="email" className={inputClass} value={form.supportEmail} onChange={set("supportEmail")} required /></Field>
          <Field label="Support phone" hint="Optional"><input className={inputClass} value={form.supportPhone} onChange={set("supportPhone")} /></Field>
          <Field label="Help center URL"><input type="url" className={inputClass} value={form.supportUrl} onChange={set("supportUrl")} required /></Field>
        </Panel>
        <Panel icon={FiExternalLink} title="Public links" description="Safe customer-facing destinations used by emails and calls to action.">
          <Field label="Public website URL"><input type="url" className={inputClass} value={form.publicWebsiteUrl} onChange={set("publicWebsiteUrl")} required /></Field>
          <Field label="Owner portal URL" hint="Enter the app base URL; /login is added to onboarding links."><input type="url" className={inputClass} value={form.ownerPortalUrl} onChange={set("ownerPortalUrl")} required /></Field>
        </Panel>
        <div className="sticky bottom-3 flex justify-end rounded-xl border border-(--stroke-soft) bg-(--surface-panel)/95 p-3 shadow-(--shadow-card) backdrop-blur">
          <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-(--brand-primary) px-5 font-black text-white shadow-[0_3px_0_var(--brand-primary-deep)] disabled:opacity-60">
            {isSaving ? <FiSettings className="animate-spin" /> : <FiSave />} {isSaving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </PageLayout>
  );
}
