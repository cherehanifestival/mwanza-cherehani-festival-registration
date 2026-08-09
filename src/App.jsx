import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

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
};

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleUshiriki = (item) => {
    setForm((prev) => {
      const exists = prev.aina_ushiriki.includes(item);

      return {
        ...prev,
        aina_ushiriki: exists
          ? prev.aina_ushiriki.filter((value) => value !== item)
          : [...prev.aina_ushiriki, item],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.jina_kamili.trim()) {
      setError("Tafadhali andika jina kamili.");
      return;
    }

    if (!form.namba_simu.trim()) {
      setError("Tafadhali andika namba ya simu.");
      return;
    }

    if (!form.mkoa.trim()) {
      setError("Tafadhali chagua au andika mkoa.");
      return;
    }

    if (form.aina_ushiriki.length === 0) {
      setError("Tafadhali chagua angalau aina moja ya ushiriki.");
      return;
    }

    if (!form.maelezo_bidhaa_huduma.trim()) {
      setError("Tafadhali eleza bidhaa au huduma utakazoonyesha.");
      return;
    }

    if (!form.amekubali_tamko) {
      setError("Lazima ukubali tamko kabla ya kutuma usajili.");
      return;
    }

    setLoading(true);

    const { error: submitError } = await supabase
      .from("registrations")
      .insert([
        {
          jina_kamili: form.jina_kamili.trim(),
          jina_biashara: form.jina_biashara.trim() || null,
          namba_simu: form.namba_simu.trim(),
          barua_pepe: form.barua_pepe.trim() || null,
          mkoa: form.mkoa.trim(),
          mji_wilaya: form.mji_wilaya.trim() || null,
          anwani: form.anwani.trim() || null,
          mahali_biashara_ilipo:
            form.mahali_biashara_ilipo.trim() || null,
          aina_ushiriki: form.aina_ushiriki,
          aina_ushiriki_nyingine:
            form.aina_ushiriki_nyingine.trim() || null,
          maelezo_bidhaa_huduma:
            form.maelezo_bidhaa_huduma.trim(),
          idadi_meza: Number(form.idadi_meza) || 0,
          idadi_viti: Number(form.idadi_viti) || 0,
          umeme: form.umeme,
          tenti: form.tenti,
          maji: form.maji,
          mahitaji_mengine: form.mahitaji_mengine.trim() || null,
          muda_ushiriki: form.muda_ushiriki || null,
          amekubali_tamko: true,
        },
      ]);

    setLoading(false);

    if (submitError) {
      console.error(submitError);
      setError(
        "Samahani, usajili haujaweza kutumwa. Tafadhali jaribu tena."
      );
      return;
    }

    setSuccess(true);
    setForm(initialForm);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (success) {
    return (
      <main className="page">
        <section className="success-card">
          <div className="success-icon">✓</div>

          <h1>Usajili Umepokelewa</h1>

          <p>
            Asante kwa kujisajili kushiriki
            <strong> Mwanza Cherehani Festival 2026.</strong>
          </p>

          <p>
            Kamati itapitia taarifa zako na kuwasiliana nawe kupitia
            simu, WhatsApp au barua pepe kwa maelekezo ya malipo na
            hatua zinazofuata.
          </p>

          <div className="notice">
            <strong>Muhimu:</strong> Usifanye malipo kwa namba yoyote
            ambayo haijatumwa rasmi na Kamati ya Mwanza Cherehani
            Festival 2026.
          </div>

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
            onClick={() => setSuccess(false)}
          >
            Sajili Mshiriki Mwingine
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-badge">USAJILI RASMI</div>

        <h1>MWANZA CHEREHANI FESTIVAL 2026</h1>

        <p className="hero-title">Fomu ya Usajili wa Washiriki</p>

        <div className="event-info">
          <span>📍 Viwanja vya Furahisha, Mwanza</span>
          <span>📅 25–27 Septemba 2026</span>
          <span>👗 Maonyesho ya Mitindo: 28 Septemba 2026</span>
        </div>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <section className="form-section">
          <div className="section-number">1</div>

          <div>
            <h2>Taarifa za Mshiriki</h2>
            <p>Jaza taarifa zako kwa usahihi.</p>
          </div>

          <div className="grid">
            <label>
              Jina Kamili *
              <input
                type="text"
                value={form.jina_kamili}
                onChange={(e) =>
                  updateField("jina_kamili", e.target.value)
                }
                placeholder="Mfano: Asha Juma"
                required
              />
            </label>

            <label>
              Jina la Biashara/Kikundi
              <input
                type="text"
                value={form.jina_biashara}
                onChange={(e) =>
                  updateField("jina_biashara", e.target.value)
                }
                placeholder="Jina la biashara"
              />
            </label>

            <label>
              Namba ya Simu *
              <input
                type="tel"
                value={form.namba_simu}
                onChange={(e) =>
                  updateField("namba_simu", e.target.value)
                }
                placeholder="07XXXXXXXX"
                required
              />
            </label>

            <label>
              Barua Pepe
              <input
                type="email"
                value={form.barua_pepe}
                onChange={(e) =>
                  updateField("barua_pepe", e.target.value)
                }
                placeholder="mfano@email.com"
              />
            </label>

            <label>
              Mkoa *
              <input
                type="text"
                value={form.mkoa}
                onChange={(e) => updateField("mkoa", e.target.value)}
                placeholder="Mfano: Mwanza"
                required
              />
            </label>

            <label>
              Mji / Wilaya
              <input
                type="text"
                value={form.mji_wilaya}
                onChange={(e) =>
                  updateField("mji_wilaya", e.target.value)
                }
                placeholder="Mfano: Ilemela"
              />
            </label>

            <label>
              Anwani
              <input
                type="text"
                value={form.anwani}
                onChange={(e) =>
                  updateField("anwani", e.target.value)
                }
                placeholder="Anwani yako"
              />
            </label>

            <label>
              Mahali Biashara Ilipo
              <input
                type="text"
                value={form.mahali_biashara_ilipo}
                onChange={(e) =>
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

        <section className="form-section">
          <div className="section-number">2</div>

          <div>
            <h2>Aina ya Ushiriki</h2>
            <p>Unaweza kuchagua zaidi ya moja.</p>
          </div>

          <div className="checkbox-grid">
            {ainaZaUshiriki.map((item) => (
              <label className="checkbox-card" key={item}>
                <input
                  type="checkbox"
                  checked={form.aina_ushiriki.includes(item)}
                  onChange={() => toggleUshiriki(item)}
                />

                <span>{item}</span>
              </label>
            ))}
          </div>

          {form.aina_ushiriki.includes("Nyingine") && (
            <label className="full-field">
              Eleza aina nyingine ya ushiriki
              <input
                type="text"
                value={form.aina_ushiriki_nyingine}
                onChange={(e) =>
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

        <section className="form-section">
          <div className="section-number">3</div>

          <div>
            <h2>Bidhaa / Huduma</h2>
            <p>
              Eleza bidhaa au huduma utakazoonyesha au kuuza.
            </p>
          </div>

          <label className="full-field">
            Maelezo ya Bidhaa/Huduma *
            <textarea
              rows="5"
              value={form.maelezo_bidhaa_huduma}
              onChange={(e) =>
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

        <section className="form-section">
          <div className="section-number">4</div>

          <div>
            <h2>Mahitaji ya Eneo la Maonyesho</h2>
            <p>Tuambie mahitaji yako muhimu.</p>
          </div>

          <div className="grid">
            <label>
              Idadi ya Meza
              <input
                type="number"
                min="0"
                value={form.idadi_meza}
                onChange={(e) =>
                  updateField("idadi_meza", e.target.value)
                }
              />
            </label>

            <label>
              Idadi ya Viti
              <input
                type="number"
                min="0"
                value={form.idadi_viti}
                onChange={(e) =>
                  updateField("idadi_viti", e.target.value)
                }
              />
            </label>
          </div>

          <div className="needs-grid">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.umeme}
                onChange={(e) =>
                  updateField("umeme", e.target.checked)
                }
              />
              <span>Umeme</span>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.tenti}
                onChange={(e) =>
                  updateField("tenti", e.target.checked)
                }
              />
              <span>Tenti</span>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.maji}
                onChange={(e) =>
                  updateField("maji", e.target.checked)
                }
              />
              <span>Maji</span>
            </label>
          </div>

          <label className="full-field">
            Mahitaji Mengine
            <textarea
              rows="3"
              value={form.mahitaji_mengine}
              onChange={(e) =>
                updateField("mahitaji_mengine", e.target.value)
              }
              placeholder="Eleza mahitaji mengine kama yapo"
            />
          </label>
        </section>

        <section className="form-section">
          <div className="section-number">5</div>

          <div>
            <h2>Muda wa Ushiriki</h2>
          </div>

          <div className="radio-group">
            <label className="checkbox-card">
              <input
                type="radio"
                name="muda"
                value="Siku"
                checked={form.muda_ushiriki === "Siku"}
                onChange={(e) =>
                  updateField("muda_ushiriki", e.target.value)
                }
              />
              <span>Siku Maalum</span>
            </label>

            <label className="checkbox-card">
              <input
                type="radio"
                name="muda"
                value="Siku zote za Festival"
                checked={
                  form.muda_ushiriki === "Siku zote za Festival"
                }
                onChange={(e) =>
                  updateField("muda_ushiriki", e.target.value)
                }
              />
              <span>Siku Zote za Festival</span>
            </label>
          </div>
        </section>

        <section className="form-section declaration">
          <div className="section-number">6</div>

          <div>
            <h2>Tamko</h2>
          </div>

          <label className="declaration-check">
            <input
              type="checkbox"
              checked={form.amekubali_tamko}
              onChange={(e) =>
                updateField("amekubali_tamko", e.target.checked)
              }
            />

            <span>
              Ninathibitisha kwamba taarifa nilizotoa ni sahihi na
              nitafuata sheria na taratibu za Mwanza Cherehani
              Festival 2026.
            </span>
          </label>
        </section>

        <div className="payment-message">
          <strong>Maelekezo ya Malipo</strong>

          <p>
            Hakuna malipo yanayofanyika kupitia fomu hii. Baada ya
            usajili wako kupokelewa na kuhakikiwa, Kamati itawasiliana
            nawe moja kwa moja na kukupa maelekezo rasmi ya malipo.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="submit-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Inatuma Usajili..." : "TUMA USAJILI"}
        </button>

        <p className="privacy-text">
          Taarifa utakazowasilisha zitatunzwa kwa usiri na
          zitatumika kwa shughuli za Mwanza Cherehani Festival 2026
          pekee.
        </p>
      </form>

      <footer>
        <strong>Mwanza Cherehani Festival 2026</strong>

        <span>WhatsApp: +255 773 576 581</span>

        <span>cherehanifestival2026@gmail.com</span>
      </footer>
    </main>
  );
}
