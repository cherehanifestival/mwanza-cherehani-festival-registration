import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ruxcevsfunszrveqhgjm.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = "cherehanifestival2026@gmail.com";

const statuses = [
  ["mpya", "Mpya"],
  ["imepitiwa", "Imepitiwa"],
  ["amewasiliana", "Amewasiliana"],
  ["ametumiwa_malipo", "Ametumiwa Maelekezo ya Malipo"],
  ["amelipa", "Amelipa"],
  ["amethibitishwa", "Amethibitishwa"],
  ["amekataliwa", "Amekataliwa"],
];

const emptyPackage = {
  name: "",
  category: "",
  tent_size: "",
  price: "",
  vat_note: "",
  description: "",
  included_items: "",
  participant_limit: "",
  display_order: 0,
  is_active: true,
};

function whatsappNumber(phone = "") {
  let n = phone.replace(/\D/g, "");

  if (n.startsWith("0")) n = "255" + n.substring(1);
  if (!n.startsWith("255")) n = "255" + n;

  return n;
}

function money(value) {
  return new Intl.NumberFormat("sw-TZ").format(Number(value || 0));
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");

  const [tab, setTab] = useState("registrations");

  const [registrations, setRegistrations] = useState([]);
  const [packages, setPackages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);

  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [savingPackage, setSavingPackage] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) {
      loadRegistrations();
      loadPackages();
    }
  }, [session]);

  async function login(e) {
    e.preventDefault();

    setError("");
    setLoginLoading(true);

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoginLoading(false);

    if (authError) {
      setError("Barua pepe au nenosiri si sahihi.");
      return;
    }

    if (data.user?.email !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setError("Huna ruhusa ya kutumia mfumo huu.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setRegistrations([]);
    setPackages([]);
  }

  async function loadRegistrations() {
    const { data, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError("Imeshindikana kupakia washiriki.");
      return;
    }

    setRegistrations(data || []);
  }

  async function loadPackages() {
    const { data, error: fetchError } = await supabase
      .from("packages")
      .select("*")
      .order("display_order", { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      return;
    }

    setPackages(data || []);
  }

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        hali_ya_usajili: status,
      })
      .eq("id", id);

    if (updateError) {
      alert("Imeshindikana kubadilisha hali ya usajili.");
      return;
    }

    setRegistrations((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, hali_ya_usajili: status }
          : item
      )
    );
  }

  function editPackage(pkg) {
    setEditingPackageId(pkg.id);

    setPackageForm({
      name: pkg.name || "",
      category: pkg.category || "",
      tent_size: pkg.tent_size || "",
      price: pkg.price || "",
      vat_note: pkg.vat_note || "",
      description: pkg.description || "",
      included_items: pkg.included_items || "",
      participant_limit: pkg.participant_limit || "",
      display_order: pkg.display_order || 0,
      is_active: pkg.is_active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelPackageEdit() {
    setEditingPackageId(null);
    setPackageForm(emptyPackage);
  }

  async function savePackage(e) {
    e.preventDefault();

    if (!packageForm.name.trim()) {
      alert("Weka jina la kifurushi.");
      return;
    }

    if (!packageForm.price && Number(packageForm.price) !== 0) {
      alert("Weka bei ya kifurushi.");
      return;
    }

    setSavingPackage(true);

    const payload = {
      name: packageForm.name.trim(),
      category: packageForm.category.trim() || null,
      tent_size: packageForm.tent_size.trim() || null,
      price: Number(packageForm.price) || 0,
      vat_note: packageForm.vat_note.trim() || null,
      description: packageForm.description.trim() || null,
      included_items:
        packageForm.included_items.trim() || null,
      participant_limit:
        packageForm.participant_limit === ""
          ? null
          : Number(packageForm.participant_limit),
      display_order:
        Number(packageForm.display_order) || 0,
      is_active: packageForm.is_active,
      updated_at: new Date().toISOString(),
    };

    let response;

    if (editingPackageId) {
      response = await supabase
        .from("packages")
        .update(payload)
        .eq("id", editingPackageId);
    } else {
      response = await supabase
        .from("packages")
        .insert([payload]);
    }

    setSavingPackage(false);

    if (response.error) {
      console.error(response.error);
      alert("Imeshindikana kuhifadhi kifurushi.");
      return;
    }

    cancelPackageEdit();
    await loadPackages();
  }

  async function togglePackage(pkg) {
    const { error: updateError } = await supabase
      .from("packages")
      .update({
        is_active: !pkg.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pkg.id);

    if (updateError) {
      alert("Imeshindikana kubadilisha kifurushi.");
      return;
    }

    loadPackages();
  }

  const mpya = registrations.filter(
    (r) => r.hali_ya_usajili === "mpya"
  ).length;

  const amelipa = registrations.filter(
    (r) => r.hali_ya_usajili === "amelipa"
  ).length;

  const confirmed = registrations.filter(
    (r) => r.hali_ya_usajili === "amethibitishwa"
  ).length;

  if (loading && !session) {
    return <div className="admin-loading">Inapakia...</div>;
  }

  if (!session) {
    return (
      <>
        <style>{adminStyles}</style>

        <main className="admin-login-page">
          <div className="login-card">
            <div className="admin-badge">ADMIN</div>

            <h1>Mwanza Cherehani Festival 2026</h1>
            <h2>Ingia kwenye Mfumo wa Usimamizi</h2>

            <form onSubmit={login}>
              <label>
                Barua Pepe
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label>
                Nenosiri
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              {error && (
                <div className="admin-error">{error}</div>
              )}

              <button type="submit" disabled={loginLoading}>
                {loginLoading ? "Inaingia..." : "INGIA"}
              </button>
            </form>

            <a href="/">← Rudi kwenye Fomu ya Usajili</a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{adminStyles}</style>

      <main className="dashboard">
        <header className="admin-header">
          <div>
            <small>MWANZA CHEREHANI FESTIVAL 2026</small>
            <h1>Dashibodi ya Usimamizi</h1>
          </div>

          <div className="header-actions">
            <a href="/" target="_blank" rel="noreferrer">
              Fungua Fomu
            </a>

            <button onClick={logout}>Toka</button>
          </div>
        </header>

        <nav className="admin-tabs">
          <button
            className={
              tab === "registrations" ? "active" : ""
            }
            onClick={() => setTab("registrations")}
          >
            Washiriki
          </button>

          <button
            className={tab === "packages" ? "active" : ""}
            onClick={() => setTab("packages")}
          >
            Vifurushi
          </button>
        </nav>

        {tab === "registrations" && (
          <>
            <section className="stats">
              <div>
                <span>Washiriki Wote</span>
                <strong>{registrations.length}</strong>
              </div>

              <div>
                <span>Usajili Mpya</span>
                <strong>{mpya}</strong>
              </div>

              <div>
                <span>Wamelipa</span>
                <strong>{amelipa}</strong>
              </div>

              <div>
                <span>Wamethibitishwa</span>
                <strong>{confirmed}</strong>
              </div>
            </section>

            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <h2>Orodha ya Washiriki</h2>
                  <p>
                    Simamia maombi yote yaliyowasilishwa.
                  </p>
                </div>

                <button onClick={loadRegistrations}>
                  ↻ Refresh
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Jina</th>
                      <th>Biashara</th>
                      <th>Simu</th>
                      <th>Kifurushi</th>
                      <th>Bei</th>
                      <th>Hali</th>
                      <th>Vitendo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {registrations.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.jina_kamili}</strong>

                          <small>
                            {new Date(
                              r.created_at
                            ).toLocaleDateString("sw-TZ")}
                          </small>
                        </td>

                        <td>{r.jina_biashara || "—"}</td>

                        <td>{r.namba_simu}</td>

                        <td>{r.package_name || "—"}</td>

                        <td>
                          {r.package_price
                            ? `TSh ${money(
                                r.package_price
                              )}`
                            : "—"}
                        </td>

                        <td>
                          <select
                            value={r.hali_ya_usajili}
                            onChange={(e) =>
                              updateStatus(
                                r.id,
                                e.target.value
                              )
                            }
                          >
                            {statuses.map(
                              ([value, label]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td className="actions">
                          <button
                            onClick={() => setSelected(r)}
                          >
                            Angalia
                          </button>

                          <a
                            href={`https://wa.me/${whatsappNumber(
                              r.namba_simu
                            )}?text=${encodeURIComponent(
                              `Habari ${
                                r.jina_kamili
                              }, tunawasiliana nawe kutoka Mwanza Cherehani Festival 2026 kuhusu usajili wako${
                                r.package_name
                                  ? `. Umechagua kifurushi cha ${r.package_name} chenye gharama ya TSh ${money(
                                      r.package_price
                                    )}${
                                      r.package_vat_note
                                        ? ` ${r.package_vat_note}`
                                        : ""
                                    }.`
                                  : "."
                              } Tutakutumia maelekezo rasmi ya malipo.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {registrations.length === 0 && (
                <div className="empty">
                  Hakuna usajili uliopatikana.
                </div>
              )}
            </section>
          </>
        )}

        {tab === "packages" && (
          <>
            <section className="package-editor">
              <h2>
                {editingPackageId
                  ? "Hariri Kifurushi"
                  : "Ongeza Kifurushi"}
              </h2>

              <form
                className="package-form"
                onSubmit={savePackage}
              >
                <label>
                  Jina la Kifurushi *
                  <input
                    value={packageForm.name}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Sekta / Aina
                  <input
                    value={packageForm.category}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        category: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Ukubwa wa Tenti / Eneo
                  <input
                    value={packageForm.tent_size}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        tent_size: e.target.value,
                      })
                    }
                    placeholder="Mfano: 5x5 m"
                  />
                </label>

                <label>
                  Bei (TSh) *
                  <input
                    type="number"
                    min="0"
                    value={packageForm.price}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        price: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  VAT
                  <input
                    value={packageForm.vat_note}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        vat_note: e.target.value,
                      })
                    }
                    placeholder="+ VAT"
                  />
                </label>

                <label>
                  Idadi ya Washiriki
                  <input
                    type="number"
                    min="1"
                    value={packageForm.participant_limit}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        participant_limit:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label className="wide">
                  Maelezo ya Kifurushi
                  <textarea
                    rows="3"
                    value={packageForm.description}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="wide">
                  Vitu Vilivyojumuishwa
                  <textarea
                    rows="3"
                    value={packageForm.included_items}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        included_items:
                          e.target.value,
                      })
                    }
                    placeholder="Mfano: Meza 1 + Kiti 1"
                  />
                </label>

                <label>
                  Mpangilio
                  <input
                    type="number"
                    value={packageForm.display_order}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        display_order: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="active-check">
                  <input
                    type="checkbox"
                    checked={packageForm.is_active}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        is_active: e.target.checked,
                      })
                    }
                  />

                  Kifurushi kinaonekana kwa waombaji
                </label>

                <div className="package-buttons wide">
                  <button
                    className="save-package"
                    type="submit"
                    disabled={savingPackage}
                  >
                    {savingPackage
                      ? "Inahifadhi..."
                      : editingPackageId
                      ? "HIFADHI MABADILIKO"
                      : "ONGEZA KIFURUSHI"}
                  </button>

                  {editingPackageId && (
                    <button
                      type="button"
                      className="cancel-package"
                      onClick={cancelPackageEdit}
                    >
                      Ghairi
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <h2>Vifurushi vya Ushiriki</h2>
                  <p>
                    Badilisha bei na maelezo bila kugusa
                    GitHub.
                  </p>
                </div>

                <button onClick={loadPackages}>
                  ↻ Refresh
                </button>
              </div>

              <div className="package-list">
                {packages.map((pkg) => (
                  <div
                    className={`package-admin-card ${
                      !pkg.is_active ? "inactive" : ""
                    }`}
                    key={pkg.id}
                  >
                    <div>
                      <span className="package-status">
                        {pkg.is_active
                          ? "KINAONEKANA"
                          : "KIMEZIMWA"}
                      </span>

                      <h3>{pkg.name}</h3>

                      <strong className="package-price">
                        TSh {money(pkg.price)}
                        {pkg.vat_note
                          ? ` ${pkg.vat_note}`
                          : ""}
                      </strong>

                      <p>
                        {pkg.tent_size || "Ukubwa haujawekwa"}
                      </p>

                      {pkg.description && (
                        <p>{pkg.description}</p>
                      )}

                      {pkg.included_items && (
                        <p>
                          <strong>Inajumuisha:</strong>{" "}
                          {pkg.included_items}
                        </p>
                      )}
                    </div>

                    <div className="package-card-actions">
                      <button
                        onClick={() => editPackage(pkg)}
                      >
                        Hariri
                      </button>

                      <button
                        className={
                          pkg.is_active
                            ? "disable"
                            : "enable"
                        }
                        onClick={() => togglePackage(pkg)}
                      >
                        {pkg.is_active
                          ? "Zima"
                          : "Washa"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {selected && (
          <div
            className="modal-backdrop"
            onClick={() => setSelected(null)}
          >
            <div
              className="detail-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close"
                onClick={() => setSelected(null)}
              >
                ×
              </button>

              <h2>{selected.jina_kamili}</h2>

              <p>
                {selected.jina_biashara ||
                  "Hakuna jina la biashara"}
              </p>

              <div className="detail-grid">
                <Info
                  label="Simu"
                  value={selected.namba_simu}
                />

                <Info
                  label="Barua Pepe"
                  value={selected.barua_pepe || "—"}
                />

                <Info
                  label="Mkoa"
                  value={selected.mkoa}
                />

                <Info
                  label="Mji/Wilaya"
                  value={
                    selected.mji_wilaya || "—"
                  }
                />

                <Info
                  label="Kifurushi"
                  value={
                    selected.package_name || "—"
                  }
                />

                <Info
                  label="Bei"
                  value={
                    selected.package_price
                      ? `TSh ${money(
                          selected.package_price
                        )}`
                      : "—"
                  }
                />

                <Info
                  label="Ukubwa"
                  value={
                    selected.package_tent_size ||
                    "—"
                  }
                />

                <Info
                  label="VAT"
                  value={
                    selected.package_vat_note ||
                    "—"
                  }
                />
              </div>

              <h3>Aina ya Ushiriki</h3>

              <p>
                {(selected.aina_ushiriki || []).join(
                  ", "
                ) || "—"}
              </p>

              <h3>Bidhaa / Huduma</h3>

              <p>
                {selected.maelezo_bidhaa_huduma}
              </p>

              <div className="modal-actions">
                <a
                  href={`https://wa.me/${whatsappNumber(
                    selected.namba_simu
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>

                {selected.barua_pepe && (
                  <a
                    href={`mailto:${selected.barua_pepe}`}
                  >
                    Tuma Email
                  </a>
                )}

                <a href={`tel:${selected.namba_simu}`}>
                  Piga Simu
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const adminStyles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f3f4f6;
  color: #1f2937;
}

button,
input,
textarea,
select {
  font: inherit;
}

.admin-login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(135deg,#14532d,#166534);
}

.login-card {
  width: min(460px,100%);
  background: white;
  padding: 34px;
  border-radius: 20px;
}

.admin-badge {
  display: inline-block;
  padding: 7px 12px;
  border-radius: 99px;
  background: #facc15;
  font-weight: 800;
}

.login-card h1 {
  color:#14532d;
}

.login-card label {
  display:block;
  margin:16px 0;
  font-weight:700;
}

.login-card input {
  width:100%;
  margin-top:7px;
  padding:14px;
  border:1px solid #d1d5db;
  border-radius:10px;
}

.login-card button {
  width:100%;
  padding:15px;
  border:0;
  border-radius:10px;
  background:#166534;
  color:white;
  font-weight:800;
  cursor:pointer;
}

.login-card > a {
  display:block;
  text-align:center;
  margin-top:18px;
  color:#166534;
}

.admin-error {
  background:#fef2f2;
  border:1px solid #fecaca;
  color:#991b1b;
  padding:12px;
  border-radius:10px;
  margin:12px 0;
}

.admin-loading {
  min-height:100vh;
  display:grid;
  place-items:center;
}

.admin-header {
  background:#14532d;
  color:white;
  padding:24px max(20px,5vw);
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.header-actions {
  display:flex;
  gap:10px;
}

.header-actions a,
.header-actions button {
  border:1px solid rgba(255,255,255,.3);
  background:rgba(255,255,255,.1);
  color:white;
  text-decoration:none;
  padding:11px 15px;
  border-radius:9px;
}

.admin-tabs {
  display:flex;
  gap:10px;
  padding:20px max(20px,5vw) 0;
}

.admin-tabs button {
  border:0;
  padding:12px 20px;
  border-radius:10px;
  font-weight:800;
  cursor:pointer;
}

.admin-tabs .active {
  background:#166534;
  color:white;
}

.stats {
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:15px;
  padding:25px max(20px,5vw);
}

.stats div {
  background:white;
  padding:20px;
  border-radius:14px;
}

.stats span {
  color:#6b7280;
}

.stats strong {
  display:block;
  font-size:30px;
  margin-top:8px;
  color:#14532d;
}

.admin-panel,
.package-editor {
  margin:25px max(20px,5vw);
  background:white;
  border-radius:16px;
  padding:22px;
}

.panel-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.table-wrap {
  overflow-x:auto;
}

table {
  width:100%;
  border-collapse:collapse;
  min-width:900px;
}

th,
td {
  text-align:left;
  padding:14px 10px;
  border-bottom:1px solid #e5e7eb;
}

td small {
  display:block;
  color:#6b7280;
}

.actions {
  display:flex;
  gap:7px;
}

.actions a,
.actions button {
  border:0;
  background:#166534;
  color:white;
  padding:8px 10px;
  border-radius:7px;
  text-decoration:none;
}

.package-form {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:16px;
}

.package-form label {
  font-weight:700;
}

.package-form input,
.package-form textarea {
  width:100%;
  margin-top:7px;
  padding:12px;
  border:1px solid #d1d5db;
  border-radius:9px;
}

.package-form .wide {
  grid-column:1 / -1;
}

.active-check {
  display:flex;
  align-items:center;
  gap:10px;
}

.active-check input {
  width:auto;
}

.package-buttons {
  display:flex;
  gap:10px;
}

.save-package {
  background:#166534;
  color:white;
  border:0;
  padding:13px 18px;
  border-radius:9px;
  font-weight:800;
}

.cancel-package {
  border:1px solid #d1d5db;
  background:white;
  padding:13px 18px;
  border-radius:9px;
}

.package-list {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:16px;
}

.package-admin-card {
  border:1px solid #e5e7eb;
  padding:20px;
  border-radius:14px;
}

.package-admin-card.inactive {
  opacity:.55;
}

.package-status {
  font-size:11px;
  background:#dcfce7;
  color:#166534;
  padding:5px 8px;
  border-radius:99px;
  font-weight:800;
}

.package-price {
  display:block;
  font-size:22px;
  color:#14532d;
  margin:8px 0;
}

.package-card-actions {
  display:flex;
  gap:10px;
}

.package-card-actions button {
  border:0;
  padding:10px 14px;
  border-radius:8px;
  cursor:pointer;
}

.package-card-actions button:first-child {
  background:#166534;
  color:white;
}

.package-card-actions .disable {
  background:#fee2e2;
  color:#991b1b;
}

.package-card-actions .enable {
  background:#dcfce7;
  color:#166534;
}

.modal-backdrop {
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.55);
  display:grid;
  place-items:center;
  padding:20px;
}

.detail-modal {
  position:relative;
  width:min(720px,100%);
  max-height:90vh;
  overflow:auto;
  background:white;
  padding:28px;
  border-radius:18px;
}

.close {
  position:absolute;
  right:18px;
  top:12px;
  border:0;
  background:none;
  font-size:30px;
}

.detail-grid {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
}

.info {
  background:#f9fafb;
  padding:13px;
  border-radius:9px;
}

.info span {
  display:block;
  color:#6b7280;
  font-size:13px;
}

.modal-actions {
  display:flex;
  gap:10px;
  margin-top:24px;
}

.modal-actions a {
  background:#166534;
  color:white;
  text-decoration:none;
  padding:11px 15px;
  border-radius:8px;
}

.empty {
  padding:40px;
  text-align:center;
}

@media(max-width:800px) {
  .stats,
  .package-list,
  .package-form {
    grid-template-columns:1fr 1fr;
  }

  .admin-header {
    flex-direction:column;
    align-items:flex-start;
    gap:15px;
  }
}

@media(max-width:600px) {
  .stats,
  .package-list,
  .package-form,
  .detail-grid {
    grid-template-columns:1fr;
  }

  .package-form .wide {
    grid-column:auto;
  }
}
`;
