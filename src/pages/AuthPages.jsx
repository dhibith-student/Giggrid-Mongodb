import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as apiLogin, register as apiRegister } from "../lib/api";
import { Field, PrimaryButton, SectionCard, SecondaryButton, inputClassName } from "../components/ui";
import { useAuth } from "../context/AuthContext";

function AuthSplit({ eyebrow, title, subtitle, sideTitle, sideText, children }) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="max-w-xl">
          <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{sideTitle}</h1>
          <p className="mt-4 text-base leading-8 text-slate-500">{sideText}</p>
        </div>

        <SectionCard title={title} subtitle={subtitle}>
          {children}
        </SectionCard>
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  const selectRole = (role) => {
    localStorage.setItem("selectedRole", role);
    navigate("/login");
  };

  const cards = [
    ["Freelancer", "Bid on projects, manage your pipeline, and track active work.", "freelancer"],
    ["Client", "Post projects, review bids, and control payments and delivery flow.", "client"],
    ["Admin", "Monitor marketplace activity, project health, and platform history.", "admin"],
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 font-semibold text-white">G</div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">GigGrid</p>
              <p className="text-sm text-slate-500">Modern freelance marketplace</p>
            </div>
          </div>
          <Link to="/login" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Sign In
          </Link>
        </div>

        <div className="grid gap-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Production-ready marketplace UI
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
              Cleaner workflows for hiring, bidding, and project delivery.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
              GigGrid gives freelancers, clients, and admins a modern workspace with clear navigation, better separation of concerns, and faster access to the actions that matter.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600">
                Continue to Login
              </Link>
              <Link to="/register" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                Create Account
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map(([label, text, role]) => (
              <button
                key={role}
                type="button"
                onClick={() => selectRole(role)}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-700">
                  {label[0]}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{label}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">{text}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await apiLogin(form.email, form.password);

      if (!user?.role) {
        setError("User role is missing for this account.");
        return;
      }

      await refreshProfile();
      navigate(`/${user.role}/dashboard`, { replace: true });
    } catch (loginError) {
      setError(loginError?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      eyebrow="Workspace access"
      title="Sign in"
      subtitle="Use your account credentials to enter the correct GigGrid workspace."
      sideTitle="Get back into your workflow without the clutter."
      sideText="The new frontend separates discovery, bids, active work, and project management into focused routes so every role gets a cleaner navigation model."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          secure workspace access
        </div>
        <Field label="Email address">
          <input className={inputClassName} type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="name@company.com" />
        </Field>
        <Field label="Password">
          <input className={inputClassName} type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Enter your password" />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? "Signing In..." : "Login"}
        </PrimaryButton>
        <p className="text-sm text-slate-500">
          Do not have an account? <Link className="font-semibold text-brand-600" to="/register">Register here</Link>
        </p>
      </form>
    </AuthSplit>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const selectedRole = localStorage.getItem("selectedRole") || "freelancer";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    qualification: "",
    bio: "",
    preferences: [],
  });

  const categories = [
    "Web Development",
    "Mobile App Development",
    "Graphic Design",
    "Writing & Translation",
    "Digital Marketing",
    "Video & Animation",
    "Other",
  ];

  const onSubmit = async (event) => {
    event.preventDefault();
    if (selectedRole === "admin") {
      setError("Admin registration is not allowed.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiRegister({
        email: form.email,
        password: form.password,
        full_name: form.fullName,
        phone: form.phone,
        qualification: form.qualification,
        preferences: form.preferences.join(", "),
        bio: form.bio,
        role: selectedRole,
      });

      navigate("/login");
    } catch (registerError) {
      setError(registerError?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (value) => {
    setForm((state) => ({
      ...state,
      preferences: state.preferences.includes(value)
        ? state.preferences.filter((item) => item !== value)
        : [...state.preferences, value],
    }));
  };

  return (
    <AuthSplit
      eyebrow="Structured onboarding"
      title="Create your account"
      subtitle="The registration flow now uses a proper two-column layout and grouped fields that stay responsive on every screen size."
      sideTitle="Professional profile setup without broken layout or oversized typography."
      sideText="Account details and professional information are split into separate sections so registration feels lighter, more readable, and easier to complete."
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          {selectedRole} account setup
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Account Info</h3>
            <Field label="Full name"><input className={inputClassName} value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} /></Field>
            <Field label="Email"><input className={inputClassName} type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} /></Field>
            <Field label="Password"><input className={inputClassName} type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} /></Field>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Professional Info</h3>
            <Field label="Phone"><input className={inputClassName} value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} /></Field>
            <Field label="Qualification"><input className={inputClassName} value={form.qualification} onChange={(e) => setForm((s) => ({ ...s, qualification: e.target.value }))} /></Field>
            <Field label="Short bio"><textarea className={`${inputClassName} min-h-28`} value={form.bio} onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))} /></Field>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Preferences</h3>
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

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton type="submit" disabled={loading} className="sm:flex-1">{loading ? "Registering..." : "Register"}</PrimaryButton>
          <SecondaryButton type="button" onClick={() => navigate("/login")} className="sm:flex-1">Back to Login</SecondaryButton>
        </div>
      </form>
    </AuthSplit>
  );
}
