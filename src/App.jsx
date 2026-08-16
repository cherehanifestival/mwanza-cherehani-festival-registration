import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://ruxcevsfunszrveqhgjm.supabase.co";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY;

const ainaZaUshiriki = [
  "Ushonaji wa mavazi",
  "Ubunifu wa mitindo ya mavazi",
  "Ubunifu wa mitindo ya mavazi na shughuli",
  "Ubunifu wa utengenezaji wa sofa",
  "Ubunifu wa utengenezaji wa viatu",
  "Ubunifu wa mikoba, mikanda n.k",
  "Ubunifu wa matenti",
  "Ubunifu wa kava aina zote",
  "Ubunifu wa Neti/Mapazia",
  "Chuo cha kufundisha ubunifu wa mitindo",
  "Viwanda vya kutengeneza cherehani",
  "Wauzaji wa vifaa vya ushonaji",
  "Biashara ndogondogo",
  "Vyakula na vinywaji",
  "Mapambo",
  "Nyingine",
];

const initialForm = {
  jina_kamili: "",
  jina_biashara: "",
  namba_simu: "",
  barua_pepe: "",
  mkoa: "",
  mji_wilaya: "",
  anwani: "",
  mahali_biashara_ilipo: "",

  aina_ushiriki: [],
  aina_ushiriki_nyingine: "",

  maelezo_bidhaa_huduma: "",

  idadi_meza: 0,
  idadi_viti: 0,

  umeme: false,
  tenti: false,
  maji: false,

  mahitaji_mengine: "",
  muda_ushiriki: "",

  amekubali_tamko: false,

  package_id: "",
};

function money(value) {
  return new Intl.NumberFormat(
    "sw-TZ"
  ).format(
    Number(value || 0)
  );
}

export default function App() {
  const [
    form,
    setForm,
  ] = useState(
    initialForm
  );

  const [
    packages,
    setPackages,
  ] = useState([]);

  const [
    packagesLoading,
    setPackagesLoading,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    agentId,
    setAgentId,
  ] = useState(null);

  const [
    submissionResult,
    setSubmissionResult,
  ] = useState(null);

  /* =========================================================
     TURNSTILE
  ========================================================= */

  const [
    turnstileToken,
    setTurnstileToken,
  ] = useState("");

  const turnstileRef =
    useRef(null);

  const turnstileWidgetId =
    useRef(null);

  useEffect(() => {
    loadPackages();
    detectAgent();
  }, []);

  /* =========================================================
     TURNSTILE SCRIPT + WIDGET
  ========================================================= */

  useEffect(() => {
    if (success) {
      return;
    }

    if (
      !TURNSTILE_SITE_KEY
    ) {
      console.error(
        "VITE_TURNSTILE_SITE_KEY is missing."
      );

      setError(
        "Mfumo wa uthibitisho wa usalama haujapatikana."
      );

      return;
    }

    let cancelled = false;

    function renderTurnstile() {
      if (
        cancelled ||
        !window.turnstile ||
        !turnstileRef.current
      ) {
        return;
      }

      if (
        turnstileWidgetId.current !==
        null
      ) {
        return;
      }

      try {
        const widgetId =
          window.turnstile.render(
            turnstileRef.current,
            {
              sitekey:
                TURNSTILE_SITE_KEY,

              theme:
                "light",

              callback:
                (token) => {
                  setTurnstileToken(
                    token
                  );

                  setError("");
                },

              "expired-callback":
                () => {
                  setTurnstileToken(
                    ""
                  );
                },

              "timeout-callback":
                () => {
                  setTurnstileToken(
                    ""
                  );
                },

              "error-callback":
                () => {
                  setTurnstileToken(
                    ""
                  );

                  setError(
                    "Uthibitisho wa usalama umeshindikana. Jaribu tena."
                  );
                },
            }
          );

        turnstileWidgetId.current =
          widgetId;
      } catch (turnstileError) {
        console.error(
          "Turnstile render error:",
          turnstileError
        );
      }
    }

    const existingScript =
      document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );

    if (
      window.turnstile
    ) {
      renderTurnstile();
    } else if (
      existingScript
    ) {
      existingScript.addEventListener(
        "load",
        renderTurnstile
      );
    } else {
      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

      script.async = true;
      script.defer = true;

      script.addEventListener(
        "load",
        renderTurnstile
      );

      document.head.appendChild(
        script
      );
    }

    return () => {
      cancelled = true;

      if (
        existingScript
      ) {
        existingScript.removeEventListener(
          "load",
          renderTurnstile
        );
      }

      if (
        window.turnstile &&
        turnstileWidgetId.current !==
          null
      ) {
        try {
          window.turnstile.remove(
            turnstileWidgetId.current
          );
        } catch (
          turnstileError
        ) {
          console.error(
            "Turnstile cleanup error:",
            turnstileError
          );
        }

        turnstileWidgetId.current =
          null;
      }
    };
  }, [success]);

  /* =========================================================
     AGENT DETECTION
  ========================================================= */

  async function detectAgent() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const requestedAgentId =
      params.get("agent");

    if (
      !requestedAgentId
    ) {
      setAgentId(null);
      return;
    }

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (
        !session?.user ||
        session.user.id !==
          requestedAgentId
      ) {
        setAgentId(null);
        return;
      }

      const {
        data:
          agentData,
        error:
          agentError,
      } =
        await supabase
          .from("agents")
          .select("id")
          .eq(
            "id",
            session.user.id
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();

      if (
        agentError ||
        !agentData
      ) {
        console.error(
          "Agent verification failed:",
          agentError
        );

        setAgentId(null);

        return;
      }

      setAgentId(
        agentData.id
      );
    } catch (
      agentError
    ) {
      console.error(
        "Agent detection error:",
        agentError
      );

      setAgentId(null);
    }
  }

  /* =========================================================
     PACKAGES
  ========================================================= */

  async function loadPackages() {
    setPackagesLoading(true);
    setError("");

    try {
      const {
        data,
        error:
          packageError,
      } =
        await supabase
          .from("packages")
          .select("*")
          .eq(
            "is_active",
            true
          )
          .order(
            "display_order",
            {
              ascending:
                true,
            }
          );

      if (
        packageError
      ) {
        throw packageError;
      }

      setPackages(
        data || []
      );
    } catch (
      packageError
    ) {
      console.error(
        packageError
      );

      setError(
        "Imeshindikana kupakia vifurushi vya ushiriki."
      );
    } finally {
      setPackagesLoading(
        false
      );
    }
  }

  const selectedPackage =
    packages.find(
      (pkg) =>
        pkg.id ===
        form.package_id
    );

  /* =========================================================
     FORM HELPERS
  ========================================================= */

  function updateField(
    field,
    value
  ) {
    setForm(
      (prev) => ({
        ...prev,
        [field]:
          value,
      })
    );
  }

  function toggleUshiriki(
    item
  ) {
    setForm(
      (prev) => {
        const exists =
          prev.aina_ushiriki.includes(
            item
          );

        return {
          ...prev,

          aina_ushiriki:
            exists
              ? prev.aina_ushiriki.filter(
                  (
                    value
                  ) =>
                    value !==
                    item
                )
              : [
                  ...prev.aina_ushiriki,
                  item,
                ],
        };
      }
    );
  }

  function resetTurnstile() {
    setTurnstileToken(
      ""
    );

    if (
      window.turnstile &&
      turnstileWidgetId.current !==
        null
    ) {
      try {
        window.turnstile.reset(
          turnstileWidgetId.current
        );
      } catch (
        turnstileError
      ) {
        console.error(
          "Turnstile reset error:",
          turnstileError
        );
      }
    }
  }

  /* =========================================================
     SECURE REGISTRATION SUBMISSION
  ========================================================= */

  async function handleSubmit(
    e
  ) {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    /* -----------------------------------------
       Client-side validation
    ----------------------------------------- */

    if (
      !form.jina_kamili.trim()
    ) {
      setError(
        "Tafadhali andika jina kamili."
      );

      return;
    }

    if (
      !form.namba_simu.trim()
    ) {
      setError(
        "Tafadhali andika namba ya simu."
      );

      return;
    }

    if (
      !form.mkoa.trim()
    ) {
      setError(
        "Tafadhali andika mkoa."
      );

      return;
    }

    if (
      !selectedPackage
    ) {
      setError(
        "Tafadhali chagua kifurushi cha ushiriki."
      );

      return;
    }

    if (
      form.aina_ushiriki
        .length === 0
    ) {
      setError(
        "Tafadhali chagua angalau aina moja ya ushiriki."
      );

      return;
    }

    if (
      !form.maelezo_bidhaa_huduma.trim()
    ) {
      setError(
        "Tafadhali eleza bidhaa au huduma utakazoonyesha."
      );

      return;
    }

    if (
      !form.amekubali_tamko
    ) {
      setError(
        "Lazima ukubali tamko kabla ya kutuma usajili."
      );

      return;
    }

    if (
      !turnstileToken
    ) {
      setError(
        "Thibitisha kuwa wewe si roboti kabla ya kutuma usajili."
      );

      return;
    }

    setLoading(true);

    try {
      /* =====================================================
         SECURE EDGE FUNCTION

         IMPORTANT:
         We no longer INSERT directly into registrations.

         Package price/name/status are determined on the server.
      ===================================================== */

      const {
        data:
          submitData,
        error:
          submitError,
      } =
        await supabase.functions.invoke(
          "submit-registration",
          {
            body: {
              turnstileToken,

              jina_kamili:
                form.jina_kamili,

              jina_biashara:
                form.jina_biashara,

              namba_simu:
                form.namba_simu,

              barua_pepe:
                form.barua_pepe,

              mkoa:
                form.mkoa,

              mji_wilaya:
                form.mji_wilaya,

              anwani:
                form.anwani,

              mahali_biashara_ilipo:
                form.mahali_biashara_ilipo,

              aina_ushiriki:
                form.aina_ushiriki,

              aina_ushiriki_nyingine:
                form.aina_ushiriki_nyingine,

              maelezo_bidhaa_huduma:
                form.maelezo_bidhaa_huduma,

              idadi_meza:
                Number(
                  form.idadi_meza
                ) || 0,

              idadi_viti:
                Number(
                  form.idadi_viti
                ) || 0,

              umeme:
                form.umeme,

              tenti:
                form.tenti,

              maji:
                form.maji,

              mahitaji_mengine:
                form.mahitaji_mengine,

              muda_ushiriki:
                form.muda_ushiriki,

              amekubali_tamko:
                form.amekubali_tamko,

              package_id:
                selectedPackage.id,

              agent_id:
                agentId,
            },
          }
        );

      if (
        submitError
      ) {
        console.error(
          "Secure registration error:",
          submitError
        );

        throw submitError;
      }

      if (
        !submitData?.success
      ) {
        throw new Error(
          submitData?.error ||
            "Usajili haukukamilika."
        );
      }

      /* =====================================================
         SUCCESS
      ===================================================== */

      setSubmissionResult(
        submitData
      );

      setTurnstileToken(
        ""
      );

      setForm(
        initialForm
      );

      setSuccess(
        true
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    } catch (
      submitError
    ) {
      console.error(
        "Registration submission failed:",
        submitError
      );

      setError(
        submitError?.message ||
          "Samahani, usajili haujaweza kutumwa. Tafadhali jaribu tena."
      );

      /*
       * Turnstile tokens are single-use.
       * Always generate a fresh token after a failed request.
       */
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  if (success) {
    const payment =
      submissionResult?.payment;

    const paymentInstructions =
      submissionResult?.paymentInstructions;

    const accounts =
      paymentInstructions?.accounts || [];

    return (
      <main className="page">
        <section className="success-card">
          <div className="success-icon">
            ✓
          </div>

          <h1>
            Usajili Umepokelewa
          </h1>

          <p>
            Asante kwa kujisajili kushiriki
            <strong>
              {" "}
              Mwanza Cherehani Festival 2026.
            </strong>
          </p>

          {submissionResult?.registrationId && (
            <div className="notice">
              <strong>
                Namba ya kumbukumbu ya usajili:
              </strong>{" "}
              <span style={{ wordBreak: "break-all" }}>
                {submissionResult.registrationId}
              </span>
            </div>
          )}

          {payment && (
            <div className="payment-message">
              <strong>
                Maelekezo ya Malipo
              </strong>

              <p>
                Kiasi cha kulipa:{" "}
                <strong>
                  TSh {money(payment.amountDue)}
                </strong>
              </p>

              <p>
                Hali ya malipo:{" "}
                <strong>
                  Inasubiri malipo
                </strong>
              </p>

              {paymentInstructions?.message && (
                <p>
                  {paymentInstructions.message}
                </p>
              )}

              {accounts.map((account) => (
                <div
                  key={`${account.bank}-${account.accountNumber}`}
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: "12px",
                    background: "#fff",
                  }}
                >
                  <div>
                    <strong>{account.bank}</strong>
                  </div>

                  <div>
                    Namba ya Akaunti:{" "}
                    <strong>{account.accountNumber}</strong>
                  </div>

                  <div>
                    Jina la Akaunti:{" "}
                    <strong>{account.accountName}</strong>
                  </div>
                </div>
              ))}

              {paymentInstructions?.important && (
                <div
                  className="notice"
                  style={{ marginTop: "16px" }}
                >
                  <strong>Muhimu:</strong>{" "}
                  {paymentInstructions.important}
                </div>
              )}
            </div>
          )}

          <p>
            Baada ya kufanya malipo, Kamati itathibitisha malipo yako
            kabla ya kutoa tiketi au QR ya ushiriki.
          </p>

          <a
            className="whatsapp-button"
            href="https://wa.me/255773576581"
            target="_blank"
            rel="noreferrer"
          >
            Wasiliana Nasi WhatsApp
          </a>

          <button
            className="secondary-button"
            onClick={() => {
              setSuccess(false);
              setSubmissionResult(null);
              setError("");
            }}
          >
            Sajili Mshiriki Mwingine
          </button>
        </section>
      </main>
    );
  }

  /* =========================================================
     REGISTRATION FORM
  ========================================================= */

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-badge">
          USAJILI RASMI
        </div>

        <h1>
          MWANZA CHEREHANI FESTIVAL 2026
        </h1>

        <p className="hero-title">
          Fomu ya Usajili wa Washiriki
        </p>

        <div className="event-info">
          <span>
            📍 Viwanja vya Furahisha, Mwanza
          </span>

          <span>
            📅 25–27 Septemba 2026
          </span>

          <span>
            👗 Maonyesho ya Mitindo: 28 Septemba 2026
          </span>
        </div>
      </header>

      <form
        className="form-card"
        onSubmit={
          handleSubmit
        }
      >
        {/* =================================================
            SECTION 1
        ================================================= */}

        <section className="form-section">
          <div className="section-number">
            1
          </div>

          <div>
            <h2>
              Taarifa za Mshiriki
            </h2>

            <p>
              Jaza taarifa zako kwa usahihi.
            </p>
          </div>

          <div className="grid">
            <label>
              Jina Kamili *

              <input
                type="text"
                value={
                  form.jina_kamili
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "jina_kamili",
                    e.target.value
                  )
                }
                placeholder="Mfano: Asha Juma"
                required
              />
            </label>

            <label>
              Jina la Biashara/Kikundi

              <input
                type="text"
                value={
                  form.jina_biashara
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "jina_biashara",
                    e.target.value
                  )
                }
                placeholder="Jina la biashara"
              />
            </label>

            <label>
              Namba ya Simu *

              <input
                type="tel"
                value={
                  form.namba_simu
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "namba_simu",
                    e.target.value
                  )
                }
                placeholder="07XXXXXXXX"
                required
              />
            </label>

            <label>
              Barua Pepe

              <input
                type="email"
                value={
                  form.barua_pepe
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "barua_pepe",
                    e.target.value
                  )
                }
                placeholder="mfano@email.com"
              />
            </label>

            <label>
              Mkoa *

              <input
                type="text"
                value={
                  form.mkoa
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "mkoa",
                    e.target.value
                  )
                }
                placeholder="Mfano: Mwanza"
                required
              />
            </label>

            <label>
              Mji / Wilaya

              <input
                type="text"
                value={
                  form.mji_wilaya
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "mji_wilaya",
                    e.target.value
                  )
                }
                placeholder="Mfano: Ilemela"
              />
            </label>

            <label>
              Anwani

              <input
                type="text"
                value={
                  form.anwani
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "anwani",
                    e.target.value
                  )
                }
                placeholder="Anwani yako"
              />
            </label>

            <label>
              Mahali Biashara Ilipo

              <input
                type="text"
                value={
                  form.mahali_biashara_ilipo
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "mahali_biashara_ilipo",
                    e.target.value
                  )
                }
                placeholder="Eneo biashara ilipo"
              />
            </label>
          </div>
        </section>

        {/* =================================================
            SECTION 2 — PACKAGES
        ================================================= */}

        <section className="form-section">
          <div className="section-number">
            2
          </div>

          <div>
            <h2>
              Chagua Kifurushi cha Ushiriki
            </h2>

            <p>
              Chagua kifurushi kinachoendana na aina ya biashara au
              taasisi yako.
            </p>
          </div>

          {packagesLoading ? (
            <div className="package-loading">
              Inapakia vifurushi...
            </div>
          ) : packages.length ===
            0 ? (
            <div className="error-message">
              Hakuna kifurushi kinachopatikana kwa sasa.
            </div>
          ) : (
            <div className="public-package-grid">
              {packages.map(
                (
                  pkg
                ) => {
                  const selected =
                    form.package_id ===
                    pkg.id;

                  return (
                    <label
                      key={
                        pkg.id
                      }
                      className={`public-package-card ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="package"
                        value={
                          pkg.id
                        }
                        checked={
                          selected
                        }
                        onChange={() =>
                          updateField(
                            "package_id",
                            pkg.id
                          )
                        }
                      />

                      <div>
                        <span className="package-category">
                          {pkg.category ||
                            "Kifurushi cha Ushiriki"}
                        </span>

                        <h3>
                          {
                            pkg.name
                          }
                        </h3>

                        <div className="public-package-price">
                          TSh{" "}
                          {money(
                            pkg.price
                          )}

                          {pkg.vat_note
                            ? ` ${pkg.vat_note}`
                            : ""}
                        </div>

                        {pkg.tent_size && (
                          <p>
                            <strong>
                              Eneo/Tenti:
                            </strong>{" "}
                            {
                              pkg.tent_size
                            }
                          </p>
                        )}

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

                        {pkg.participant_limit && (
                          <p>
                            <strong>
                              Idadi:
                            </strong>{" "}
                            {
                              pkg.participant_limit
                            }
                          </p>
                        )}
                      </div>
                    </label>
                  );
                }
              )}
            </div>
          )}

          {selectedPackage && (
            <div className="selected-package-summary">
              <strong>
                Kifurushi Ulichochagua:
              </strong>

              <span>
                {
                  selectedPackage.name
                }
              </span>

              <span>
                TSh{" "}
                {money(
                  selectedPackage.price
                )}

                {selectedPackage.vat_note
                  ? ` ${selectedPackage.vat_note}`
                  : ""}
              </span>
            </div>
          )}
        </section>

        {/* =================================================
            SECTION 3
        ================================================= */}

        <section className="form-section">
          <div className="section-number">
            3
          </div>

          <div>
            <h2>
              Aina ya Ushiriki
            </h2>

            <p>
              Unaweza kuchagua zaidi ya moja.
            </p>
          </div>

          <div className="checkbox-grid">
            {ainaZaUshiriki.map(
              (
                item
              ) => (
                <label
                  className="checkbox-card"
                  key={
                    item
                  }
                >
                  <input
                    type="checkbox"
                    checked={form.aina_ushiriki.includes(
                      item
                    )}
                    onChange={() =>
                      toggleUshiriki(
                        item
                      )
                    }
                  />

                  <span>
                    {
                      item
                    }
                  </span>
                </label>
              )
            )}
          </div>

          {form.aina_ushiriki.includes(
            "Nyingine"
          ) && (
            <label className="full-field">
              Eleza aina nyingine ya ushiriki

              <input
                type="text"
                value={
                  form.aina_ushiriki_nyingine
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "aina_ushiriki_nyingine",
                    e.target.value
                  )
                }
                placeholder="Andika hapa"
              />
            </label>
          )}
        </section>

        {/* =================================================
            SECTION 4
        ================================================= */}

        <section className="form-section">
          <div className="section-number">
            4
          </div>

          <div>
            <h2>
              Bidhaa / Huduma
            </h2>

            <p>
              Eleza bidhaa au huduma utakazoonyesha au kuuza.
            </p>
          </div>

          <label className="full-field">
            Maelezo ya Bidhaa/Huduma *

            <textarea
              rows="5"
              value={
                form.maelezo_bidhaa_huduma
              }
              onChange={(
                e
              ) =>
                updateField(
                  "maelezo_bidhaa_huduma",
                  e.target.value
                )
              }
              placeholder="Mfano: Nguo za kike, sare, mikoba, viatu..."
              required
            />
          </label>
        </section>

        {/* =================================================
            SECTION 5
        ================================================= */}

        <section className="form-section">
          <div className="section-number">
            5
          </div>

          <div>
            <h2>
              Mahitaji ya Eneo la Maonyesho
            </h2>

            <p>
              Tuambie mahitaji yako muhimu.
            </p>
          </div>

          <div className="grid">
            <label>
              Idadi ya Meza

              <input
                type="number"
                min="0"
                value={
                  form.idadi_meza
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "idadi_meza",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Idadi ya Viti

              <input
                type="number"
                min="0"
                value={
                  form.idadi_viti
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "idadi_viti",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="needs-grid">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={
                  form.umeme
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "umeme",
                    e.target.checked
                  )
                }
              />

              <span>
                Umeme
              </span>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={
                  form.tenti
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "tenti",
                    e.target.checked
                  )
                }
              />

              <span>
                Tenti
              </span>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={
                  form.maji
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "maji",
                    e.target.checked
                  )
                }
              />

              <span>
                Maji
              </span>
            </label>
          </div>

          <label className="full-field">
            Mahitaji Mengine

            <textarea
              rows="3"
              value={
                form.mahitaji_mengine
              }
              onChange={(
                e
              ) =>
                updateField(
                  "mahitaji_mengine",
                  e.target.value
                )
              }
              placeholder="Eleza mahitaji mengine kama yapo"
            />
          </label>
        </section>

        {/* =================================================
            SECTION 6
        ================================================= */}

        <section className="form-section">
          <div className="section-number">
            6
          </div>

          <div>
            <h2>
              Muda wa Ushiriki
            </h2>
          </div>

          <div className="radio-group">
            <label className="checkbox-card">
              <input
                type="radio"
                name="muda"
                value="Siku"
                checked={
                  form.muda_ushiriki ===
                  "Siku"
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "muda_ushiriki",
                    e.target.value
                  )
                }
              />

              <span>
                Siku Maalum
              </span>
            </label>

            <label className="checkbox-card">
              <input
                type="radio"
                name="muda"
                value="Siku zote za Festival"
                checked={
                  form.muda_ushiriki ===
                  "Siku zote za Festival"
                }
                onChange={(
                  e
                ) =>
                  updateField(
                    "muda_ushiriki",
                    e.target.value
                  )
                }
              />

              <span>
                Siku Zote za Festival
              </span>
            </label>
          </div>
        </section>

        {/* =================================================
            SECTION 7
        ================================================= */}

        <section className="form-section declaration">
          <div className="section-number">
            7
          </div>

          <div>
            <h2>
              Tamko
            </h2>
          </div>

          <label className="declaration-check">
            <input
              type="checkbox"
              checked={
                form.amekubali_tamko
              }
              onChange={(
                e
              ) =>
                updateField(
                  "amekubali_tamko",
                  e.target.checked
                )
              }
            />

            <span>
              Ninathibitisha kwamba taarifa nilizotoa ni sahihi na
              nitafuata sheria na taratibu za Mwanza Cherehani Festival
              2026.
            </span>
          </label>
        </section>

        {/* =================================================
            PAYMENT NOTICE
        ================================================= */}

        <div className="payment-message">
          <strong>
            Maelekezo ya Malipo
          </strong>

          <p>
            Baada ya usajili kufanikiwa, mfumo utaonyesha mara moja
            kiasi sahihi cha kulipa pamoja na akaunti rasmi za CRDB
            na NMB. Kiasi cha malipo kinatokana na kifurushi
            kilichothibitishwa na mfumo.
          </p>
        </div>

        {/* =================================================
            CLOUDFLARE TURNSTILE
        ================================================= */}

        <div
          style={{
            margin:
              "26px 0 18px",

            display:
              "flex",

            justifyContent:
              "center",

            minHeight:
              "65px",
          }}
        >
          <div
            ref={
              turnstileRef
            }
          />
        </div>

        {!turnstileToken &&
          !error && (
            <p
              style={{
                textAlign:
                  "center",

                fontSize:
                  "14px",

                opacity:
                  0.75,

                marginBottom:
                  "12px",
              }}
            >
              Kamilisha uthibitisho wa usalama kabla ya kutuma usajili.
            </p>
          )}

        {error && (
          <div className="error-message">
            {
              error
            }
          </div>
        )}

        <button
          className="submit-button"
          type="submit"
          disabled={
            loading ||
            packagesLoading ||
            !turnstileToken
          }
        >
          {loading
            ? "Inatuma Usajili..."
            : "TUMA USAJILI"}
        </button>

        <p className="privacy-text">
          Taarifa utakazowasilisha zitatunzwa kwa usiri na zitatumika
          kwa shughuli za Mwanza Cherehani Festival 2026 pekee.
        </p>
      </form>

      <footer>
        <strong>
          Mwanza Cherehani Festival 2026
        </strong>

        <span>
          WhatsApp: +255 773 576 581
        </span>

        <span>
          cherehanifestival2026@gmail.com
        </span>
      </footer>
    </main>
  );
}
