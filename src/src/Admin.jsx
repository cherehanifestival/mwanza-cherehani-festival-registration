import React, { useEffect, useMemo, useState } from "react";
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
  let n = String(phone || "").replace(/\D/g, "");

  if (n.startsWith("0")) {
    n = "255" + n.substring(1);
  }

  if (!n.startsWith("255")) {
    n = "255" + n;
  }

  return n;
}

function money(value) {
  return new Intl.NumberFormat("sw-TZ").format(Number(value || 0));
}

function sameDay(dateValue, compareDate = new Date()) {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  );
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("sw-TZ");
  } catch {
    return "—";
  }
}

export default function Admin() {
  const [session, setSession] = useState(null);

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");

  const [tab, setTab] = useState("registrations");

  const [registrations, setRegistrations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [agents, setAgents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [search, setSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");

  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [savingPackage, setSavingPackage] = useState(false);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        setRegistrations([]);
        setPackages([]);
        setAgents([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) {
      loadEverything();
    }
  }, [session]);

  async function checkSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (
      currentSession?.user &&
      currentSession.user.email !== ADMIN_EMAIL
    ) {
      await supabase.auth.signOut();
      setSession(null);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setLoading(false);
  }

  async function login(e) {
    e.preventDefault();

    setError("");
    setLoginLoading(true);

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
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
      return;
    }

    setSession(data.session);
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setRegistrations([]);
    setPackages([]);
    setAgents([]);
    setPassword("");
    setTab("registrations");
  }

  async function loadEverything() {
    setDataLoading(true);
    setError("");

    await Promise.all([
      loadRegistrations(),
      loadPackages(),
      loadAgents(),
    ]);

    setDataLoading(false);
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

  async function loadAgents() {
    const { data, error: fetchError } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError("Imeshindikana kupakia agents.");
      return;
    }

    setAgents(data || []);
  }

  function getAgent(agentId) {
    if (!agentId) return null;

    return agents.find((agent) => agent.id === agentId) || null;
  }

  function getAgentName(agentId) {
    if (!agentId) return "Public";

    const agent = getAgent(agentId);

    return agent?.full_name || "Agent";
  }

  function getAgentRegistrations(agentId) {
    return registrations.filter(
      (registration) => registration.agent_id === agentId
    );
  }

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        hali_ya_usajili: status,
      })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      alert("Imeshindikana kubadilisha hali ya usajili.");
      return;
    }

    setRegistrations((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              hali_ya_usajili: status,
            }
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

  async function toggleAgent(agent) {
    const newValue = !agent.is_active;

    const { error: updateError } = await supabase
      .from("agents")
      .update({
        is_active: newValue,
      })
      .eq("id", agent.id);

    if (updateError) {
      console.error(updateError);
      alert("Imeshindikana kubadilisha hali ya agent.");
      return;
    }

    setAgents((current) =>
      current.map((item) =>
        item.id === agent.id
          ? {
              ...item,
              is_active: newValue,
            }
          : item
      )
    );

    if (selectedAgent?.id === agent.id) {
      setSelectedAgent((current) => ({
        ...current,
        is_active: newValue,
      }));
    }
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
      is_active: Boolean(pkg.is_active),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

    if (
      packageForm.price === "" ||
      packageForm.price === null ||
      packageForm.price === undefined
    ) {
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
      console.error(updateError);
      alert("Imeshindikana kubadilisha kifurushi.");
      return;
    }

    await loadPackages();
  }

  const filteredRegistrations = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return registrations;
    }

    return registrations.filter((r) => {
      const agentName = getAgentName(r.agent_id);

      const values = [
        r.jina_kamili,
        r.jina_biashara,
        r.namba_simu,
        r.package_name,
        r.hali_ya_usajili,
        agentName,
      ];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [registrations, agents, search]);

  const filteredAgents = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();

    if (!q) {
      return agents;
    }

    return agents.filter((agent) =>
      [
        agent.full_name,
        agent.email,
        agent.phone,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [agents, agentSearch]);

  const mpya = registrations.filter(
    (r) => r.hali_ya_usajili === "mpya"
  ).length;

  const amelipa = registrations.filter(
    (r) => r.hali_ya_usajili === "amelipa"
  ).length;

  const confirmed = registrations.filter(
    (r) => r.hali_ya_usajili === "amethibitishwa"
  ).length;

  const todayRegistrations = registrations.filter((r) =>
    sameDay(r.created_at)
  ).length;

  const publicRegistrations = registrations.filter(
    (r) => !r.agent_id
  ).length;

  const agentRegistrations = registrations.filter(
    (r) => Boolean(r.agent_id)
  ).length;

  const activeAgents = agents.filter(
    (agent) => agent.is_active
  ).length;

  const totalExpectedRevenue = registrations.reduce(
    (sum, r) => sum + Number(r.package_price || 0),
    0
  );

  const paidRevenue = registrations
    .filter(
      (r) =>
        r.hali_ya_usajili === "amelipa" ||
        r.hali_ya_usajili === "amethibitishwa"
    )
    .reduce(
      (sum, r) => sum + Number(r.package_price || 0),
      0
    );

  const packageReport = useMemo(() => {
    const map = {};

    registrations.forEach((registration) => {
      const name =
        registration.package_name || "Haijatajwa";

      if (!map[name]) {
        map[name] = {
          name,
          count: 0,
          amount: 0,
        };
      }

      map[name].count += 1;

      map[name].amount += Number(
        registration.package_price || 0
      );
    });

    return Object.values(map).sort(
      (a, b) => b.count - a.count
    );
  }, [registrations]);

  const agentPerformance = useMemo(() => {
    return agents
      .map((agent) => {
        const list = getAgentRegistrations(agent.id);

        const today = list.filter((r) =>
          sameDay(r.created_at)
        ).length;

        const paid = list.filter(
          (r) =>
            r.hali_ya_usajili === "amelipa" ||
            r.hali_ya_usajili === "amethibitishwa"
        ).length;

        return {
          ...agent,
          total: list.length,
          today,
          paid,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [agents, registrations]);

  if (loading) {
    return (
      <>
        <style>{adminStyles}</style>

        <div className="admin-loading">
          Inapakia...
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <style>{adminStyles}</style>

        <main className="admin-login-page">
          <div className="login-card">
            <div className="admin-badge">
              ADMIN
            </div>

            <h1>
              Mwanza Cherehani Festival 2026
            </h1>

            <h2>
              Ingia kwenye Mfumo wa Usimamizi
            </h2>

            <form onSubmit={login}>
              <label>
                Barua Pepe

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />
              </label>

              <label>
                Nenosiri

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />
              </label>

              {error && (
                <div className="admin-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading
                  ? "Inaingia..."
                  : "INGIA"}
              </button>
            </form>

            <a href="/">
              ← Rudi kwenye Fomu ya Usajili
            </a>
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
            <small>
              MWANZA CHEREHANI FESTIVAL 2026
            </small>

            <h1>
              Dashibodi ya Usimamizi
            </h1>
          </div>

          <div className="header-actions">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              Fungua Fomu
            </a>

            <button
              onClick={loadEverything}
              disabled={dataLoading}
            >
              {dataLoading
                ? "Inapakia..."
                : "↻ Refresh"}
            </button>

            <button onClick={logout}>
              Toka
            </button>
          </div>
        </header>

        {error && (
          <div className="top-error">
            {error}
          </div>
        )}

        <nav className="admin-tabs">
          <button
            className={
              tab === "registrations"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("registrations")
            }
          >
            Washiriki
          </button>

          <button
            className={
              tab === "agents"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("agents")
            }
          >
            Agents
          </button>

          <button
            className={
              tab === "packages"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("packages")
            }
          >
            Vifurushi
          </button>

          <button
            className={
              tab === "reports"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("reports")
            }
          >
            Ripoti
          </button>
        </nav>

        {tab === "registrations" && (
          <>
            <section className="stats">
              <StatCard
                label="Washiriki Wote"
                value={registrations.length}
              />

              <StatCard
                label="Usajili Mpya"
                value={mpya}
              />

              <StatCard
                label="Wamelipa"
                value={amelipa}
              />

              <StatCard
                label="Wamethibitishwa"
                value={confirmed}
              />
            </section>

            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Orodha ya Washiriki
                  </h2>

                  <p>
                    Simamia maombi yote
                    yaliyowasilishwa.
                  </p>
                </div>

                <button
                  onClick={loadRegistrations}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="toolbar">
                <input
                  type="search"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Tafuta jina, biashara, simu, kifurushi au agent..."
                />

                <span>
                  {filteredRegistrations.length}
                  {" "}
                  washiriki
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Jina</th>
                      <th>Biashara</th>
                      <th>Simu</th>
                      <th>Agent</th>
                      <th>Kifurushi</th>
                      <th>Bei</th>
                      <th>Hali</th>
                      <th>Vitendo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRegistrations.map(
                      (r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>
                              {r.jina_kamili}
                            </strong>

                            <small>
                              {formatDate(
                                r.created_at
                              )}
                            </small>
                          </td>

                          <td>
                            {r.jina_biashara ||
                              "—"}
                          </td>

                          <td>
                            {r.namba_simu}
                          </td>

                          <td>
                            {r.agent_id ? (
                              <button
                                type="button"
                                className="agent-link"
                                onClick={() => {
                                  const agent =
                                    getAgent(
                                      r.agent_id
                                    );

                                  if (agent) {
                                    setSelectedAgent(
                                      agent
                                    );
                                  }
                                }}
                              >
                                {getAgentName(
                                  r.agent_id
                                )}
                              </button>
                            ) : (
                              <span className="public-badge">
                                Public
                              </span>
                            )}
                          </td>

                          <td>
                            {r.package_name ||
                              "—"}
                          </td>

                          <td>
                            {r.package_price
                              ? `TSh ${money(
                                  r.package_price
                                )}`
                              : "—"}
                          </td>

                          <td>
                            <select
                              value={
                                r.hali_ya_usajili ||
                                "mpya"
                              }
                              onChange={(e) =>
                                updateStatus(
                                  r.id,
                                  e.target.value
                                )
                              }
                            >
                              {statuses.map(
                                ([
                                  value,
                                  label,
                                ]) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {label}
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td className="actions">
                            <button
                              onClick={() =>
                                setSelected(r)
                              }
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
                                    ? `. Umechagua kifurushi cha ${
                                        r.package_name
                                      } chenye gharama ya TSh ${money(
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
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRegistrations.length ===
                0 && (
                <div className="empty">
                  Hakuna usajili
                  uliopatikana.
                </div>
              )}
            </section>
          </>
        )}

        {tab === "agents" && (
          <>
            <section className="stats">
              <StatCard
                label="Agents Wote"
                value={agents.length}
              />

              <StatCard
                label="Active Agents"
                value={activeAgents}
              />

              <StatCard
                label="Usajili wa Agents"
                value={agentRegistrations}
              />

              <StatCard
                label="Usajili Leo"
                value={todayRegistrations}
              />
            </section>

            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Agents
                  </h2>

                  <p>
                    Simamia agents na uone
                    performance yao.
                  </p>
                </div>

                <button
                  onClick={loadAgents}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="agent-note">
                <strong>
                  Kuongeza Agent Mpya:
                </strong>

                {" "}
                tengeneza user kwanza
                Supabase Authentication,
                kisha ongeza row yenye UID
                ileile kwenye table ya
                agents.
              </div>

              <div className="toolbar">
                <input
                  type="search"
                  value={agentSearch}
                  onChange={(e) =>
                    setAgentSearch(
                      e.target.value
                    )
                  }
                  placeholder="Tafuta agent kwa jina, email au simu..."
                />

                <span>
                  {filteredAgents.length}
                  {" "}
                  agents
                </span>
              </div>

              <div className="agent-grid">
                {filteredAgents.map(
                  (agent) => {
                    const agentRegs =
                      getAgentRegistrations(
                        agent.id
                      );

                    const today =
                      agentRegs.filter((r) =>
                        sameDay(
                          r.created_at
                        )
                      ).length;

                    return (
                      <div
                        className="agent-card"
                        key={agent.id}
                      >
                        <div className="agent-card-head">
                          <div>
                            <span
                              className={
                                agent.is_active
                                  ? "status-active"
                                  : "status-inactive"
                              }
                            >
                              {agent.is_active
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>

                            <h3>
                              {agent.full_name ||
                                "Agent"}
                            </h3>
                          </div>

                          <strong className="agent-total">
                            {
                              agentRegs.length
                            }
                          </strong>
                        </div>

                        <p>
                          {agent.email ||
                            "—"}
                        </p>

                        <p>
                          {agent.phone ||
                            "—"}
                        </p>

                        <div className="agent-mini-stats">
                          <div>
                            <span>
                              Jumla
                            </span>

                            <strong>
                              {
                                agentRegs.length
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Leo
                            </span>

                            <strong>
                              {today}
                            </strong>
                          </div>
                        </div>

                        <div className="agent-card-actions">
                          <button
                            onClick={() =>
                              setSelectedAgent(
                                agent
                              )
                            }
                          >
                            Angalia
                          </button>

                          <button
                            className={
                              agent.is_active
                                ? "danger-button"
                                : "success-button"
                            }
                            onClick={() =>
                              toggleAgent(
                                agent
                              )
                            }
                          >
                            {agent.is_active
                              ? "Zima Agent"
                              : "Washa Agent"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {filteredAgents.length ===
                0 && (
                <div className="empty">
                  Hakuna agent
                  aliyepatikana.
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
                    value={
                      packageForm.name
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        name:
                          e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Sekta / Aina

                  <input
                    value={
                      packageForm.category
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        category:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Ukubwa wa Tenti / Eneo

                  <input
                    value={
                      packageForm.tent_size
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        tent_size:
                          e.target.value,
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
                    value={
                      packageForm.price
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        price:
                          e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  VAT

                  <input
                    value={
                      packageForm.vat_note
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        vat_note:
                          e.target.value,
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
                    value={
                      packageForm.participant_limit
                    }
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
                    value={
                      packageForm.description
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        description:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label className="wide">
                  Vitu Vilivyojumuishwa

                  <textarea
                    rows="3"
                    value={
                      packageForm.included_items
                    }
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
                    value={
                      packageForm.display_order
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        display_order:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label className="active-check">
                  <input
                    type="checkbox"
                    checked={
                      packageForm.is_active
                    }
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        is_active:
                          e.target.checked,
                      })
                    }
                  />

                  Kifurushi kinaonekana
                  kwa waombaji
                </label>

                <div className="package-buttons wide">
                  <button
                    className="save-package"
                    type="submit"
                    disabled={
                      savingPackage
                    }
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
                      onClick={
                        cancelPackageEdit
                      }
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
                  <h2>
                    Vifurushi vya Ushiriki
                  </h2>

                  <p>
                    Badilisha bei na
                    maelezo bila kugusa
                    GitHub.
                  </p>
                </div>

                <button
                  onClick={loadPackages}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="package-list">
                {packages.map((pkg) => (
                  <div
                    className={`package-admin-card ${
                      !pkg.is_active
                        ? "inactive"
                        : ""
                    }`}
                    key={pkg.id}
                  >
                    <div>
                      <span className="package-status">
                        {pkg.is_active
                          ? "KINAONEKANA"
                          : "KIMEZIMWA"}
                      </span>

                      <h3>
                        {pkg.name}
                      </h3>

                      <strong className="package-price">
                        TSh{" "}
                        {money(
                          pkg.price
                        )}

                        {pkg.vat_note
                          ? ` ${pkg.vat_note}`
                          : ""}
                      </strong>

                      <p>
                        {pkg.tent_size ||
                          "Ukubwa haujawekwa"}
                      </p>

                      {pkg.description && (
                        <p>
                          {
                            pkg.description
                          }
                        </p>
                      )}

                      {pkg.included_items && (
                        <p>
                          <strong>
                            Inajumuisha:
                          </strong>{" "}
                          {
                            pkg.included_items
                          }
                        </p>
                      )}
                    </div>

                    <div className="package-card-actions">
                      <button
                        onClick={() =>
                          editPackage(pkg)
                        }
                      >
                        Hariri
                      </button>

                      <button
                        className={
                          pkg.is_active
                            ? "disable"
                            : "enable"
                        }
                        onClick={() =>
                          togglePackage(
                            pkg
                          )
                        }
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

        {tab === "reports" && (
          <>
            <section className="stats">
              <StatCard
                label="Washiriki Wote"
                value={registrations.length}
              />

              <StatCard
                label="Usajili Leo"
                value={todayRegistrations}
              />

              <StatCard
                label="Kupitia Agents"
                value={agentRegistrations}
              />

              <StatCard
                label="Public"
                value={publicRegistrations}
              />
            </section>

            <section className="report-money-grid">
              <div>
                <span>
                  Thamani ya Usajili
                </span>

                <strong>
                  TSh{" "}
                  {money(
                    totalExpectedRevenue
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Waliolipa /
                  Waliothibitishwa
                </span>

                <strong>
                  TSh{" "}
                  {money(
                    paidRevenue
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Agents Active
                </span>

                <strong>
                  {activeAgents}
                </strong>
              </div>
            </section>

            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Performance ya Agents
                  </h2>

                  <p>
                    Linganisha usajili
                    wa agents.
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Simu</th>
                      <th>Jumla</th>
                      <th>Leo</th>
                      <th>Wamelipa</th>
                      <th>Hali</th>
                    </tr>
                  </thead>

                  <tbody>
                    {agentPerformance.map(
                      (agent) => (
                        <tr
                          key={agent.id}
                        >
                          <td>
                            <button
                              className="agent-link"
                              onClick={() =>
                                setSelectedAgent(
                                  agent
                                )
                              }
                            >
                              {agent.full_name}
                            </button>

                            <small>
                              {agent.email ||
                                "—"}
                            </small>
                          </td>

                          <td>
                            {agent.phone ||
                              "—"}
                          </td>

                          <td>
                            <strong>
                              {agent.total}
                            </strong>
                          </td>

                          <td>
                            {agent.today}
                          </td>

                          <td>
                            {agent.paid}
                          </td>

                          <td>
                            <span
                              className={
                                agent.is_active
                                  ? "status-active"
                                  : "status-inactive"
                              }
                            >
                              {agent.is_active
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Ripoti kwa Vifurushi
                  </h2>

                  <p>
                    Idadi ya washiriki
                    kwa kila kifurushi.
                  </p>
                </div>
              </div>

              <div className="package-report-grid">
                {packageReport.map(
                  (item) => (
                    <div
                      className="report-package-card"
                      key={item.name}
                    >
                      <span>
                        {item.name}
                      </span>

                      <strong>
                        {item.count}
                      </strong>

                      <small>
                        TSh{" "}
                        {money(
                          item.amount
                        )}
                      </small>
                    </div>
                  )
                )}
              </div>
            </section>
          </>
        )}

        {selected && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setSelected(null)
            }
          >
            <div
              className="detail-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                className="close"
                onClick={() =>
                  setSelected(null)
                }
              >
                ×
              </button>

              <h2>
                {selected.jina_kamili}
              </h2>

              <p>
                {selected.jina_biashara ||
                  "Hakuna jina la biashara"}
              </p>

              <div className="detail-grid">
                <Info
                  label="Simu"
                  value={
                    selected.namba_simu
                  }
                />

                <Info
                  label="Barua Pepe"
                  value={
                    selected.barua_pepe ||
                    "—"
                  }
                />

                <Info
                  label="Mkoa"
                  value={
                    selected.mkoa ||
                    "—"
                  }
                />

                <Info
                  label="Mji/Wilaya"
                  value={
                    selected.mji_wilaya ||
                    "—"
                  }
                />

                <Info
                  label="Agent"
                  value={getAgentName(
                    selected.agent_id
                  )}
                />

                <Info
                  label="Kifurushi"
                  value={
                    selected.package_name ||
                    "—"
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

                <Info
                  label="Hali"
                  value={
                    statuses.find(
                      ([value]) =>
                        value ===
                        selected.hali_ya_usajili
                    )?.[1] || "Mpya"
                  }
                />
              </div>

              <h3>
                Aina ya Ushiriki
              </h3>

              <p>
                {(selected.aina_ushiriki ||
                  []).join(", ") ||
                  "—"}
              </p>

              <h3>
                Bidhaa / Huduma
              </h3>

              <p>
                {selected.maelezo_bidhaa_huduma ||
                  "—"}
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

                <a
                  href={`tel:${selected.namba_simu}`}
                >
                  Piga Simu
                </a>
              </div>
            </div>
          </div>
        )}

        {selectedAgent && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setSelectedAgent(null)
            }
          >
            <div
              className="detail-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                className="close"
                onClick={() =>
                  setSelectedAgent(null)
                }
              >
                ×
              </button>

              <span
                className={
                  selectedAgent.is_active
                    ? "status-active"
                    : "status-inactive"
                }
              >
                {selectedAgent.is_active
                  ? "ACTIVE"
                  : "INACTIVE"}
              </span>

              <h2>
                {selectedAgent.full_name}
              </h2>

              <div className="detail-grid">
                <Info
                  label="Email"
                  value={
                    selectedAgent.email ||
                    "—"
                  }
                />

                <Info
                  label="Simu"
                  value={
                    selectedAgent.phone ||
                    "—"
                  }
                />

                <Info
                  label="Jumla ya Usajili"
                  value={
                    getAgentRegistrations(
                      selectedAgent.id
                    ).length
                  }
                />

                <Info
                  label="Usajili Leo"
                  value={
                    getAgentRegistrations(
                      selectedAgent.id
                    ).filter((r) =>
                      sameDay(
                        r.created_at
                      )
                    ).length
                  }
                />

                <Info
                  label="Tarehe ya Kuongezwa"
                  value={formatDate(
                    selectedAgent.created_at
                  )}
                />

                <Info
                  label="Agent ID"
                  value={
                    selectedAgent.id
                  }
                />
              </div>

              <h3>
                Washiriki wa Agent
              </h3>

              <div className="agent-registration-list">
                {getAgentRegistrations(
                  selectedAgent.id
                ).length === 0 ? (
                  <p>
                    Agent huyu bado
                    hana usajili.
                  </p>
                ) : (
                  getAgentRegistrations(
                    selectedAgent.id
                  ).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedAgent(
                          null
                        );
                        setSelected(r);
                      }}
                    >
                      <div>
                        <strong>
                          {
                            r.jina_kamili
                          }
                        </strong>

                        <small>
                          {r.jina_biashara ||
                            "—"}
                        </small>
                      </div>

                      <span>
                        {formatDate(
                          r.created_at
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="modal-actions">
                {selectedAgent.phone && (
                  <a
                    href={`https://wa.me/${whatsappNumber(
                      selectedAgent.phone
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}

                {selectedAgent.email && (
                  <a
                    href={`mailto:${selectedAgent.email}`}
                  >
                    Email
                  </a>
                )}

                <button
                  className={
                    selectedAgent.is_active
                      ? "danger-button"
                      : "success-button"
                  }
                  onClick={() =>
                    toggleAgent(
                      selectedAgent
                    )
                  }
                >
                  {selectedAgent.is_active
                    ? "Zima Agent"
                    : "Washa Agent"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Info({
  label,
  value,
}) {
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

button {
  cursor: pointer;
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
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}

.admin-badge {
  display: inline-block;
  padding: 7px 12px;
  border-radius: 99px;
  background: #facc15;
  color: #111827;
  font-weight: 800;
}

.login-card h1 {
  color: #14532d;
}

.login-card h2 {
  font-size: 18px;
  font-weight: 600;
}

.login-card label {
  display: block;
  margin: 16px 0;
  font-weight: 700;
}

.login-card input {
  width: 100%;
  margin-top: 7px;
  padding: 14px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
}

.login-card button {
  width: 100%;
  padding: 15px;
  border: 0;
  border-radius: 10px;
  background: #166534;
  color: white;
  font-weight: 800;
}

.login-card > a {
  display: block;
  text-align: center;
  margin-top: 18px;
  color: #166534;
}

.admin-error,
.top-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 12px;
  border-radius: 10px;
}

.admin-error {
  margin: 12px 0;
}

.top-error {
  margin: 20px max(20px,5vw) 0;
}

.admin-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-size: 20px;
}

.dashboard {
  min-height: 100vh;
}

.admin-header {
  background: #14532d;
  color: white;
  padding: 24px max(20px,5vw);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-header h1 {
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.header-actions a,
.header-actions button {
  border: 1px solid rgba(255,255,255,.3);
  background: rgba(255,255,255,.1);
  color: white;
  text-decoration: none;
  padding: 11px 15px;
  border-radius: 9px;
}

.admin-tabs {
  display: flex;
  gap: 10px;
  padding: 20px max(20px,5vw) 0;
  overflow-x: auto;
}

.admin-tabs button {
  border: 0;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 800;
  white-space: nowrap;
  background: #e5e7eb;
}

.admin-tabs .active {
  background: #166534;
  color: white;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 15px;
  padding: 25px max(20px,5vw);
}

.stats div {
  background: white;
  padding: 20px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.03);
}

.stats span {
  color: #6b7280;
}

.stats strong {
  display: block;
  font-size: 30px;
  margin-top: 8px;
  color: #14532d;
}

.admin-panel,
.package-editor {
  margin: 25px max(20px,5vw);
  background: white;
  border-radius: 16px;
  padding: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.panel-header h2 {
  margin-bottom: 5px;
}

.panel-header p {
  color: #6b7280;
}

.panel-header > button {
  border: 1px solid #d1d5db;
  background: white;
  padding: 9px 13px;
  border-radius: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin: 22px 0;
}

.toolbar input {
  width: min(500px,100%);
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
}

.toolbar span {
  color: #6b7280;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1050px;
}

th,
td {
  text-align: left;
  padding: 14px 10px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

th {
  color: #374151;
}

td small {
  display: block;
  color: #6b7280;
  margin-top: 3px;
}

td select {
  width: 100%;
  min-width: 180px;
  padding: 10px;
  border-radius: 9px;
  border: 1px solid #d1d5db;
  background: white;
}

.actions {
  display: flex;
  gap: 7px;
}

.actions a,
.actions button {
  border: 0;
  background: #166534;
  color: white;
  padding: 8px 10px;
  border-radius: 7px;
  text-decoration: none;
}

.agent-link {
  border: 0;
  background: none;
  color: #166534;
  padding: 0;
  font-weight: 800;
  text-align: left;
}

.public-badge {
  display: inline-block;
  background: #e5e7eb;
  color: #374151;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.agent-note {
  padding: 14px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 10px;
  margin: 18px 0;
  color: #713f12;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 16px;
}

.agent-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 20px;
}

.agent-card-head {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.agent-card h3 {
  margin: 10px 0 4px;
}

.agent-card p {
  margin: 8px 0;
  color: #6b7280;
  word-break: break-word;
}

.agent-total {
  font-size: 32px;
  color: #14532d;
}

.status-active,
.status-inactive {
  display: inline-block;
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 999px;
  font-weight: 800;
}

.status-active {
  color: #166534;
  background: #dcfce7;
}

.status-inactive {
  color: #991b1b;
  background: #fee2e2;
}

.agent-mini-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 18px 0;
}

.agent-mini-stats div {
  background: #f9fafb;
  border-radius: 9px;
  padding: 12px;
}

.agent-mini-stats span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.agent-mini-stats strong {
  display: block;
  font-size: 22px;
  color: #14532d;
  margin-top: 4px;
}

.agent-card-actions,
.package-card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.agent-card-actions button,
.package-card-actions button {
  border: 0;
  padding: 10px 14px;
  border-radius: 8px;
}

.agent-card-actions button:first-child,
.package-card-actions button:first-child {
  background: #166534;
  color: white;
}

.danger-button {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border: 0 !important;
  padding: 10px 14px !important;
  border-radius: 8px !important;
}

.success-button {
  background: #dcfce7 !important;
  color: #166534 !important;
  border: 0 !important;
  padding: 10px 14px !important;
  border-radius: 8px !important;
}

.package-form {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 16px;
}

.package-form label {
  font-weight: 700;
}

.package-form input,
.package-form textarea {
  width: 100%;
  margin-top: 7px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
}

.package-form .wide {
  grid-column: 1 / -1;
}

.active-check {
  display: flex;
  align-items: center;
  gap: 10px;
}

.active-check input {
  width: auto;
}

.package-buttons {
  display: flex;
  gap: 10px;
}

.save-package {
  background: #166534;
  color: white;
  border: 0;
  padding: 13px 18px;
  border-radius: 9px;
  font-weight: 800;
}

.cancel-package {
  border: 1px solid #d1d5db;
  background: white;
  padding: 13px 18px;
  border-radius: 9px;
}

.package-list {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 16px;
}

.package-admin-card {
  border: 1px solid #e5e7eb;
  padding: 20px;
  border-radius: 14px;
}

.package-admin-card.inactive {
  opacity: .55;
}

.package-status {
  font-size: 11px;
  background: #dcfce7;
  color: #166534;
  padding: 5px 8px;
  border-radius: 99px;
  font-weight: 800;
}

.package-price {
  display: block;
  font-size: 22px;
  color: #14532d;
  margin: 8px 0;
}

.package-card-actions .disable {
  background: #fee2e2;
  color: #991b1b;
}

.package-card-actions .enable {
  background: #dcfce7;
  color: #166534;
}

.report-money-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 15px;
  margin: 0 max(20px,5vw) 25px;
}

.report-money-grid > div {
  background: #14532d;
  color: white;
  padding: 22px;
  border-radius: 14px;
}

.report-money-grid span {
  display: block;
  opacity: .8;
}

.report-money-grid strong {
  display: block;
  margin-top: 10px;
  font-size: 26px;
}

.package-report-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 15px;
}

.report-package-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 18px;
  border-radius: 12px;
}

.report-package-card span {
  display: block;
  color: #6b7280;
}

.report-package-card strong {
  display: block;
  color: #14532d;
  font-size: 32px;
  margin: 8px 0;
}

.report-package-card small {
  color: #6b7280;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 9999;
}

.detail-modal {
  position: relative;
  width: min(760px,100%);
  max-height: 90vh;
  overflow: auto;
  background: white;
  padding: 28px;
  border-radius: 18px;
}

.close {
  position: absolute;
  right: 18px;
  top: 12px;
  border: 0;
  background: none;
  font-size: 30px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 12px;
  margin-top: 20px;
}

.info {
  background: #f9fafb;
  padding: 13px;
  border-radius: 9px;
  overflow: hidden;
}

.info span {
  display: block;
  color: #6b7280;
  font-size: 13px;
}

.info strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.modal-actions a,
.modal-actions button {
  background: #166534;
  color: white;
  text-decoration: none;
  padding: 11px 15px;
  border-radius: 8px;
  border: 0;
}

.agent-registration-list {
  display: grid;
  gap: 8px;
  margin-top: 15px;
}

.agent-registration-list > button {
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 12px;
  border-radius: 9px;
  display: flex;
  justify-content: space-between;
  text-align: left;
  gap: 15px;
}

.agent-registration-list small {
  display: block;
  color: #6b7280;
  margin-top: 4px;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

@media(max-width:1000px) {
  .agent-grid,
  .package-report-grid {
    grid-template-columns: repeat(2,1fr);
  }
}

@media(max-width:800px) {
  .stats,
  .package-list,
  .package-form,
  .report-money-grid {
    grid-template-columns: 1fr 1fr;
  }

  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}

@media(max-width:600px) {
  .stats,
  .package-list,
  .package-form,
  .detail-grid,
  .agent-grid,
  .package-report-grid,
  .report-money-grid {
    grid-template-columns: 1fr;
  }

  .package-form .wide {
    grid-column: auto;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar span {
    white-space: normal;
  }

  .panel-header {
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions a,
  .header-actions button {
    flex: 1;
    text-align: center;
  }
}
`;
