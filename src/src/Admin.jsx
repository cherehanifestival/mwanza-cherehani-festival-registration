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

function whatsappNumber(phone = "") {
  let n = phone.replace(/\D/g, "");

  if (n.startsWith("0")) {
    n = "255" + n.substring(1);
  }

  if (!n.startsWith("255")) {
    n = "255" + n;
  }

  return n;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

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
      setError("Huna ruhusa ya kuingia kwenye mfumo huu.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setRegistrations([]);
  }

  async function loadRegistrations() {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (fetchError) {
      console.error(fetchError);
      setError("Imeshindikana kupakia orodha ya washiriki.");
      return;
    }

    setRegistrations(data || []);
  }

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase
      .from("registrations")
      .update({ hali_ya_usajili: status })
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

    if (selected?.id === id) {
      setSelected((current) => ({
        ...current,
        hali_ya_usajili: status,
      }));
    }
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
                  placeholder="Weka nenosiri"
                  required
                />
              </label>

              {error && <div className="admin-error">{error}</div>}

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
            <h1>Dashibodi ya Usajili</h1>
          </div>

          <div className="header-actions">
            <a href="/" target="_blank">
              Fungua Fomu
            </a>

            <button onClick={logout}>Toka</button>
          </div>
        </header>

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
              <p>Simamia maombi yote yaliyowasilishwa.</p>
            </div>

            <button onClick={loadRegistrations}>
              ↻ Refresh
            </button>
          </div>

          {error && <div className="admin-error">{error}</div>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Jina</th>
                  <th>Biashara</th>
                  <th>Simu</th>
                  <th>Aina ya Ushiriki</th>
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
                        {new Date(r.created_at).toLocaleDateString(
                          "sw-TZ"
                        )}
                      </small>
                    </td>

                    <td>{r.jina_biashara || "—"}</td>

                    <td>{r.namba_simu}</td>

                    <td>
                      {(r.aina_ushiriki || []).join(", ")}
                    </td>

                    <td>
                      <select
                        value={r.hali_ya_usajili}
                        onChange={(e) =>
                          updateStatus(r.id, e.target.value)
                        }
                      >
                        {statuses.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="actions">
                      <button onClick={() => setSelected(r)}>
                        Angalia
                      </button>

                      <a
                        href={`https://wa.me/${whatsappNumber(
                          r.namba_simu
                        )}?text=${encodeURIComponent(
                          `Habari ${r.jina_kamili}, tunawasiliana nawe kutoka Mwanza Cherehani Festival 2026 kuhusu usajili wako.`
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

          {!loading && registrations.length === 0 && (
            <div className="empty">
              Hakuna usajili uliopatikana.
            </div>
          )}
        </section>

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
              <p className="business">
                {selected.jina_biashara || "Hakuna jina la biashara"}
              </p>

              <div className="detail-grid">
                <Info label="Simu" value={selected.namba_simu} />
                <Info
                  label="Barua Pepe"
                  value={selected.barua_pepe || "—"}
                />
                <Info label="Mkoa" value={selected.mkoa} />
                <Info
                  label="Mji/Wilaya"
                  value={selected.mji_wilaya || "—"}
                />
                <Info
                  label="Mahali Biashara Ilipo"
                  value={selected.mahali_biashara_ilipo || "—"}
                />
                <Info
                  label="Muda wa Ushiriki"
                  value={selected.muda_ushiriki || "—"}
                />
              </div>

              <h3>Aina ya Ushiriki</h3>
              <p>
                {(selected.aina_ushiriki || []).join(", ") || "—"}
              </p>

              <h3>Bidhaa / Huduma</h3>
              <p>{selected.maelezo_bidhaa_huduma}</p>

              <h3>Mahitaji</h3>
              <p>
                Meza: {selected.idadi_meza || 0} · Viti:{" "}
                {selected.idadi_viti || 0}
                <br />
                Umeme: {selected.umeme ? "Ndiyo" : "Hapana"} ·
                Tenti: {selected.tenti ? "Ndiyo" : "Hapana"} ·
                Maji: {selected.maji ? "Ndiyo" : "Hapana"}
              </p>

              {selected.mahitaji_mengine && (
                <>
                  <h3>Mahitaji Mengine</h3>
                  <p>{selected.mahitaji_mengine}</p>
                </>
              )}

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
                  <a href={`mailto:${selected.barua_pepe}`}>
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
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f3f4f6;
  color: #1f2937;
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
  box-shadow: 0 20px 50px rgba(0,0,0,.2);
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
  margin-bottom:8px;
}

.login-card h2 {
  font-size:18px;
  color:#6b7280;
  margin-bottom:26px;
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

.dashboard {
  min-height:100vh;
}

.admin-header {
  background:#14532d;
  color:white;
  padding:24px max(20px,5vw);
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
}

.admin-header h1 {
  margin:5px 0 0;
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
  cursor:pointer;
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
  box-shadow:0 5px 15px rgba(0,0,0,.05);
}

.stats span {
  color:#6b7280;
  display:block;
}

.stats strong {
  display:block;
  font-size:30px;
  margin-top:8px;
  color:#14532d;
}

.admin-panel {
  margin:0 max(20px,5vw) 40px;
  background:white;
  border-radius:16px;
  padding:22px;
}

.panel-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.panel-header h2 {
  margin-bottom:3px;
}

.panel-header p {
  margin-top:0;
  color:#6b7280;
}

.panel-header button {
  padding:10px 14px;
  cursor:pointer;
}

.table-wrap {
  overflow-x:auto;
}

table {
  width:100%;
  border-collapse:collapse;
  min-width:900px;
}

th,td {
  text-align:left;
  padding:14px 10px;
  border-bottom:1px solid #e5e7eb;
  vertical-align:top;
}

th {
  background:#f9fafb;
}

td small {
  display:block;
  color:#6b7280;
  margin-top:4px;
}

td select {
  padding:8px;
  border-radius:7px;
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
  cursor:pointer;
}

.empty {
  padding:40px;
  text-align:center;
  color:#6b7280;
}

.modal-backdrop {
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.55);
  display:grid;
  place-items:center;
  padding:20px;
  z-index:20;
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
  cursor:pointer;
}

.detail-modal h2 {
  color:#14532d;
  margin-bottom:3px;
}

.business {
  color:#6b7280;
}

.detail-grid {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
  margin:22px 0;
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

.info strong {
  display:block;
  margin-top:5px;
}

.modal-actions {
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:24px;
}

.modal-actions a {
  background:#166534;
  color:white;
  text-decoration:none;
  padding:11px 15px;
  border-radius:8px;
}

@media(max-width:800px) {
  .stats {
    grid-template-columns:repeat(2,1fr);
  }

  .admin-header {
    align-items:flex-start;
    flex-direction:column;
  }

  .detail-grid {
    grid-template-columns:1fr;
  }
}
`;
