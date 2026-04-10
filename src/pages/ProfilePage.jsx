import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Field, PageShell, PrimaryButton, SectionCard, StatusPill, inputClassName } from "../components/ui";

const categories = [
  "Web Development",
  "Mobile App Development",
  "Graphic Design",
  "Writing & Translation",
  "Digital Marketing",
  "Video & Animation",
  "Other",
];

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    bio: "",
    qualification: "",
    preferences: [],
    companyName: "",
    companyWebsite: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isClient = profile?.role === "client";

  useEffect(() => {
    setForm({
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      bio: profile?.bio || "",
      qualification: profile?.qualification || "",
      preferences: (profile?.preferences || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      companyName: profile?.company_name || "",
      companyWebsite: profile?.company_website || "",
    });
  }, [profile?.bio, profile?.company_name, profile?.company_website, profile?.full_name, profile?.phone, profile?.preferences, profile?.qualification]);

  const togglePreference = (value) => {
    setForm((state) => ({
      ...state,
      preferences: state.preferences.includes(value)
        ? state.preferences.filter((item) => item !== value)
        : [...state.preferences, value],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: form.fullName,
          phone: form.phone,
          bio: form.bio,
          qualification: form.qualification,
          preferences: form.preferences.join(", "),
          company_name: isClient ? form.companyName : null,
          company_website: isClient ? form.companyWebsite : null,
        })
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
      setMessage("Profile updated successfully.");
    } catch (updateError) {
      console.error("Failed to update profile:", updateError);
      setError(updateError?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Profile"
      subtitle="Manage your visible account details without touching login credentials or marketplace identity fields."
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Personal Details"
          subtitle="Update the information that should stay current across your workspace."
        >
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <Field label="Full name">
              <input
                className={inputClassName}
                value={form.fullName}
                onChange={(event) => setForm((state) => ({ ...state, fullName: event.target.value }))}
              />
            </Field>

            <Field label="Phone number">
              <input
                className={inputClassName}
                value={form.phone}
                onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
              />
            </Field>

            <Field label="Bio">
              <textarea
                className={`${inputClassName} min-h-36`}
                value={form.bio}
                onChange={(event) => setForm((state) => ({ ...state, bio: event.target.value }))}
              />
            </Field>

            <Field label="Qualification">
              <input
                className={inputClassName}
                value={form.qualification}
                onChange={(event) => setForm((state) => ({ ...state, qualification: event.target.value }))}
              />
            </Field>

            {isClient ? (
              <>
                <Field label="Company name">
                  <input
                    className={inputClassName}
                    value={form.companyName}
                    onChange={(event) => setForm((state) => ({ ...state, companyName: event.target.value }))}
                  />
                </Field>

                <Field label="Company website">
                  <input
                    className={inputClassName}
                    value={form.companyWebsite}
                    onChange={(event) => setForm((state) => ({ ...state, companyWebsite: event.target.value }))}
                    placeholder="https://your-company.com"
                  />
                </Field>
              </>
            ) : null}

            {!isClient ? (
              <div className="grid gap-3">
                <p className="text-sm font-medium text-slate-700">Preferences</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => togglePreference(category)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                        form.preferences.includes(category)
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <PrimaryButton type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Changes"}
            </PrimaryButton>
          </form>
        </SectionCard>

        <SectionCard
          title="Account Information"
          subtitle="These fields are visible for reference only and are not editable from the profile page."
        >
          <div className="grid gap-4 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile?.email || "-"}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
              <div className="mt-2">
                <StatusPill tone="brand">{profile?.role || "-"}</StatusPill>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Qualification</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{form.qualification || "-"}</p>
            </div>

            {isClient ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company name</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{form.companyName || "-"}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company website</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{form.companyWebsite || "-"}</p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preferences</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{form.preferences.join(", ") || "-"}</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
