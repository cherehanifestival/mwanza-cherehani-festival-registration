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
      setError("");
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

          <p style={styles.help}>
            Agent accounts are created by Festival Administration.
          </p>
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
        <div style={styles.welcome}>
          <p style={{ margin: 0 }}>Karibu</p>
          <h1 style={{ marginTop: 6 }}>
            {agent.full_name}
          </h1>
          <p>{agent.email}</p>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Usajili Wangu</h3>
            <p>Angalia washiriki uliojisajilia.</p>
          </div>

          <div style={styles.card}>
            <h3>Sajili Mshiriki</h3>
            <p>Ongeza mshiriki mpya wa festival.</p>
          </div>

          <div style={styles.card}>
            <h3>Ripoti</h3>
            <p>Angalia performance yako ya usajili.</p>
          </div>
        </div>
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
  },

  error: {
    padding: "12px",
    background: "#ffecec",
    color: "#9c1c1c",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  help: {
    marginTop: "20px",
    color: "#777",
    fontSize: "13px",
    textAlign: "center",
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

  card: {
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 4px 16px rgba(0,0,0,.06)",
  },
};
