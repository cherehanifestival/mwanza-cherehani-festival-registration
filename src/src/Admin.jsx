import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   SUPABASE
========================================================= */

const supabaseUrl =
  "https://ruxcevsfunszrveqhgjm.supabase.co";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

/* =========================================================
   ADMIN CONFIG
========================================================= */

const ADMIN_EMAIL =
  "cherehanifestival2026@gmail.com";

/* =========================================================
   REGISTRATION STATUSES
========================================================= */

const statuses = [
  ["mpya", "Mpya"],
  ["imepitiwa", "Imepitiwa"],
  ["amewasiliana", "Amewasiliana"],
  [
    "ametumiwa_malipo",
    "Ametumiwa Maelekezo ya Malipo",
  ],
  ["amelipa", "Amelipa"],
  ["amethibitishwa", "Amethibitishwa"],
  ["amekataliwa", "Amekataliwa"],
];

/* =========================================================
   EMPTY PACKAGE
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

function whatsappNumber(phone = "") {
  let number = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (number.startsWith("0")) {
    number = "255" + number.substring(1);
  }

  if (!number.startsWith("255")) {
    number = "255" + number;
  }

  return number;
}

function money(value) {
  return new Intl.NumberFormat("sw-TZ").format(
    Number(value || 0)
  );
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(
      "sw-TZ",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  } catch {
    return "—";
  }
}

function sameDay(
  dateValue,
  compareDate = new Date()
) {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  return (
    date.getFullYear() ===
      compareDate.getFullYear() &&
    date.getMonth() ===
      compareDate.getMonth() &&
    date.getDate() ===
      compareDate.getDate()
  );
}

function statusLabel(value) {
  return (
    statuses.find(
      ([status]) => status === value
    )?.[1] || "Mpya"
  );
}

/* =========================================================
   ADMIN COMPONENT
========================================================= */

export default function Admin() {
  /* =======================================================
     AUTH
  ======================================================= */

  const [session, setSession] =
    useState(null);

  const [email, setEmail] =
    useState(ADMIN_EMAIL);

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [loginLoading, setLoginLoading] =
    useState(false);

  /* =======================================================
     MFA
  ======================================================= */

  const [adminReady, setAdminReady] =
    useState(false);

  const [mfaStage, setMfaStage] =
    useState("none");

  const [mfaFactorId, setMfaFactorId] =
    useState("");

  const [mfaCode, setMfaCode] =
    useState("");

  const [mfaQrCode, setMfaQrCode] =
    useState("");

  const [mfaSecret, setMfaSecret] =
    useState("");

  const [mfaLoading, setMfaLoading] =
    useState(false);

  /* =======================================================
     DATA
  ======================================================= */

  const [registrations, setRegistrations] =
    useState([]);

  const [agents, setAgents] =
    useState([]);

  const [packages, setPackages] =
    useState([]);

  const [dataLoading, setDataLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const [tab, setTab] =
    useState("registrations");

  /* =======================================================
     SEARCH
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [agentSearch, setAgentSearch] =
    useState("");

  /* =======================================================
     MODALS
  ======================================================= */

  const [selectedRegistration, setSelectedRegistration] =
    useState(null);

  const [selectedAgent, setSelectedAgent] =
    useState(null);

  /* =======================================================
     PACKAGE FORM
  ======================================================= */

  const [packageForm, setPackageForm] =
    useState(emptyPackage);

  const [
    editingPackageId,
    setEditingPackageId,
  ] = useState(null);

  const [
    savingPackage,
    setSavingPackage,
  ] = useState(false);

  /* =======================================================
     INITIAL SESSION
  ======================================================= */

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);

        if (!newSession) {
          clearAdminSession();
        }
      }
    );

    return () =>
      subscription.unsubscribe();
  }, []);

  /* =======================================================
     LOAD ADMIN DATA ONLY AFTER AAL2
  ======================================================= */

  useEffect(() => {
    if (
      session?.user?.email ===
        ADMIN_EMAIL &&
      adminReady
    ) {
      loadEverything();
    }
  }, [session, adminReady]);

  /* =======================================================
     AUTH INITIALIZER
  ======================================================= */

  async function initializeAuth() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!currentSession) {
        setSession(null);
        setAdminReady(false);
        return;
      }

      if (
        currentSession.user?.email !==
        ADMIN_EMAIL
      ) {
        await supabase.auth.signOut();

        setSession(null);
        setAdminReady(false);

        return;
      }

      setSession(currentSession);

      await prepareMfa();
    } catch (authError) {
      console.error(
        "Admin session error:",
        authError
      );

      setError(
        "Imeshindikana kuhakiki session ya admin."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LOGIN
  ======================================================= */

  async function login(event) {
    event.preventDefault();

    setError("");
    setLoginLoading(true);
    setAdminReady(false);

    try {
      const {
        data,
        error: authError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: email
              .trim()
              .toLowerCase(),

            password,
          }
        );

      if (authError) {
        throw authError;
      }

      if (
        data.user?.email !==
        ADMIN_EMAIL
      ) {
        await supabase.auth.signOut();

        setError(
          "Huna ruhusa ya kutumia mfumo huu."
        );

        return;
      }

      setSession(data.session);

      await prepareMfa();
    } catch (loginError) {
      console.error(
        "Admin login error:",
        loginError
      );

      setError(
        "Barua pepe au nenosiri si sahihi."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  /* =========================================================
     MFA PREPARATION
  ========================================================= */

  async function prepareMfa() {
    setError("");
    setAdminReady(false);

    try {
      /*
       * Check current AAL.
       */
      const {
        data: aalData,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (aalError) {
        throw aalError;
      }

      /*
       * Already MFA authenticated.
       */
      if (
        aalData?.currentLevel ===
        "aal2"
      ) {
        setAdminReady(true);

        setMfaStage("none");
        setMfaCode("");

        return;
      }

      /*
       * Find existing MFA factors.
       */
      const {
        data: factorsData,
        error: factorsError,
      } =
        await supabase.auth.mfa
          .listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const totpFactors =
        factorsData?.totp || [];

      /*
       * Find verified authenticator.
       */
      const verifiedFactor =
        totpFactors.find(
          (factor) =>
            factor.status ===
            "verified"
        );

      /*
       * Existing MFA → ask for code.
       */
      if (verifiedFactor) {
        setMfaFactorId(
          verifiedFactor.id
        );

        setMfaStage("verify");

        setMfaQrCode("");
        setMfaSecret("");

        return;
      }

      /*
       * No verified factor → enrollment.
       */
      await createMfaEnrollment();
    } catch (mfaError) {
      console.error(
        "MFA preparation error:",
        mfaError
      );

      setError(
        "Imeshindikana kuanzisha usalama wa MFA."
      );
    }
  }

  /* =========================================================
     MFA ENROLLMENT
  ========================================================= */

  async function createMfaEnrollment() {
    setMfaLoading(true);
    setError("");

    try {
      const {
        data,
        error: enrollError,
      } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",

          friendlyName:
            "Cherehani Admin " +
            Date.now(),
        });

      if (enrollError) {
        throw enrollError;
      }

      setMfaFactorId(
        data.id
      );

      setMfaQrCode(
        data.totp?.qr_code || ""
      );

      setMfaSecret(
        data.totp?.secret || ""
      );

      setMfaStage("enroll");

      setMfaCode("");
    } catch (enrollError) {
      console.error(
        "MFA enrollment error:",
        enrollError
      );

      setError(
        "Imeshindikana kutengeneza MFA QR Code."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  /* =========================================================
     MFA VERIFY
  ========================================================= */

  async function verifyMfa(event) {
    event.preventDefault();

    setError("");

    const cleanCode =
      mfaCode
        .replace(/\D/g, "")
        .slice(0, 6);

    if (
      cleanCode.length !== 6
    ) {
      setError(
        "Weka namba zote 6 kutoka Authenticator app."
      );

      return;
    }

    if (!mfaFactorId) {
      setError(
        "MFA factor haijapatikana. Tafadhali ingia tena."
      );

      return;
    }

    setMfaLoading(true);

    try {
      const {
        error: verifyError,
      } =
        await supabase.auth.mfa
          .challengeAndVerify({
            factorId:
              mfaFactorId,

            code: cleanCode,
          });

      if (verifyError) {
        throw verifyError;
      }

      /*
       * Confirm upgraded session.
       */
      const {
        data: aalData,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (aalError) {
        throw aalError;
      }

      if (
        aalData?.currentLevel !==
        "aal2"
      ) {
        throw new Error(
          "Session did not reach AAL2."
        );
      }

      const {
        data: {
          session:
            refreshedSession,
        },
      } =
        await supabase.auth.getSession();

      setSession(
        refreshedSession
      );

      setAdminReady(true);

      setMfaStage("none");
      setMfaCode("");

      setError("");
    } catch (verifyError) {
      console.error(
        "MFA verification error:",
        verifyError
      );

      setError(
        "Msimbo wa MFA si sahihi au umeisha muda. Jaribu namba mpya."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  /* =========================================================
     NEW MFA QR
  ========================================================= */

  async function generateNewMfaQr() {
    setError("");
    setMfaLoading(true);

    try {
      /*
       * Remove current unverified enrollment
       * where possible.
       */
      if (mfaFactorId) {
        try {
          await supabase.auth.mfa
            .unenroll({
              factorId:
                mfaFactorId,
            });
        } catch (
          unenrollError
        ) {
          console.warn(
            "Could not remove old factor:",
            unenrollError
          );
        }
      }

      setMfaFactorId("");
      setMfaQrCode("");
      setMfaSecret("");
      setMfaCode("");

      await createMfaEnrollment();
    } catch (qrError) {
      console.error(
        "New MFA QR error:",
        qrError
      );

      setError(
        "Imeshindikana kutengeneza QR mpya."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (logoutError) {
      console.error(
        logoutError
      );
    }

    clearAdminSession();
  }

  function clearAdminSession() {
    setSession(null);
    setAdminReady(false);

    setMfaStage("none");
    setMfaCode("");
    setMfaFactorId("");
    setMfaQrCode("");
    setMfaSecret("");

    setRegistrations([]);
    setAgents([]);
    setPackages([]);

    setSelectedRegistration(
      null
    );

    setSelectedAgent(null);

    setPassword("");

    setTab("registrations");
  }

  /* =========================================================
     LOAD ALL
  ========================================================= */

  async function loadEverything() {
    setDataLoading(true);
    setError("");

    try {
      await Promise.all([
        loadRegistrations(),
        loadAgents(),
        loadPackages(),
      ]);
    } finally {
      setDataLoading(false);
    }
  }

  /* =========================================================
     REGISTRATIONS
  ========================================================= */

  async function loadRegistrations() {
    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("registrations")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (fetchError) {
      console.error(
        "Registrations error:",
        fetchError
      );

      setError(
        "Imeshindikana kupakia washiriki."
      );

      return;
    }

    setRegistrations(
      data || []
    );
  }

  /* =========================================================
     AGENTS
  ========================================================= */

  async function loadAgents() {
    const {
      data,
      error: agentsError,
    } =
      await supabase
        .from("agents")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (agentsError) {
      console.error(
        "Agents error:",
        agentsError
      );

      setError(
        "Imeshindikana kupakia agents."
      );

      return;
    }

    setAgents(
      data || []
    );
  }

  /* =========================================================
     PACKAGES
  ========================================================= */

  async function loadPackages() {
    const {
      data,
      error: packageError,
    } =
      await supabase
        .from("packages")
        .select("*")
        .order(
          "display_order",
          {
            ascending: true,
          }
        );

    if (packageError) {
      console.error(
        "Packages error:",
        packageError
      );

      setError(
        "Imeshindikana kupakia vifurushi."
      );

      return;
    }

    setPackages(
      data || []
    );
  }

  /* =========================================================
     AGENT HELPERS
  ========================================================= */

  function getAgent(agentId) {
    if (!agentId) {
      return null;
    }

    return (
      agents.find(
        (agent) =>
          agent.id === agentId
      ) || null
    );
  }

  function getAgentName(
    agentId
  ) {
    if (!agentId) {
      return "Public";
    }

    return (
      getAgent(agentId)
        ?.full_name ||
      "Agent"
    );
  }

  function getAgentRegistrations(
    agentId
  ) {
    return registrations.filter(
      (registration) =>
        registration.agent_id ===
        agentId
    );
  }

  /* =========================================================
     UPDATE REGISTRATION STATUS
  ========================================================= */

  async function updateStatus(
    registrationId,
    newStatus
  ) {
    const {
      error: updateError,
    } =
      await supabase
        .from("registrations")
        .update({
          hali_ya_usajili:
            newStatus,
        })
        .eq(
          "id",
          registrationId
        );

    if (updateError) {
      console.error(
        "Registration status error:",
        updateError
      );

      alert(
        "Imeshindikana kubadilisha hali ya usajili."
      );

      return;
    }

    setRegistrations(
      (current) =>
        current.map(
          (registration) =>
            registration.id ===
            registrationId
              ? {
                  ...registration,

                  hali_ya_usajili:
                    newStatus,
                }
              : registration
        )
    );

    setSelectedRegistration(
      (current) => {
        if (
          !current ||
          current.id !==
            registrationId
        ) {
          return current;
        }

        return {
          ...current,

          hali_ya_usajili:
            newStatus,
        };
      }
    );
  }

  /* =========================================================
     TOGGLE AGENT
  ========================================================= */

  async function toggleAgent(
    agent
  ) {
    const newValue =
      !agent.is_active;

    const {
      error: updateError,
    } =
      await supabase
        .from("agents")
        .update({
          is_active:
            newValue,
        })
        .eq(
          "id",
          agent.id
        );

    if (updateError) {
      console.error(
        "Agent update error:",
        updateError
      );

      alert(
        "Imeshindikana kubadilisha hali ya agent."
      );

      return;
    }

    setAgents(
      (current) =>
        current.map(
          (item) =>
            item.id === agent.id
              ? {
                  ...item,

                  is_active:
                    newValue,
                }
              : item
        )
    );

    if (
      selectedAgent?.id ===
      agent.id
    ) {
      setSelectedAgent(
        (current) => ({
          ...current,

          is_active:
            newValue,
        })
      );
    }
  }

  /* =========================================================
     PACKAGE EDIT
  ========================================================= */

  function editPackage(pkg) {
    setEditingPackageId(
      pkg.id
    );

    setPackageForm({
      name:
        pkg.name || "",

      category:
        pkg.category || "",

      tent_size:
        pkg.tent_size || "",

      price:
        pkg.price ?? "",

      vat_note:
        pkg.vat_note || "",

      description:
        pkg.description || "",

      included_items:
        pkg.included_items ||
        "",

      participant_limit:
        pkg.participant_limit ??
        "",

      display_order:
        pkg.display_order || 0,

      is_active:
        Boolean(pkg.is_active),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelPackageEdit() {
    setEditingPackageId(
      null
    );

    setPackageForm(
      emptyPackage
    );
  }

  async function savePackage(
    event
  ) {
    event.preventDefault();

    if (
      !packageForm.name.trim()
    ) {
      alert(
        "Weka jina la kifurushi."
      );

      return;
    }

    if (
      packageForm.price ===
        "" ||
      packageForm.price ===
        null ||
      packageForm.price ===
        undefined
    ) {
      alert(
        "Weka bei ya kifurushi."
      );

      return;
    }

    setSavingPackage(true);

    const payload = {
      name:
        packageForm.name.trim(),

      category:
        packageForm.category
          .trim() || null,

      tent_size:
        packageForm.tent_size
          .trim() || null,

      price:
        Number(
          packageForm.price
        ) || 0,

      vat_note:
        packageForm.vat_note
          .trim() || null,

      description:
        packageForm.description
          .trim() || null,

      included_items:
        packageForm
          .included_items
          .trim() || null,

      participant_limit:
        packageForm
          .participant_limit ===
        ""
          ? null
          : Number(
              packageForm
                .participant_limit
            ),

      display_order:
        Number(
          packageForm
            .display_order
        ) || 0,

      is_active:
        packageForm.is_active,

      updated_at:
        new Date().toISOString(),
    };

    try {
      let response;

      if (
        editingPackageId
      ) {
        response =
          await supabase
            .from("packages")
            .update(payload)
            .eq(
              "id",
              editingPackageId
            );
      } else {
        response =
          await supabase
            .from("packages")
            .insert([
              payload,
            ]);
      }

      if (response.error) {
        throw response.error;
      }

      cancelPackageEdit();

      await loadPackages();
    } catch (packageError) {
      console.error(
        "Package save error:",
        packageError
      );

      alert(
        "Imeshindikana kuhifadhi kifurushi."
      );
    } finally {
      setSavingPackage(false);
    }
  }

  async function togglePackage(
    pkg
  ) {
    const {
      error: updateError,
    } =
      await supabase
        .from("packages")
        .update({
          is_active:
            !pkg.is_active,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          pkg.id
        );

    if (updateError) {
      console.error(
        updateError
      );

      alert(
        "Imeshindikana kubadilisha kifurushi."
      );

      return;
    }

    await loadPackages();
  }

  /* =========================================================
     FILTER REGISTRATIONS
  ========================================================= */

  const filteredRegistrations =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return registrations;
      }

      return registrations.filter(
        (registration) => {
          const agentName =
            getAgentName(
              registration.agent_id
            );

          const fields = [
            registration.jina_kamili,
            registration.jina_biashara,
            registration.namba_simu,
            registration.barua_pepe,
            registration.mkoa,
            registration.package_name,
            registration.hali_ya_usajili,
            agentName,
          ];

          return fields.some(
            (field) =>
              String(field || "")
                .toLowerCase()
                .includes(query)
          );
        }
      );
    }, [
      registrations,
      agents,
      search,
    ]);

  /* =========================================================
     FILTER AGENTS
  ========================================================= */

  const filteredAgents =
    useMemo(() => {
      const query =
        agentSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return agents;
      }

      return agents.filter(
        (agent) =>
          [
            agent.full_name,
            agent.email,
            agent.phone,
          ].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(query)
          )
      );
    }, [
      agents,
      agentSearch,
    ]);

  /* =========================================================
     STATS
  ========================================================= */

  const newCount =
    registrations.filter(
      (registration) =>
        registration.hali_ya_usajili ===
        "mpya"
    ).length;

  const paidCount =
    registrations.filter(
      (registration) =>
        registration.hali_ya_usajili ===
        "amelipa"
    ).length;

  const confirmedCount =
    registrations.filter(
      (registration) =>
        registration.hali_ya_usajili ===
        "amethibitishwa"
    ).length;

  const todayCount =
    registrations.filter(
      (registration) =>
        sameDay(
          registration.created_at
        )
    ).length;

  const agentRegistrationCount =
    registrations.filter(
      (registration) =>
        Boolean(
          registration.agent_id
        )
    ).length;

  const publicRegistrationCount =
    registrations.filter(
      (registration) =>
        !registration.agent_id
    ).length;

  const activeAgentCount =
    agents.filter(
      (agent) =>
        agent.is_active
    ).length;

  const totalRegistrationValue =
    registrations.reduce(
      (
        total,
        registration
      ) =>
        total +
        Number(
          registration.package_price ||
            0
        ),
      0
    );

  const paidRegistrationValue =
    registrations
      .filter(
        (registration) =>
          registration.hali_ya_usajili ===
            "amelipa" ||
          registration.hali_ya_usajili ===
            "amethibitishwa"
      )
      .reduce(
        (
          total,
          registration
        ) =>
          total +
          Number(
            registration.package_price ||
              0
          ),
        0
      );

  /* =========================================================
     AGENT PERFORMANCE
  ========================================================= */

  const agentPerformance =
    useMemo(() => {
      return agents
        .map((agent) => {
          const list =
            registrations.filter(
              (registration) =>
                registration.agent_id ===
                agent.id
            );

          const today =
            list.filter(
              (registration) =>
                sameDay(
                  registration.created_at
                )
            ).length;

          const paid =
            list.filter(
              (registration) =>
                registration.hali_ya_usajili ===
                  "amelipa" ||
                registration.hali_ya_usajili ===
                  "amethibitishwa"
            ).length;

          return {
            ...agent,

            total:
              list.length,

            today,

            paid,
          };
        })
        .sort(
          (a, b) =>
            b.total - a.total
        );
    }, [
      agents,
      registrations,
    ]);

  /* =========================================================
     PACKAGE REPORT
  ========================================================= */

  const packageReport =
    useMemo(() => {
      const report = {};

      registrations.forEach(
        (registration) => {
          const name =
            registration.package_name ||
            "Haijatajwa";

          if (!report[name]) {
            report[name] = {
              name,
              count: 0,
              amount: 0,
            };
          }

          report[name].count +=
            1;

          report[name].amount +=
            Number(
              registration.package_price ||
                0
            );
        }
      );

      return Object.values(
        report
      ).sort(
        (a, b) =>
          b.count - a.count
      );
    }, [registrations]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <>
        <style>
          {adminStyles}
        </style>

        <div className="admin-loading">
          <div className="loader-dot" />

          <p>
            Inapakia mfumo...
          </p>
        </div>
      </>
    );
  }

  /* =========================================================
     LOGIN SCREEN
  ========================================================= */

  if (!session) {
    return (
      <>
        <style>
          {adminStyles}
        </style>

        <main className="auth-page">
          <section className="auth-card">
            <div className="security-badge">
              ADMIN
            </div>

            <h1>
              Mwanza Cherehani
              Festival 2026
            </h1>

            <h2>
              Mfumo wa Usimamizi
            </h2>

            <p className="auth-description">
              Ingia kwa akaunti ya
              administrator.
            </p>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <form
              onSubmit={login}
            >
              <label>
                Barua Pepe

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                Nenosiri

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  required
                />
              </label>

              <button
                className="primary-auth-button"
                type="submit"
                disabled={
                  loginLoading
                }
              >
                {loginLoading
                  ? "INAINGIA..."
                  : "INGIA"}
              </button>
            </form>

            <a
              className="back-link"
              href="/"
            >
              ← Rudi kwenye Fomu
            </a>
          </section>
        </main>
      </>
    );
  }

  /* =========================================================
     MFA SCREEN
  ========================================================= */

  if (!adminReady) {
    return (
      <>
        <style>
          {adminStyles}
        </style>

        <main className="auth-page">
          <section className="auth-card mfa-card">
            <div className="security-badge">
              MFA SECURITY
            </div>

            <h1>
              Admin Security
            </h1>

            {mfaStage ===
            "enroll" ? (
              <>
                <h2>
                  Weka Authenticator
                </h2>

                <p className="auth-description">
                  Scan QR code kwa
                  Google Authenticator,
                  Microsoft Authenticator,
                  1Password au
                  authenticator nyingine
                  inayotumia TOTP.
                </p>

                {mfaQrCode && (
                  <div className="qr-container">
                    <img
                      src={
                        mfaQrCode
                      }
                      alt="MFA QR Code"
                    />
                  </div>
                )}

                {mfaSecret && (
                  <div className="secret-box">
                    <span>
                      Manual setup key
                    </span>

                    <code>
                      {mfaSecret}
                    </code>
                  </div>
                )}

                <p className="security-note">
                  Baada ya ku-scan,
                  Authenticator app
                  itakupa namba 6.
                  Ingiza namba hiyo
                  hapa chini.
                </p>
              </>
            ) : (
              <>
                <h2>
                  MFA Verification
                </h2>

                <p className="auth-description">
                  Fungua Authenticator
                  app yako na uweke
                  namba 6 ya admin.
                </p>
              </>
            )}

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <form
              onSubmit={
                verifyMfa
              }
            >
              <label>
                MFA Code

                <input
                  className="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) =>
                    setMfaCode(
                      event.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          6
                        )
                    )
                  }
                  placeholder="123456"
                  required
                />
              </label>

              <button
                className="primary-auth-button"
                type="submit"
                disabled={
                  mfaLoading ||
                  mfaCode.length !== 6
                }
              >
                {mfaLoading
                  ? "INATHIBITISHA..."
                  : "THIBITISHA MFA"}
              </button>
            </form>

            {mfaStage ===
              "enroll" && (
              <button
                type="button"
                className="secondary-auth-button"
                onClick={
                  generateNewMfaQr
                }
                disabled={
                  mfaLoading
                }
              >
                Tengeneza QR Mpya
              </button>
            )}

            <button
              type="button"
              className="logout-auth-button"
              onClick={logout}
              disabled={
                mfaLoading
              }
            >
              Toka
            </button>
          </section>
        </main>
      </>
    );
  }

  /* =========================================================
     ADMIN DASHBOARD
  ========================================================= */

  return (
    <>
      <style>
        {adminStyles}
      </style>

      <main className="dashboard">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="admin-header">
          <div>
            <small>
              MWANZA CHEREHANI
              FESTIVAL 2026
            </small>

            <h1>
              Dashibodi ya
              Usimamizi
            </h1>

            <div className="secure-session">
              ● MFA Secured
            </div>
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
              type="button"
              onClick={
                loadEverything
              }
              disabled={
                dataLoading
              }
            >
              {dataLoading
                ? "Inapakia..."
                : "↻ Refresh"}
            </button>

            <button
              type="button"
              onClick={logout}
            >
              Toka
            </button>
          </div>
        </header>

        {error && (
          <div className="top-error">
            {error}
          </div>
        )}

        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="admin-tabs">
          <button
            className={
              tab ===
              "registrations"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab(
                "registrations"
              )
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
              tab ===
              "packages"
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

        {/* ===================================================
            REGISTRATIONS
        =================================================== */}

        {tab ===
          "registrations" && (
          <>
            <section className="stats">
              <StatCard
                label="Washiriki Wote"
                value={
                  registrations.length
                }
              />

              <StatCard
                label="Usajili Mpya"
                value={
                  newCount
                }
              />

              <StatCard
                label="Wamelipa"
                value={
                  paidCount
                }
              />

              <StatCard
                label="Wamethibitishwa"
                value={
                  confirmedCount
                }
              />
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Orodha ya
                    Washiriki
                  </h2>

                  <p>
                    Simamia usajili
                    wote wa festival.
                  </p>
                </div>

                <button
                  onClick={
                    loadRegistrations
                  }
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="toolbar">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tafuta jina, simu, biashara, kifurushi au agent..."
                />

                <span>
                  {
                    filteredRegistrations.length
                  }{" "}
                  washiriki
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Jina
                      </th>

                      <th>
                        Biashara
                      </th>

                      <th>
                        Simu
                      </th>

                      <th>
                        Agent
                      </th>

                      <th>
                        Kifurushi
                      </th>

                      <th>
                        Bei
                      </th>

                      <th>
                        Hali
                      </th>

                      <th>
                        Vitendo
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRegistrations.map(
                      (
                        registration
                      ) => (
                        <tr
                          key={
                            registration.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                registration.jina_kamili
                              }
                            </strong>

                            <small>
                              {formatDate(
                                registration.created_at
                              )}
                            </small>
                          </td>

                          <td>
                            {registration.jina_biashara ||
                              "—"}
                          </td>

                          <td>
                            {
                              registration.namba_simu
                            }
                          </td>

                          <td>
                            {registration.agent_id ? (
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => {
                                  const agent =
                                    getAgent(
                                      registration.agent_id
                                    );

                                  if (
                                    agent
                                  ) {
                                    setSelectedAgent(
                                      agent
                                    );
                                  }
                                }}
                              >
                                {getAgentName(
                                  registration.agent_id
                                )}
                              </button>
                            ) : (
                              <span className="public-badge">
                                Public
                              </span>
                            )}
                          </td>

                          <td>
                            {registration.package_name ||
                              "—"}
                          </td>

                          <td>
                            {registration.package_price
                              ? `TSh ${money(
                                  registration.package_price
                                )}`
                              : "—"}
                          </td>

                          <td>
                            <select
                              value={
                                registration.hali_ya_usajili ||
                                "mpya"
                              }
                              onChange={(
                                event
                              ) =>
                                updateStatus(
                                  registration.id,
                                  event
                                    .target
                                    .value
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
                                    {
                                      label
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td>
                            <div className="row-actions">
                              <button
                                onClick={() =>
                                  setSelectedRegistration(
                                    registration
                                  )
                                }
                              >
                                Angalia
                              </button>

                              <a
                                href={`https://wa.me/${whatsappNumber(
                                  registration.namba_simu
                                )}?text=${encodeURIComponent(
                                  `Habari ${
                                    registration.jina_kamili
                                  }, tunawasiliana nawe kutoka Mwanza Cherehani Festival 2026 kuhusu usajili wako${
                                    registration.package_name
                                      ? `. Umechagua kifurushi cha ${registration.package_name} chenye gharama ya TSh ${money(
                                          registration.package_price
                                        )}${
                                          registration.package_vat_note
                                            ? ` ${registration.package_vat_note}`
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
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRegistrations.length ===
                0 && (
                <EmptyState text="Hakuna usajili uliopatikana." />
              )}
            </section>
          </>
        )}

        {/* ===================================================
            AGENTS
        =================================================== */}

        {tab ===
          "agents" && (
          <>
            <section className="stats">
              <StatCard
                label="Agents Wote"
                value={
                  agents.length
                }
              />

              <StatCard
                label="Active Agents"
                value={
                  activeAgentCount
                }
              />

              <StatCard
                label="Usajili wa Agents"
                value={
                  agentRegistrationCount
                }
              />

              <StatCard
                label="Usajili Leo"
                value={
                  todayCount
                }
              />
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Agents
                  </h2>

                  <p>
                    Simamia agents
                    na performance
                    zao.
                  </p>
                </div>

                <button
                  onClick={
                    loadAgents
                  }
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="agent-information">
                <strong>
                  Agent Accounts
                </strong>

                <p>
                  Agent anaweza
                  kufikia taarifa
                  zake pekee kupitia
                  /agent.
                </p>
              </div>

              <div className="toolbar">
                <input
                  type="search"
                  value={
                    agentSearch
                  }
                  onChange={(event) =>
                    setAgentSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tafuta agent kwa jina, simu au email..."
                />

                <span>
                  {
                    filteredAgents.length
                  }{" "}
                  agents
                </span>
              </div>

              <div className="agent-grid">
                {filteredAgents.map(
                  (agent) => {
                    const agentRegistrations =
                      getAgentRegistrations(
                        agent.id
                      );

                    const today =
                      agentRegistrations.filter(
                        (
                          registration
                        ) =>
                          sameDay(
                            registration.created_at
                          )
                      ).length;

                    return (
                      <article
                        className="agent-card"
                        key={
                          agent.id
                        }
                      >
                        <div className="agent-card-header">
                          <div>
                            <span
                              className={
                                agent.is_active
                                  ? "badge-active"
                                  : "badge-inactive"
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

                          <strong className="agent-count">
                            {
                              agentRegistrations.length
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

                        <div className="agent-stats">
                          <div>
                            <span>
                              Jumla
                            </span>

                            <strong>
                              {
                                agentRegistrations.length
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Leo
                            </span>

                            <strong>
                              {
                                today
                              }
                            </strong>
                          </div>
                        </div>

                        <div className="card-actions">
                          <button
                            className="primary-small"
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
                                ? "danger-small"
                                : "success-small"
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
                      </article>
                    );
                  }
                )}
              </div>

              {filteredAgents.length ===
                0 && (
                <EmptyState text="Hakuna agent aliyepatikana." />
              )}
            </section>
          </>
        )}

        {/* ===================================================
            PACKAGES
        =================================================== */}

        {tab ===
          "packages" && (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    {editingPackageId
                      ? "Hariri Kifurushi"
                      : "Ongeza Kifurushi"}
                  </h2>

                  <p>
                    Simamia bei na
                    vifurushi vya
                    ushiriki.
                  </p>
                </div>
              </div>

              <form
                className="package-form"
                onSubmit={
                  savePackage
                }
              >
                <label>
                  Jina la Kifurushi
                  *

                  <input
                    value={
                      packageForm.name
                    }
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          name:
                            event
                              .target
                              .value,
                        }
                      )
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
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          category:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  />
                </label>

                <label>
                  Ukubwa wa
                  Tenti / Eneo

                  <input
                    value={
                      packageForm.tent_size
                    }
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          tent_size:
                            event
                              .target
                              .value,
                        }
                      )
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
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          price:
                            event
                              .target
                              .value,
                        }
                      )
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
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          vat_note:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="+ VAT"
                  />
                </label>

                <label>
                  Idadi ya
                  Washiriki

                  <input
                    type="number"
                    min="1"
                    value={
                      packageForm.participant_limit
                    }
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          participant_limit:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  />
                </label>

                <label className="package-wide">
                  Maelezo ya
                  Kifurushi

                  <textarea
                    rows="4"
                    value={
                      packageForm.description
                    }
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          description:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  />
                </label>

                <label className="package-wide">
                  Vitu
                  Vilivyojumuishwa

                  <textarea
                    rows="4"
                    value={
                      packageForm.included_items
                    }
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          included_items:
                            event
                              .target
                              .value,
                        }
                      )
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
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          display_order:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  />
                </label>

                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={
                      packageForm.is_active
                    }
                    onChange={(event) =>
                      setPackageForm(
                        {
                          ...packageForm,

                          is_active:
                            event
                              .target
                              .checked,
                        }
                      )
                    }
                  />

                  Kifurushi
                  kinaonekana kwa
                  waombaji
                </label>

                <div className="package-buttons package-wide">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={
                      savingPackage
                    }
                  >
                    {savingPackage
                      ? "INAHIFADHI..."
                      : editingPackageId
                      ? "HIFADHI MABADILIKO"
                      : "ONGEZA KIFURUSHI"}
                  </button>

                  {editingPackageId && (
                    <button
                      className="secondary-button"
                      type="button"
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

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Vifurushi vya
                    Ushiriki
                  </h2>

                  <p>
                    Vifurushi
                    vinavyopatikana
                    kwenye fomu.
                  </p>
                </div>

                <button
                  onClick={
                    loadPackages
                  }
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="package-grid">
                {packages.map(
                  (pkg) => (
                    <article
                      key={
                        pkg.id
                      }
                      className={`package-card ${
                        !pkg.is_active
                          ? "package-disabled"
                          : ""
                      }`}
                    >
                      <span
                        className={
                          pkg.is_active
                            ? "badge-active"
                            : "badge-inactive"
                        }
                      >
                        {pkg.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>

                      <h3>
                        {
                          pkg.name
                        }
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

                      <div className="card-actions">
                        <button
                          className="primary-small"
                          onClick={() =>
                            editPackage(
                              pkg
                            )
                          }
                        >
                          Hariri
                        </button>

                        <button
                          className={
                            pkg.is_active
                              ? "danger-small"
                              : "success-small"
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
                    </article>
                  )
                )}
              </div>
            </section>
          </>
        )}

        {/* ===================================================
            REPORTS
        =================================================== */}

        {tab ===
          "reports" && (
          <>
            <section className="stats">
              <StatCard
                label="Washiriki Wote"
                value={
                  registrations.length
                }
              />

              <StatCard
                label="Usajili Leo"
                value={
                  todayCount
                }
              />

              <StatCard
                label="Kupitia Agents"
                value={
                  agentRegistrationCount
                }
              />

              <StatCard
                label="Public"
                value={
                  publicRegistrationCount
                }
              />
            </section>

            <section className="money-stats">
              <div>
                <span>
                  Thamani ya
                  Usajili
                </span>

                <strong>
                  TSh{" "}
                  {money(
                    totalRegistrationValue
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
                    paidRegistrationValue
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Agents Active
                </span>

                <strong>
                  {
                    activeAgentCount
                  }
                </strong>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Performance ya
                    Agents
                  </h2>

                  <p>
                    Linganisha
                    usajili wa kila
                    agent.
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Agent
                      </th>

                      <th>
                        Simu
                      </th>

                      <th>
                        Jumla
                      </th>

                      <th>
                        Leo
                      </th>

                      <th>
                        Wamelipa
                      </th>

                      <th>
                        Hali
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {agentPerformance.map(
                      (agent) => (
                        <tr
                          key={
                            agent.id
                          }
                        >
                          <td>
                            <button
                              className="link-button"
                              onClick={() =>
                                setSelectedAgent(
                                  agent
                                )
                              }
                            >
                              {
                                agent.full_name
                              }
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
                              {
                                agent.total
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              agent.today
                            }
                          </td>

                          <td>
                            {
                              agent.paid
                            }
                          </td>

                          <td>
                            <span
                              className={
                                agent.is_active
                                  ? "badge-active"
                                  : "badge-inactive"
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

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Ripoti kwa
                    Vifurushi
                  </h2>

                  <p>
                    Idadi na thamani
                    ya usajili kwa
                    kila kifurushi.
                  </p>
                </div>
              </div>

              <div className="report-grid">
                {packageReport.map(
                  (item) => (
                    <article
                      className="report-card"
                      key={
                        item.name
                      }
                    >
                      <span>
                        {
                          item.name
                        }
                      </span>

                      <strong>
                        {
                          item.count
                        }
                      </strong>

                      <small>
                        TSh{" "}
                        {money(
                          item.amount
                        )}
                      </small>
                    </article>
                  )
                )}
              </div>
            </section>
          </>
        )}

        {/* ===================================================
            REGISTRATION MODAL
        =================================================== */}

        {selectedRegistration && (
          <Modal
            onClose={() =>
              setSelectedRegistration(
                null
              )
            }
          >
            <h2>
              {
                selectedRegistration.jina_kamili
              }
            </h2>

            <p>
              {selectedRegistration.jina_biashara ||
                "Hakuna jina la biashara"}
            </p>

            <div className="detail-grid">
              <Info
                label="Simu"
                value={
                  selectedRegistration.namba_simu
                }
              />

              <Info
                label="Email"
                value={
                  selectedRegistration.barua_pepe ||
                  "—"
                }
              />

              <Info
                label="Mkoa"
                value={
                  selectedRegistration.mkoa ||
                  "—"
                }
              />

              <Info
                label="Mji/Wilaya"
                value={
                  selectedRegistration.mji_wilaya ||
                  "—"
                }
              />

              <Info
                label="Agent"
                value={getAgentName(
                  selectedRegistration.agent_id
                )}
              />

              <Info
                label="Kifurushi"
                value={
                  selectedRegistration.package_name ||
                  "—"
                }
              />

              <Info
                label="Bei"
                value={
                  selectedRegistration.package_price
                    ? `TSh ${money(
                        selectedRegistration.package_price
                      )}`
                    : "—"
                }
              />

              <Info
                label="VAT"
                value={
                  selectedRegistration.package_vat_note ||
                  "—"
                }
              />

              <Info
                label="Ukubwa"
                value={
                  selectedRegistration.package_tent_size ||
                  "—"
                }
              />

              <Info
                label="Hali"
                value={statusLabel(
                  selectedRegistration.hali_ya_usajili
                )}
              />

              <Info
                label="Tarehe"
                value={formatDate(
                  selectedRegistration.created_at
                )}
              />
            </div>

            <section className="modal-section">
              <h3>
                Aina ya Ushiriki
              </h3>

              <p>
                {(selectedRegistration.aina_ushiriki ||
                  []).join(
                  ", "
                ) || "—"}
              </p>
            </section>

            <section className="modal-section">
              <h3>
                Bidhaa /
                Huduma
              </h3>

              <p>
                {selectedRegistration.maelezo_bidhaa_huduma ||
                  "—"}
              </p>
            </section>

            <div className="modal-actions">
              <a
                href={`https://wa.me/${whatsappNumber(
                  selectedRegistration.namba_simu
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>

              {selectedRegistration.barua_pepe && (
                <a
                  href={`mailto:${selectedRegistration.barua_pepe}`}
                >
                  Email
                </a>
              )}

              <a
                href={`tel:${selectedRegistration.namba_simu}`}
              >
                Piga Simu
              </a>
            </div>
          </Modal>
        )}

        {/* ===================================================
            AGENT MODAL
        =================================================== */}

        {selectedAgent && (
          <Modal
            onClose={() =>
              setSelectedAgent(
                null
              )
            }
          >
            <span
              className={
                selectedAgent.is_active
                  ? "badge-active"
                  : "badge-inactive"
              }
            >
              {selectedAgent.is_active
                ? "ACTIVE"
                : "INACTIVE"}
            </span>

            <h2>
              {
                selectedAgent.full_name
              }
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
                  ).filter(
                    (
                      registration
                    ) =>
                      sameDay(
                        registration.created_at
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

            <section className="modal-section">
              <h3>
                Washiriki wa
                Agent
              </h3>

              <div className="agent-registration-list">
                {getAgentRegistrations(
                  selectedAgent.id
                ).length ===
                0 ? (
                  <p>
                    Agent huyu
                    bado hana
                    usajili.
                  </p>
                ) : (
                  getAgentRegistrations(
                    selectedAgent.id
                  ).map(
                    (
                      registration
                    ) => (
                      <button
                        key={
                          registration.id
                        }
                        onClick={() => {
                          setSelectedAgent(
                            null
                          );

                          setSelectedRegistration(
                            registration
                          );
                        }}
                      >
                        <div>
                          <strong>
                            {
                              registration.jina_kamili
                            }
                          </strong>

                          <small>
                            {registration.jina_biashara ||
                              "—"}
                          </small>
                        </div>

                        <span>
                          {formatDate(
                            registration.created_at
                          )}
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            </section>

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
                    ? "danger-small"
                    : "success-small"
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
          </Modal>
        )}
      </main>
    </>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
}) {
  return (
    <article className="stat-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </article>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({
  label,
  value,
}) {
  return (
    <div className="info-box">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  text,
}) {
  return (
    <div className="empty-state">
      {text}
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  children,
  onClose,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const adminStyles = `
:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f3f5f4;
  color: #17201b;
  font-family:
    Inter,
    Arial,
    Helvetica,
    sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: .6;
}

/* =========================================================
   AUTH
========================================================= */

.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(
      circle at top right,
      rgba(250,204,21,.16),
      transparent 25%
    ),
    linear-gradient(
      145deg,
      #061b10,
      #0d4325 60%,
      #166534
    );
}

.auth-card {
  width: min(
    460px,
    100%
  );
  background: #ffffff;
  border-radius: 22px;
  padding: 34px;
  box-shadow:
    0 30px 90px
    rgba(0,0,0,.30);
}

.mfa-card {
  width: min(
    520px,
    100%
  );
}

.security-badge {
  display: inline-flex;
  align-items: center;
  background: #facc15;
  color: #17201b;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .06em;
}

.auth-card h1 {
  margin: 18px 0 5px;
  color: #14532d;
}

.auth-card h2 {
  margin: 8px 0;
  font-size: 19px;
}

.auth-description {
  margin:
    8px 0 24px;
  color: #6b7280;
  line-height: 1.55;
}

.auth-card label {
  display: block;
  margin: 16px 0;
  font-weight: 800;
}

.auth-card input {
  display: block;
  width: 100%;
  margin-top: 8px;
  border:
    1px solid
    #d1d5db;
  border-radius: 11px;
  padding: 14px;
  background: white;
}

.auth-card input:focus {
  outline: none;
  border-color: #166534;
  box-shadow:
    0 0 0 3px
    rgba(22,101,52,.12);
}

.primary-auth-button {
  width: 100%;
  border: 0;
  border-radius: 11px;
  background: #166534;
  color: white;
  padding: 15px;
  font-weight: 900;
  margin-top: 6px;
}

.secondary-auth-button {
  width: 100%;
  border:
    1px solid
    #166534;
  border-radius: 11px;
  background: white;
  color: #166534;
  padding: 13px;
  font-weight: 800;
  margin-top: 12px;
}

.logout-auth-button {
  width: 100%;
  border: 0;
  border-radius: 11px;
  background: #f3f4f6;
  color: #374151;
  padding: 13px;
  font-weight: 800;
  margin-top: 10px;
}

.back-link {
  display: block;
  margin-top: 20px;
  text-align: center;
  color: #166534;
  text-decoration: none;
  font-weight: 700;
}

.error-box,
.top-error {
  background: #fef2f2;
  border:
    1px solid
    #fecaca;
  color: #991b1b;
  padding: 12px 14px;
  border-radius: 10px;
  line-height: 1.45;
}

.error-box {
  margin: 16px 0;
}

/* =========================================================
   MFA
========================================================= */

.qr-container {
  display: grid;
  place-items: center;
  padding: 20px;
  background: #f9fafb;
  border:
    1px solid
    #e5e7eb;
  border-radius: 16px;
  margin: 18px 0;
}

.qr-container img {
  display: block;
  width: min(
    260px,
    100%
  );
  height: auto;
}

.secret-box {
  padding: 14px;
  border-radius: 11px;
  background: #f9fafb;
  border:
    1px solid
    #e5e7eb;
  margin: 14px 0;
}

.secret-box span {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 7px;
}

.secret-box code {
  display: block;
  overflow-wrap: anywhere;
  color: #14532d;
  font-weight: 800;
}

.security-note {
  background: #f0fdf4;
  border:
    1px solid
    #bbf7d0;
  color: #166534;
  padding: 13px;
  border-radius: 10px;
  line-height: 1.5;
}

.mfa-code {
  text-align: center;
  font-size: 24px !important;
  font-weight: 900;
  letter-spacing: .30em;
}

/* =========================================================
   LOADING
========================================================= */

.admin-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  align-content: center;
  background: #f3f5f4;
  color: #14532d;
  font-weight: 800;
}

.loader-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border:
    3px solid
    #d1fae5;
  border-top-color:
    #166534;
  animation:
    adminSpin
    .8s linear infinite;
}

@keyframes adminSpin {
  to {
    transform:
      rotate(360deg);
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

.dashboard {
  min-height: 100vh;
}

.admin-header {
  background:
    linear-gradient(
      135deg,
      #0b3a20,
      #14532d
    );
  color: white;
  padding:
    24px
    max(20px,5vw);
  display: flex;
  justify-content:
    space-between;
  align-items: center;
  gap: 20px;
}

.admin-header h1 {
  margin:
    5px 0 0;
}

.admin-header small {
  opacity: .8;
}

.secure-session {
  display: inline-flex;
  margin-top: 10px;
  padding: 5px 9px;
  background:
    rgba(255,255,255,.12);
  border:
    1px solid
    rgba(255,255,255,.18);
  border-radius: 999px;
  font-size: 11px;
  color: #bbf7d0;
}

.header-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.header-actions a,
.header-actions button {
  border:
    1px solid
    rgba(255,255,255,.28);
  background:
    rgba(255,255,255,.10);
  color: white;
  border-radius: 9px;
  text-decoration: none;
  padding: 10px 14px;
}

.top-error {
  margin:
    20px
    max(20px,5vw)
    0;
}

/* =========================================================
   TABS
========================================================= */

.admin-tabs {
  display: flex;
  gap: 9px;
  padding:
    20px
    max(20px,5vw)
    0;
  overflow-x: auto;
}

.admin-tabs button {
  border: 0;
  border-radius: 10px;
  background: #e5e7eb;
  color: #374151;
  padding: 12px 20px;
  font-weight: 900;
  white-space: nowrap;
}

.admin-tabs button.active {
  background: #166534;
  color: white;
}

/* =========================================================
   STATS
========================================================= */

.stats {
  display: grid;
  grid-template-columns:
    repeat(4,1fr);
  gap: 15px;
  padding:
    25px
    max(20px,5vw);
}

.stat-card {
  background: white;
  border-radius: 15px;
  padding: 20px;
  border:
    1px solid
    #ecefec;
  box-shadow:
    0 3px 12px
    rgba(0,0,0,.03);
}

.stat-card span {
  color: #6b7280;
}

.stat-card strong {
  display: block;
  color: #14532d;
  font-size: 31px;
  margin-top: 8px;
}

/* =========================================================
   PANEL
========================================================= */

.panel {
  margin:
    25px
    max(20px,5vw);
  padding: 23px;
  background: white;
  border-radius: 17px;
  border:
    1px solid
    #ecefec;
}

.panel-header {
  display: flex;
  justify-content:
    space-between;
  align-items: center;
  gap: 16px;
}

.panel-header h2 {
  margin:
    0 0 5px;
}

.panel-header p {
  margin: 0;
  color: #6b7280;
}

.panel-header > button {
  border:
    1px solid
    #d1d5db;
  background: white;
  padding: 9px 13px;
  border-radius: 8px;
}

/* =========================================================
   TOOLBAR
========================================================= */

.toolbar {
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap: 15px;
  margin: 22px 0;
}

.toolbar input {
  width:
    min(520px,100%);
  border:
    1px solid
    #d1d5db;
  border-radius: 10px;
  padding: 12px 14px;
}

.toolbar span {
  color: #6b7280;
  white-space: nowrap;
}

/* =========================================================
   TABLE
========================================================= */

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1080px;
  border-collapse:
    collapse;
}

th,
td {
  text-align: left;
  vertical-align: middle;
  padding: 14px 10px;
  border-bottom:
    1px solid
    #e5e7eb;
}

th {
  color: #374151;
  font-size: 13px;
}

td small {
  display: block;
  margin-top: 4px;
  color: #6b7280;
}

td select {
  min-width: 190px;
  width: 100%;
  border:
    1px solid
    #d1d5db;
  border-radius: 9px;
  background: white;
  padding: 9px;
}

.row-actions {
  display: flex;
  gap: 7px;
}

.row-actions button,
.row-actions a {
  border: 0;
  border-radius: 7px;
  background: #166534;
  color: white;
  text-decoration: none;
  padding: 8px 10px;
}

/* =========================================================
   LINKS / BADGES
========================================================= */

.link-button {
  border: 0;
  background: transparent;
  color: #166534;
  padding: 0;
  font-weight: 900;
}

.public-badge {
  display: inline-flex;
  background: #e5e7eb;
  color: #374151;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.badge-active,
.badge-inactive {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.badge-active {
  background: #dcfce7;
  color: #166534;
}

.badge-inactive {
  background: #fee2e2;
  color: #991b1b;
}

/* =========================================================
   AGENT
========================================================= */

.agent-information {
  margin: 18px 0;
  padding: 14px;
  background: #f0fdf4;
  border:
    1px solid
    #bbf7d0;
  border-radius: 11px;
}

.agent-information p {
  margin:
    5px 0 0;
  color: #166534;
}

.agent-grid {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 16px;
}

.agent-card,
.package-card {
  padding: 20px;
  border:
    1px solid
    #e5e7eb;
  border-radius: 14px;
}

.agent-card-header {
  display: flex;
  justify-content:
    space-between;
  gap: 15px;
}

.agent-card h3 {
  margin:
    10px 0 4px;
}

.agent-card p {
  color: #6b7280;
  overflow-wrap: anywhere;
}

.agent-count {
  color: #14532d;
  font-size: 32px;
}

.agent-stats {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 10px;
  margin: 18px 0;
}

.agent-stats div {
  background: #f9fafb;
  border-radius: 10px;
  padding: 12px;
}

.agent-stats span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.agent-stats strong {
  display: block;
  color: #14532d;
  font-size: 22px;
  margin-top: 3px;
}

/* =========================================================
   BUTTONS
========================================================= */

.card-actions,
.package-buttons,
.modal-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.primary-small,
.danger-small,
.success-small,
.primary-button,
.secondary-button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  font-weight: 800;
}

.primary-small,
.primary-button {
  background: #166534;
  color: white;
}

.danger-small {
  background: #fee2e2;
  color: #991b1b;
}

.success-small {
  background: #dcfce7;
  color: #166534;
}

.secondary-button {
  background: #f3f4f6;
  color: #374151;
}

/* =========================================================
   PACKAGE FORM
========================================================= */

.package-form {
  display: grid;
  grid-template-columns:
    repeat(2,1fr);
  gap: 16px;
  margin-top: 20px;
}

.package-form label {
  font-weight: 800;
}

.package-form input,
.package-form textarea {
  display: block;
  width: 100%;
  margin-top: 7px;
  border:
    1px solid
    #d1d5db;
  border-radius: 9px;
  padding: 12px;
}

.package-wide {
  grid-column:
    1 / -1;
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: 9px;
}

.checkbox-line input {
  display: inline-block;
  width: auto;
  margin: 0;
}

/* =========================================================
   PACKAGE GRID
========================================================= */

.package-grid {
  display: grid;
  grid-template-columns:
    repeat(2,1fr);
  gap: 16px;
  margin-top: 20px;
}

.package-disabled {
  opacity: .58;
}

.package-price {
  display: block;
  margin: 8px 0;
  color: #14532d;
  font-size: 22px;
}

/* =========================================================
   REPORTS
========================================================= */

.money-stats {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 15px;
  margin:
    0
    max(20px,5vw)
    25px;
}

.money-stats > div {
  padding: 22px;
  border-radius: 14px;
  background: #14532d;
  color: white;
}

.money-stats span {
  display: block;
  opacity: .80;
}

.money-stats strong {
  display: block;
  margin-top: 9px;
  font-size: 25px;
}

.report-grid {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 15px;
}

.report-card {
  padding: 18px;
  border:
    1px solid
    #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

.report-card span {
  display: block;
  color: #6b7280;
}

.report-card strong {
  display: block;
  margin: 8px 0;
  color: #14532d;
  font-size: 32px;
}

.report-card small {
  color: #6b7280;
}

/* =========================================================
   MODAL
========================================================= */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    rgba(0,0,0,.58);
}

.modal {
  position: relative;
  width:
    min(780px,100%);
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 18px;
  padding: 28px;
  box-shadow:
    0 30px 100px
    rgba(0,0,0,.28);
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 16px;
  border: 0;
  background: transparent;
  font-size: 32px;
}

.detail-grid {
  display: grid;
  grid-template-columns:
    repeat(2,1fr);
  gap: 12px;
  margin-top: 20px;
}

.info-box {
  padding: 13px;
  border-radius: 9px;
  background: #f9fafb;
  overflow: hidden;
}

.info-box span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.info-box strong {
  display: block;
  margin-top: 5px;
  overflow-wrap: anywhere;
}

.modal-section {
  margin-top: 22px;
}

.modal-section h3 {
  margin-bottom: 6px;
}

.modal-actions {
  margin-top: 24px;
}

.modal-actions a,
.modal-actions button {
  border: 0;
  border-radius: 8px;
  background: #166534;
  color: white;
  text-decoration: none;
  padding: 10px 14px;
}

/* =========================================================
   AGENT REGISTRATION LIST
========================================================= */

.agent-registration-list {
  display: grid;
  gap: 8px;
}

.agent-registration-list button {
  width: 100%;
  border:
    1px solid
    #e5e7eb;
  border-radius: 9px;
  background: #f9fafb;
  padding: 12px;
  display: flex;
  justify-content:
    space-between;
  align-items: center;
  gap: 15px;
  text-align: left;
}

.agent-registration-list small {
  display: block;
  color: #6b7280;
  margin-top: 4px;
}

/* =========================================================
   EMPTY
========================================================= */

.empty-state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (
  max-width: 1000px
) {
  .agent-grid,
  .report-grid {
    grid-template-columns:
      repeat(2,1fr);
  }
}

@media (
  max-width: 800px
) {
  .admin-header {
    flex-direction:
      column;
    align-items:
      flex-start;
  }

  .stats,
  .money-stats,
  .package-form,
  .package-grid {
    grid-template-columns:
      repeat(2,1fr);
  }

  .header-actions {
    width: 100%;
  }
}

@media (
  max-width: 600px
) {
  .auth-page {
    padding: 15px;
  }

  .auth-card {
    padding: 24px;
  }

  .stats,
  .money-stats,
  .agent-grid,
  .package-form,
  .package-grid,
  .report-grid,
  .detail-grid {
    grid-template-columns:
      1fr;
  }

  .package-wide {
    grid-column: auto;
  }

  .toolbar {
    flex-direction:
      column;
    align-items:
      stretch;
  }

  .toolbar span {
    white-space:
      normal;
  }

  .panel-header {
    align-items:
      flex-start;
  }

  .header-actions a,
  .header-actions button {
    flex: 1;
    text-align: center;
  }

  .row-actions {
    flex-direction:
      column;
  }
}
`;
