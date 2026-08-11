import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ruxcevsfunszrveqhgjm.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Agent() {
  const [session, setSession] = useState(null);
  const [agent, setAgent] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  const [view, setView] = useState("home");
  const [registrations, setRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        loadAgent(newSession.user.id);
      } else {
        setAgent(null);
        setView("home");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (currentSession?.user) {
      await loadAgent(currentSession.user.id);
    } else {
      setLoading(false);
    }
  }

  async function loadAgent(userId) {
    setLoading(true);
    setError("");

    const { data, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (agentError || !data) {
      setAgent(null);
      setError("Huna ruhusa ya kufikia Agent Panel.");
    } else {
      setAgent(data);
    }

    setLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();

    setLoginLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError("Email au password si sahihi.");
      setLoginLoading(false);
      return;
    }

    if (data.user) {
      await loadAgent(data.user.id);
    }

    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setSession(null);
    setAgent(null);
    setEmail("");
    setPassword("");
    setRegistrations([]);
    setView("home");
    setError("");
  }

  async function loadRegistrations() {
    setRegistrationsLoading(true);
    setError("");

    const { data, error: registrationsError } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (registrationsError) {
      console.error(registrationsError);
      setRegistrations([]);
      setError("Imeshindikana kupakia usajili.");
    } else {
      setRegistrations(data || []);
    }

    setRegistrationsLoading(false);
  }

  async function openRegistrations() {
    await loadRegistrations();
    setView("registrations");
  }

  async function openReports() {
    await loadRegistrations();
    setView("reports");
  }

  function openRegistrationForm() {
    if (!session?.user?.id) return;

    window.location.href = `/?agent=${session.user.id}`;
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Inapakia...</p>
      </div>
    );
  }

  if (!session || !agent) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <div style={styles.logo}>CF</div>

          <h1 style={styles.title}>Agent Login</h1>

          <p style={styles.subtitle}>
            Mwanza Cherehani Festival 2026
          </p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <label style={styles.label}>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="agent@email.com"
            />

            <label style={styles.label}>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={loginLoading}
              style={styles.button}
            >
              {loginLoading ? "Inaingia..." : "Ingia Agent Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Agent Panel</h2>
          <small>Mwanza Cherehani Festival 2026</small>
        </div>

        <button onClick={handleLogout} style={styles.logout}>
          Logout
        </button>
      </header>

      <main style={styles.content}>
        {view === "home" && (
          <>
            <div style={styles.welcome}>
              <p style={{ margin: 0 }}>Karibu</p>

              <h1 style={{ marginTop: 6 }}>
                {agent.full_name}
              </h1>

              <p>{agent.email}</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.grid}>
              <button
                type="button"
                style={styles.cardButton}
                onClick={openRegistrations}
              >
                <h3 style={styles.cardTitle}>Usajili Wangu</h3>
                <p style={styles.cardText}>
                  Angalia washiriki uliojisajilia.
                </p>
                <strong>Fungua →</strong>
              </button>

              <button
                type="button"
                style={styles.cardButton}
                onClick={openRegistrationForm}
              >
                <h3 style={styles.cardTitle}>Sajili Mshiriki</h3>
                <p style={styles.cardText}>
                  Ongeza mshiriki mpya wa festival.
                </p>
                <strong>Sajili sasa →</strong>
              </button>

              <button
                type="button"
                style={styles.cardButton}
                onClick={openReports}
              >
                <h3 style={styles.cardTitle}>Ripoti</h3>
                <p style={styles.cardText}>
                  Angalia performance yako ya usajili.
                </p>
                <strong>Angalia ripoti →</strong>
              </button>
            </div>
          </>
        )}

        {view === "registrations" && (
          <div style={styles.section}>
            <button
              type="button"
              style={styles.backButton}
              onClick={() => setView("home")}
            >
              ← Rudi
            </button>

            <div style={styles.sectionHeader}>
              <div>
                <h2 style={{ marginBottom: 5 }}>Usajili Wangu</h2>
                <p style={{ marginTop: 0, color: "#666" }}>
                  Washiriki waliounganishwa na akaunti yako.
                </p>
              </div>

              <button
                type="button"
                style={styles.primarySmallButton}
                onClick={openRegistrationForm}
              >
                + Sajili Mshiriki
              </button>
            </div>

            {registrationsLoading ? (
              <p>Inapakia...</p>
            ) : registrations.length === 0 ? (
              <div style={styles.emptyState}>
                <h3>Bado hakuna usajili</h3>
                <p>
                  Mshiriki utakayemsajili kupitia Agent Panel
                  ataonekana hapa.
                </p>
              </div>
            ) : (
              <div style={styles.registrationList}>
                {registrations.map((item) => (
                  <div key={item.id} style={styles.registrationRow}>
                    <div>
                      <strong style={styles.registrationName}>
                        {item.jina_kamili || "Mshiriki"}
                      </strong>

                      <div style={styles.registrationMeta}>
                        {item.jina_biashara || "Hakuna jina la biashara"}
                      </div>
                    </div>

                    <div style={styles.registrationDetails}>
                      <span>{item.namba_simu || "-"}</span>

                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "reports" && (
          <div style={styles.section}>
            <button
              type="button"
              style={styles.backButton}
              onClick={() => setView("home")}
            >
              ← Rudi
            </button>

            <h2>Ripoti Yangu</h2>

            {registrationsLoading ? (
              <p>Inapakia...</p>
            ) : (
              <div style={styles.reportGrid}>
                <div style={styles.reportCard}>
                  <small>Jumla ya Usajili</small>
                  <h1 style={styles.reportNumber}>
                    {registrations.length}
                  </h1>
                </div>

                <div style={styles.reportCard}>
                  <small>Usajili Leo</small>

                  <h1 style={styles.reportNumber}>
                    {
                      registrations.filter((item) => {
                        if (!item.created_at) return false;

                        const created = new Date(item.created_at);
                        const today = new Date();

                        return (
                          created.getFullYear() === today.getFullYear() &&
                          created.getMonth() === today.getMonth() &&
                          created.getDate() === today.getDate()
                        );
                      }).length
                    }
                  </h1>
                </div>

                <div style={styles.reportCard}>
                  <small>Agent</small>
                  <h3>{agent.full_name}</h3>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#071b10",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
  },

  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    padding: "36px",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0,0,0,.3)",
  },

  logo: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "#126b38",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    marginBottom: "20px",
    fontSize: "20px",
  },

  title: {
    marginBottom: "5px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "25px",
  },

  label: {
    display: "block",
    fontWeight: "600",
    marginBottom: "7px",
    marginTop: "15px",
  },

  input: {
    width: "100%",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
    fontSize: "15px",
  },

  button: {
    width: "100%",
    marginTop: "22px",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#126b38",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "15px",
  },

  error: {
    padding: "12px",
    background: "#ffecec",
    color: "#9c1c1c",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  dashboard: {
    minHeight: "100vh",
    background: "#f5f7f5",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "#0a371d",
    color: "#fff",
    padding: "20px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  logout: {
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.5)",
    padding: "9px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  content: {
    maxWidth: "1100px",
    margin: "auto",
    padding: "30px 20px",
  },

  welcome: {
    background: "#fff",
    padding: "25px",
    borderRadius: "16px",
    marginBottom: "25px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
    gap: "18px",
  },

  cardButton: {
    width: "100%",
    textAlign: "left",
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    border: "none",
    boxShadow: "0 4px 16px rgba(0,0,0,.06)",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  cardTitle: {
    marginTop: 0,
    fontSize: "20px",
  },

  cardText: {
    color: "#555",
    minHeight: "40px",
  },

  section: {
    background: "#fff",
    padding: "25px",
    borderRadius: "16px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "20px",
  },

  backButton: {
    border: "none",
    background: "#0a371d",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  primarySmallButton: {
    border: "none",
    background: "#126b38",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  emptyState: {
    background: "#f6f8f6",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    marginTop: "20px",
  },

  registrationList: {
    marginTop: "20px",
  },

  registrationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "16px 0",
    borderBottom: "1px solid #eee",
  },

  registrationName: {
    fontSize: "16px",
  },

  registrationMeta: {
    marginTop: "5px",
    color: "#666",
    fontSize: "14px",
  },

  registrationDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    textAlign: "right",
    color: "#555",
    fontSize: "14px",
  },

  reportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "18px",
    marginTop: "25px",
  },

  reportCard: {
    padding: "22px",
    borderRadius: "14px",
    background: "#f5f7f5",
  },

  reportNumber: {
    marginBottom: 0,
    fontSize: "40px",
  },
};
