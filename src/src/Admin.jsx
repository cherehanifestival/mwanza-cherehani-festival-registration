import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import QrScanner from "qr-scanner";

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
   CONFIG
========================================================= */

const ADMIN_EMAIL =
  "cherehanifestival2026@gmail.com";

const FESTIVAL_NAME =
  "Mwanza Cherehani Festival 2026";

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

const paymentStatuses = [
  ["pending", "Pending"],
  ["instructions_sent", "Maelekezo Yametumwa"],
  ["submitted", "Malipo Yamewasilishwa"],
  ["paid", "Amelipa"],
  ["verified", "Malipo Yamehakikiwa"],
  ["rejected", "Malipo Yamekataliwa"],
  ["refunded", "Imerejeshwa"],
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

const emptyPaymentForm = {
  payment_method: "",
  payment_reference: "",
  amount_due: "",
  amount_paid: "",
  notes: "",
};

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  return new Intl.NumberFormat("sw-TZ").format(
    Number(value || 0)
  );
}

function whatsappNumber(phone = "") {
  let number = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (number.startsWith("0")) {
    number = "255" + number.slice(1);
  }

  if (
    number &&
    !number.startsWith("255")
  ) {
    number = "255" + number;
  }

  return number;
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

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString(
      "sw-TZ",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "—";
  }
}

function statusLabel(value) {
  return (
    statuses.find(
      ([status]) => status === value
    )?.[1] || "Mpya"
  );
}

function paymentStatusLabel(value) {
  return (
    paymentStatuses.find(
      ([status]) => status === value
    )?.[1] || value || "Pending"
  );
}

function normalizeQrToken(value = "") {
  return String(value)
    .trim()
    .replace(/\s+/g, "");
}

/* =========================================================
   LOCAL QR GENERATOR
   Version 3-L QR, byte mode. Generated fully in-browser so
   ticket tokens are never sent to an external QR service.
========================================================= */

function createQrMatrix(text) {
  const version = 3;
  const size = 17 + 4 * version;
  const dataCodewords = 55;
  const eccLength = 15;
  const payload = Array.from(
    new TextEncoder().encode(String(text || ""))
  );

  if (payload.length > 53) {
    throw new Error("QR token is too long for the local encoder.");
  }

  const bits = [];
  const pushBits = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) {
      bits.push((value >>> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  payload.forEach((byte) => pushBits(byte, 8));

  const capacity = dataCodewords * 8;
  for (
    let i = 0;
    i < Math.min(4, capacity - bits.length);
    i += 1
  ) {
    bits.push(0);
  }

  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | (bits[i + j] || 0);
    }
    data.push(value);
  }

  let padIndex = 0;
  while (data.length < dataCodewords) {
    data.push(padIndex++ % 2 ? 0x11 : 0xec);
  }

  function gfMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i -= 1) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      if ((y >>> i) & 1) z ^= x;
    }
    return z & 0xff;
  }

  function reedSolomonDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;

    for (let i = 0; i < degree; i += 1) {
      for (let j = 0; j < degree; j += 1) {
        result[j] =
          gfMultiply(result[j], root) ^
          (j + 1 < degree ? result[j + 1] : 0);
      }
      root = gfMultiply(root, 2);
    }

    return result;
  }

  function reedSolomonRemainder(bytes, divisor) {
    const result = new Array(divisor.length).fill(0);

    bytes.forEach((byte) => {
      const factor = byte ^ result.shift();
      result.push(0);
      for (let i = 0; i < result.length; i += 1) {
        result[i] ^= gfMultiply(divisor[i], factor);
      }
    });

    return result;
  }

  const codewords = data.concat(
    reedSolomonRemainder(
      data,
      reedSolomonDivisor(eccLength)
    )
  );

  const modules = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const functionModules = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const setFunction = (x, y, dark) => {
    if (x >= 0 && y >= 0 && x < size && y < size) {
      modules[y][x] = Boolean(dark);
      functionModules[y][x] = true;
    }
  };

  function drawFinder(cx, cy) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(
          cx + dx,
          cy + dy,
          distance !== 2 && distance !== 4
        );
      }
    }
  }

  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  for (let i = 0; i < size; i += 1) {
    if (!functionModules[6][i]) {
      setFunction(i, 6, i % 2 === 0);
    }
    if (!functionModules[i][6]) {
      setFunction(6, i, i % 2 === 0);
    }
  }

  // Version 3 alignment pattern center.
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      setFunction(
        22 + dx,
        22 + dy,
        Math.max(Math.abs(dx), Math.abs(dy)) !== 1
      );
    }
  }

  setFunction(8, size - 8, true);

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      setFunction(8, i, false);
      setFunction(i, 8, false);
    }
  }

  for (let i = 0; i < 8; i += 1) {
    setFunction(size - 1 - i, 8, false);
    setFunction(8, size - 1 - i, false);
  }

  const dataBits = [];
  codewords.forEach((byte) => {
    for (let i = 7; i >= 0; i -= 1) {
      dataBits.push((byte >>> i) & 1);
    }
  });

  let dataIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;

        if (!functionModules[y][x]) {
          modules[y][x] = Boolean(
            dataIndex < dataBits.length
              ? dataBits[dataIndex]
              : 0
          );
          dataIndex += 1;
        }
      }
    }
  }

  const maskFunctions = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) =>
      (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) === 0,
    (x, y) => (((x * y) % 2 + (x * y) % 3) % 2) === 0,
    (x, y) => (((x + y) % 2 + (x * y) % 3) % 2) === 0,
  ];

  function formatBits(mask) {
    // Error correction level L = 01.
    const formatData = (1 << 3) | mask;
    let remainder = formatData << 10;
    const generator = 0x537;

    for (let i = 14; i >= 10; i -= 1) {
      if ((remainder >>> i) & 1) {
        remainder ^= generator << (i - 10);
      }
    }

    return ((formatData << 10) | remainder) ^ 0x5412;
  }

  function drawFormat(matrix, mask) {
    const value = formatBits(mask);
    const first = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
      [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8],
      [2, 8], [1, 8], [0, 8],
    ];
    const second = [
      [size - 1, 8], [size - 2, 8], [size - 3, 8],
      [size - 4, 8], [size - 5, 8], [size - 6, 8],
      [size - 7, 8], [size - 8, 8], [8, size - 7],
      [8, size - 6], [8, size - 5], [8, size - 4],
      [8, size - 3], [8, size - 2], [8, size - 1],
    ];

    for (let i = 0; i < 15; i += 1) {
      const bit = Boolean((value >>> i) & 1);
      const [x1, y1] = first[i];
      const [x2, y2] = second[i];
      matrix[y1][x1] = bit;
      matrix[y2][x2] = bit;
    }

    matrix[size - 8][8] = true;
  }

  function penalty(matrix) {
    let score = 0;

    for (let y = 0; y < size; y += 1) {
      let color = matrix[y][0];
      let run = 1;
      for (let x = 1; x < size; x += 1) {
        if (matrix[y][x] === color) {
          run += 1;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else {
          color = matrix[y][x];
          run = 1;
        }
      }
    }

    for (let x = 0; x < size; x += 1) {
      let color = matrix[0][x];
      let run = 1;
      for (let y = 1; y < size; y += 1) {
        if (matrix[y][x] === color) {
          run += 1;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else {
          color = matrix[y][x];
          run = 1;
        }
      }
    }

    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const color = matrix[y][x];
        if (
          matrix[y][x + 1] === color &&
          matrix[y + 1][x] === color &&
          matrix[y + 1][x + 1] === color
        ) {
          score += 3;
        }
      }
    }

    const patternA = [
      true, false, true, true, true, false, true,
      false, false, false, false,
    ];
    const patternB = [
      false, false, false, false, true, false, true,
      true, true, false, true,
    ];

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x <= size - 11; x += 1) {
        let a = true;
        let b = true;
        for (let i = 0; i < 11; i += 1) {
          if (matrix[y][x + i] !== patternA[i]) a = false;
          if (matrix[y][x + i] !== patternB[i]) b = false;
        }
        if (a || b) score += 40;
      }
    }

    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y <= size - 11; y += 1) {
        let a = true;
        let b = true;
        for (let i = 0; i < 11; i += 1) {
          if (matrix[y + i][x] !== patternA[i]) a = false;
          if (matrix[y + i][x] !== patternB[i]) b = false;
        }
        if (a || b) score += 40;
      }
    }

    let dark = 0;
    matrix.forEach((row) =>
      row.forEach((cell) => {
        if (cell) dark += 1;
      })
    );

    score +=
      Math.floor(
        Math.abs(dark * 20 - size * size * 10) /
          (size * size)
      ) * 10;

    return score;
  }

  let bestMatrix = null;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = modules.map((row) => row.slice());

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (
          !functionModules[y][x] &&
          maskFunctions[mask](x, y)
        ) {
          candidate[y][x] = !candidate[y][x];
        }
      }
    }

    drawFormat(candidate, mask);
    const score = penalty(candidate);

    if (score < bestPenalty) {
      bestPenalty = score;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}

function QrCode({ value, size = 250 }) {
  const matrix = useMemo(() => createQrMatrix(value), [value]);
  const quiet = 4;
  const dimension = matrix.length + quiet * 2;

  return (
    <svg
      className="ticket-qr-svg"
      viewBox={`0 0 ${dimension} ${dimension}`}
      width={size}
      height={size}
      role="img"
      aria-label="Ticket QR code"
      shapeRendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      {matrix.map((row, y) =>
        row.map((dark, x) =>
          dark ? (
            <rect
              key={`${x}-${y}`}
              x={x + quiet}
              y={y + quiet}
              width="1"
              height="1"
              fill="#000000"
            />
          ) : null
        )
      )}
    </svg>
  );
}

function qrSvgString(value) {
  const matrix = createQrMatrix(value);
  const quiet = 4;
  const dimension = matrix.length + quiet * 2;
  let path = "";

  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        path += `M${x + quiet},${y + quiet}h1v1h-1z`;
      }
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;
}

/* =========================================================
   ADMIN COMPONENT
========================================================= */

export default function Admin() {
  /* ========================= AUTH ======================== */

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

  const [adminReady, setAdminReady] =
    useState(false);

  /* ========================= MFA ========================= */

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

  /* ========================= DATA ======================== */

  const [registrations, setRegistrations] =
    useState([]);

  const [agents, setAgents] =
    useState([]);

  const [packages, setPackages] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [tickets, setTickets] =
    useState([]);

  const [ticketScans, setTicketScans] =
    useState([]);

  const [dataLoading, setDataLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* ========================= UI ========================== */

  const [tab, setTab] =
    useState("registrations");

  const [search, setSearch] =
    useState("");

  const [agentSearch, setAgentSearch] =
    useState("");

  const [paymentSearch, setPaymentSearch] =
    useState("");

  const [ticketSearch, setTicketSearch] =
    useState("");

  const [
    selectedRegistration,
    setSelectedRegistration,
  ] = useState(null);

  const [
    selectedAgent,
    setSelectedAgent,
  ] = useState(null);

  const [
    selectedPaymentRegistration,
    setSelectedPaymentRegistration,
  ] = useState(null);

  const [
    selectedTicket,
    setSelectedTicket,
  ] = useState(null);

  /* ====================== PACKAGE FORM =================== */

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

  /* ====================== PAYMENT FORM =================== */

  const [
    paymentForm,
    setPaymentForm,
  ] = useState(emptyPaymentForm);

  const [
    paymentSaving,
    setPaymentSaving,
  ] = useState(false);

  const [
    paymentSending,
    setPaymentSending,
  ] = useState(false);

  /* ======================= QR SCAN ======================= */

  const [qrToken, setQrToken] =
    useState("");

  const [scanLoading, setScanLoading] =
    useState(false);

  const [scanResult, setScanResult] =
    useState(null);

  const [cameraActive, setCameraActive] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const videoRef = useRef(null);
  const cameraScannerRef = useRef(null);
  const scannerBusyRef = useRef(false);

  const [ticketEditor, setTicketEditor] =
    useState(null);

  /* =========================================================
     SESSION INITIALIZATION
  ========================================================= */

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);

        if (!newSession) {
          clearAdminState();
        }
      }
    );

    return () =>
      subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (
      session?.user?.email ===
        ADMIN_EMAIL &&
      adminReady
    ) {
      loadEverything();
    }
  }, [session, adminReady]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

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
        return;
      }

      setSession(currentSession);

      await prepareMfa();
    } catch (authError) {
      console.error(authError);

      setError(
        "Imeshindikana kuhakiki session ya admin."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  async function login(event) {
    event.preventDefault();

    setError("");
    setLoginLoading(true);
    setAdminReady(false);

    try {
      const {
        data,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: email
              .trim()
              .toLowerCase(),
            password,
          }
        );

      if (loginError) {
        throw loginError;
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
      console.error(loginError);

      setError(
        "Barua pepe au nenosiri si sahihi."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  /* =========================================================
     MFA
  ========================================================= */

  async function prepareMfa() {
    setError("");
    setAdminReady(false);

    try {
      const {
        data: assurance,
        error: assuranceError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (assuranceError) {
        throw assuranceError;
      }

      if (
        assurance?.currentLevel ===
        "aal2"
      ) {
        setAdminReady(true);
        setMfaStage("none");
        return;
      }

      const {
        data: factorData,
        error: factorError,
      } =
        await supabase.auth.mfa.listFactors();

      if (factorError) {
        throw factorError;
      }

      const verifiedFactor =
        factorData?.totp?.find(
          (factor) =>
            factor.status === "verified"
        );

      if (verifiedFactor) {
        setMfaFactorId(
          verifiedFactor.id
        );

        setMfaStage("verify");
        return;
      }

      await createMfaEnrollment();
    } catch (mfaError) {
      console.error(mfaError);

      setError(
        "Imeshindikana kuanzisha MFA."
      );
    }
  }

  async function createMfaEnrollment() {
    setMfaLoading(true);
    setError("");

    try {
      const {
        data,
        error: enrollmentError,
      } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName:
            "Cherehani Festival Admin",
        });

      if (enrollmentError) {
        throw enrollmentError;
      }

      setMfaFactorId(data.id);

      setMfaQrCode(
        data.totp?.qr_code || ""
      );

      setMfaSecret(
        data.totp?.secret || ""
      );

      setMfaStage("enroll");
      setMfaCode("");
    } catch (enrollmentError) {
      console.error(enrollmentError);

      setError(
        "Imeshindikana kutengeneza MFA QR."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyMfa(event) {
    event.preventDefault();

    const code = String(mfaCode)
      .replace(/\D/g, "")
      .slice(0, 6);

    if (code.length !== 6) {
      setError(
        "Weka namba zote 6 kutoka Authenticator."
      );

      return;
    }

    if (!mfaFactorId) {
      setError(
        "MFA factor haijapatikana."
      );

      return;
    }

    setMfaLoading(true);
    setError("");

    try {
      const {
        error: verifyError,
      } =
        await supabase.auth.mfa
          .challengeAndVerify({
            factorId: mfaFactorId,
            code,
          });

      if (verifyError) {
        throw verifyError;
      }

      const {
        data: assurance,
        error: assuranceError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (assuranceError) {
        throw assuranceError;
      }

      if (
        assurance?.currentLevel !==
        "aal2"
      ) {
        throw new Error(
          "MFA session was not upgraded."
        );
      }

      const {
        data: { session: refreshed },
      } =
        await supabase.auth.getSession();

      setSession(refreshed);

      setMfaStage("none");
      setMfaCode("");
      setAdminReady(true);
    } catch (verifyError) {
      console.error(verifyError);

      setError(
        "Msimbo wa MFA si sahihi au umeisha muda."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      clearAdminState();
    }
  }

  function clearAdminState() {
    setSession(null);
    setAdminReady(false);

    setRegistrations([]);
    setAgents([]);
    setPackages([]);
    setPayments([]);
    setTickets([]);
    setTicketScans([]);

    setMfaStage("none");
    setMfaFactorId("");
    setMfaCode("");
    setMfaQrCode("");
    setMfaSecret("");

    setSelectedRegistration(null);
    setSelectedAgent(null);
    setSelectedPaymentRegistration(
      null
    );
    setSelectedTicket(null);

    setPassword("");
    setTab("registrations");
  }

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadEverything() {
    setDataLoading(true);
    setError("");

    try {
      await Promise.all([
        loadRegistrations(),
        loadAgents(),
        loadPackages(),
        loadPayments(),
        loadTickets(),
        loadTicketScans(),
      ]);
    } finally {
      setDataLoading(false);
    }
  }

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
          { ascending: false }
        );

    if (fetchError) {
      console.error(fetchError);

      setError(
        "Imeshindikana kupakia washiriki."
      );

      return;
    }

    setRegistrations(data || []);
  }

  async function loadAgents() {
    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("agents")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );

    if (fetchError) {
      console.error(fetchError);

      setError(
        "Imeshindikana kupakia agents."
      );

      return;
    }

    setAgents(data || []);
  }

  async function loadPackages() {
    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("packages")
        .select("*")
        .order(
          "display_order",
          { ascending: true }
        );

    if (fetchError) {
      console.error(fetchError);

      setError(
        "Imeshindikana kupakia vifurushi."
      );

      return;
    }

    setPackages(data || []);
  }

  async function loadPayments() {
    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("payments")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );

    if (fetchError) {
      console.error(fetchError);

      setError(
        "Imeshindikana kupakia malipo."
      );

      return;
    }

    setPayments(data || []);
  }

  async function loadTickets() {
    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("tickets")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );

    if (fetchError) {
      console.error(fetchError);

      setError(
        "Imeshindikana kupakia tiketi."
      );

      return;
    }

    setTickets(data || []);
  }

  async function loadTicketScans() {
    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("ticket_scans")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        )
        .limit(100);

    if (fetchError) {
      console.error(fetchError);

      return;
    }

    setTicketScans(data || []);
  }

  /* =========================================================
     RELATIONSHIP HELPERS
  ========================================================= */

  function getRegistration(id) {
    return (
      registrations.find(
        (registration) =>
          registration.id === id
      ) || null
    );
  }

  function getAgent(id) {
    return (
      agents.find(
        (agent) =>
          agent.id === id
      ) || null
    );
  }

  function getAgentName(id) {
    if (!id) return "Public";

    return (
      getAgent(id)?.full_name ||
      "Agent"
    );
  }

  function getAgentRegistrations(
    id
  ) {
    return registrations.filter(
      (registration) =>
        registration.agent_id === id
    );
  }

  function getPaymentByRegistration(
    registrationId
  ) {
    return (
      payments.find(
        (payment) =>
          payment.registration_id ===
          registrationId
      ) || null
    );
  }

  function getTicketByRegistration(
    registrationId
  ) {
    return (
      tickets.find(
        (ticket) =>
          ticket.registration_id ===
          registrationId
      ) || null
    );
  }

  /* =========================================================
     REGISTRATION STATUS
  ========================================================= */

  async function updateStatus(
    id,
    status
  ) {
    const {
      error: updateError,
    } =
      await supabase
        .from("registrations")
        .update({
          hali_ya_usajili: status,
        })
        .eq("id", id);

    if (updateError) {
      console.error(updateError);

      alert(
        "Imeshindikana kubadilisha hali ya usajili."
      );

      return;
    }

    setRegistrations(
      (current) =>
        current.map(
          (registration) =>
            registration.id === id
              ? {
                  ...registration,
                  hali_ya_usajili:
                    status,
                }
              : registration
        )
    );
  }

  /* =========================================================
     AGENT MANAGEMENT
  ========================================================= */

  async function toggleAgent(agent) {
    const active =
      !agent.is_active;

    const {
      error: updateError,
    } =
      await supabase
        .from("agents")
        .update({
          is_active: active,
        })
        .eq("id", agent.id);

    if (updateError) {
      console.error(updateError);

      alert(
        "Imeshindikana kubadilisha agent."
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
                  is_active: active,
                }
              : item
        )
    );

    if (
      selectedAgent?.id === agent.id
    ) {
      setSelectedAgent({
        ...selectedAgent,
        is_active: active,
      });
    }
  }

  /* =========================================================
     PACKAGE MANAGEMENT
  ========================================================= */

  function editPackage(pkg) {
    setEditingPackageId(pkg.id);

    setPackageForm({
      name: pkg.name || "",
      category: pkg.category || "",
      tent_size:
        pkg.tent_size || "",
      price: pkg.price ?? "",
      vat_note:
        pkg.vat_note || "",
      description:
        pkg.description || "",
      included_items:
        pkg.included_items || "",
      participant_limit:
        pkg.participant_limit ?? "",
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
    setEditingPackageId(null);
    setPackageForm(emptyPackage);
  }

  async function savePackage(event) {
    event.preventDefault();

    if (
      !packageForm.name.trim()
    ) {
      alert(
        "Weka jina la kifurushi."
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
        packageForm.included_items
          .trim() || null,

      participant_limit:
        packageForm
          .participant_limit === ""
          ? null
          : Number(
              packageForm
                .participant_limit
            ),

      display_order:
        Number(
          packageForm.display_order
        ) || 0,

      is_active:
        packageForm.is_active,

      updated_at:
        new Date().toISOString(),
    };

    try {
      let response;

      if (editingPackageId) {
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
            .insert([payload]);
      }

      if (response.error) {
        throw response.error;
      }

      cancelPackageEdit();
      await loadPackages();
    } catch (packageError) {
      console.error(packageError);

      alert(
        "Imeshindikana kuhifadhi kifurushi."
      );
    } finally {
      setSavingPackage(false);
    }
  }

  async function togglePackage(pkg) {
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
        .eq("id", pkg.id);

    if (updateError) {
      console.error(updateError);

      alert(
        "Imeshindikana kubadilisha kifurushi."
      );

      return;
    }

    await loadPackages();
  }

  /* =========================================================
     PAYMENT MANAGEMENT
  ========================================================= */

  function openPaymentEditor(
    registration
  ) {
    const existing =
      getPaymentByRegistration(
        registration.id
      );

    setSelectedPaymentRegistration(
      registration
    );

    setPaymentForm({
      payment_method:
        existing?.payment_method ||
        "",

      payment_reference:
        existing?.payment_reference ||
        "",

      amount_due:
        existing?.amount_due ??
        registration.package_price ??
        "",

      amount_paid:
        existing?.amount_paid ??
        "",

      notes:
        existing?.notes || "",
    });
  }

  function closePaymentEditor() {
    setSelectedPaymentRegistration(
      null
    );

    setPaymentForm(
      emptyPaymentForm
    );
  }

  async function savePayment(
    event
  ) {
    event.preventDefault();

    if (
      !selectedPaymentRegistration
    ) {
      return;
    }

    setPaymentSaving(true);

    try {
      const existing =
        getPaymentByRegistration(
          selectedPaymentRegistration.id
        );

      const payload = {
        registration_id:
          selectedPaymentRegistration.id,

        amount_due:
          Number(
            paymentForm.amount_due ||
              selectedPaymentRegistration.package_price ||
              0
          ),

        amount_paid:
          Number(
            paymentForm.amount_paid ||
              0
          ),

        payment_method:
          paymentForm.payment_method
            .trim() || null,

        payment_reference:
          paymentForm
            .payment_reference
            .trim() || null,

        notes:
          paymentForm.notes
            .trim() || null,
      };

      let response;

      if (existing) {
        response =
          await supabase
            .from("payments")
            .update(payload)
            .eq(
              "id",
              existing.id
            );
      } else {
        response =
          await supabase
            .from("payments")
            .insert([
              {
                ...payload,
                payment_status:
                  "pending",
              },
            ]);
      }

      if (response.error) {
        throw response.error;
      }

      await loadPayments();

      closePaymentEditor();
    } catch (paymentError) {
      console.error(paymentError);

      alert(
        "Imeshindikana kuhifadhi malipo."
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function setPaymentStatus(
    payment,
    status
  ) {
    const patch = {
      payment_status: status,
    };

    if (status === "paid") {
      patch.paid_at =
        new Date().toISOString();
    }

    if (status === "verified") {
      patch.verified_at =
        new Date().toISOString();

      patch.verified_by =
        session.user.id;

      if (
        Number(
          payment.amount_paid || 0
        ) <= 0
      ) {
        patch.amount_paid =
          Number(
            payment.amount_due || 0
          );
      }
    }

    const {
      error: updateError,
    } =
      await supabase
        .from("payments")
        .update(patch)
        .eq("id", payment.id);

    if (updateError) {
      console.error(updateError);

      alert(
        "Imeshindikana kubadilisha hali ya malipo."
      );

      return;
    }

    if (status === "verified") {
      await updateStatus(
        payment.registration_id,
        "amelipa"
      );
    }

    await loadPayments();
  }

  function buildPaymentMessage(
    registration,
    payment
  ) {
    const amount =
      payment?.amount_due ??
      registration.package_price ??
      0;

    const method =
      payment?.payment_method
        ? `Njia ya malipo: ${payment.payment_method}.`
        : "";

    const reference =
      payment?.payment_reference
        ? `Rejea: ${payment.payment_reference}.`
        : "";

    const notes =
      payment?.notes || "";

    return `Habari ${
      registration.jina_kamili
    }, maelekezo ya malipo ya ${FESTIVAL_NAME}. Kifurushi: ${
      registration.package_name ||
      "Ushiriki"
    }. Kiasi: TSh ${money(
      amount
    )}. ${method} ${reference} ${notes}`.trim();
  }

  async function sendPaymentSms(
    registration,
    payment
  ) {
    if (!registration?.namba_simu) {
      alert(
        "Mshiriki hana namba ya simu."
      );

      return;
    }

    setPaymentSending(true);

    try {
      const {
        error: smsError,
      } =
        await supabase.functions.invoke(
          "send-sms",
          {
            body: {
              to:
                registration.namba_simu,

              message:
                buildPaymentMessage(
                  registration,
                  payment
                ),
            },
          }
        );

      if (smsError) {
        throw smsError;
      }

      if (payment) {
        await setPaymentStatus(
          payment,
          "instructions_sent"
        );
      }

      alert(
        "Maelekezo ya malipo yametumwa."
      );
    } catch (smsError) {
      console.error(smsError);

      alert(
        "SMS haijatumwa. Angalia Sender ID/API."
      );
    } finally {
      setPaymentSending(false);
    }
  }

  function openPaymentWhatsApp(
    registration,
    payment
  ) {
    const message =
      buildPaymentMessage(
        registration,
        payment
      );

    const url =
      `https://wa.me/${whatsappNumber(
        registration.namba_simu
      )}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =========================================================
     TICKETING
  ========================================================= */

  async function issueTicket(
    registration
  ) {
    const payment =
      getPaymentByRegistration(
        registration.id
      );

    if (!payment) {
      alert(
        "Tengeneza rekodi ya malipo kwanza."
      );

      return;
    }

    if (
      payment.payment_status !==
      "verified"
    ) {
      alert(
        "Malipo lazima yahakikiwe kabla ya kutoa tiketi."
      );

      return;
    }

    try {
      const {
        data,
        error: ticketError,
      } =
        await supabase.rpc(
          "issue_ticket",
          {
            p_registration_id:
              registration.id,
          }
        );

      if (ticketError) {
        throw ticketError;
      }

      await loadTickets();

      if (data) {
        setSelectedTicket(data);
      }

      await updateStatus(
        registration.id,
        "amethibitishwa"
      );
    } catch (ticketError) {
      console.error(ticketError);

      alert(
        ticketError.message ||
          "Imeshindikana kutoa tiketi."
      );
    }
  }

  async function copyTicketToken(
    ticket
  ) {
    try {
      await navigator.clipboard.writeText(
        ticket.qr_token
      );

      alert(
        "QR token imenakiliwa."
      );
    } catch {
      alert(
        ticket.qr_token
      );
    }
  }

  function buildTicketMessage(
    registration,
    ticket
  ) {
    return `Habari ${
      registration?.jina_kamili ||
      "Mshiriki"
    }, tiketi yako ya ${FESTIVAL_NAME} imetolewa. Ticket No: ${
      ticket.ticket_number
    }. QR Token: ${
      ticket.qr_token
    }. Hifadhi taarifa hizi kwa ajili ya kuingia kwenye festival.`;
  }

  function sendTicketWhatsApp(
    ticket
  ) {
    const registration =
      getRegistration(
        ticket.registration_id
      );

    if (
      !registration?.namba_simu
    ) {
      alert(
        "Namba ya simu haijapatikana."
      );

      return;
    }

    window.open(
      `https://wa.me/${whatsappNumber(
        registration.namba_simu
      )}?text=${encodeURIComponent(
        buildTicketMessage(
          registration,
          ticket
        )
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function sendTicketSms(
    ticket
  ) {
    const registration =
      getRegistration(
        ticket.registration_id
      );

    if (
      !registration?.namba_simu
    ) {
      return;
    }

    try {
      const {
        error: smsError,
      } =
        await supabase.functions.invoke(
          "send-sms",
          {
            body: {
              to:
                registration.namba_simu,

              message:
                buildTicketMessage(
                  registration,
                  ticket
                ),
            },
          }
        );

      if (smsError) {
        throw smsError;
      }

      alert(
        "Taarifa za tiketi zimetumwa."
      );
    } catch (smsError) {
      console.error(smsError);

      alert(
        "SMS ya tiketi haijatumwa."
      );
    }
  }

  async function updateTicketStatus(
    ticket,
    status
  ) {
    const {
      data: updatedTicket,
      error: updateError,
    } =
      await supabase
        .from("tickets")
        .update({
          ticket_status: status,
        })
        .eq("id", ticket.id)
        .select("*")
        .single();

    if (updateError) {
      alert(
        "Imeshindikana kubadilisha tiketi."
      );

      return false;
    }

    await loadTickets();

    if (updatedTicket) {
      setSelectedTicket(updatedTicket);
    }

    return true;
  }

  function openTicketEditor(ticket) {
    setTicketEditor({
      ticket,
      ticket_status:
        ticket.ticket_status || "active",
    });
  }

  async function saveTicketEditor(event) {
    event.preventDefault();

    if (!ticketEditor?.ticket) return;

    const ok = await updateTicketStatus(
      ticketEditor.ticket,
      ticketEditor.ticket_status
    );

    if (ok) {
      setTicketEditor(null);
    }
  }

  function downloadTicketQr(ticket) {
    try {
      const svg = qrSvgString(ticket.qr_token);
      const blob = new Blob([svg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${ticket.ticket_number}-QR.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error(downloadError);
      alert("Imeshindikana kupakua QR.");
    }
  }

  function printTicket(ticket) {
    const registration = getRegistration(
      ticket.registration_id
    );
    const payment = getPaymentByRegistration(
      ticket.registration_id
    );
    const qrSvg = qrSvgString(ticket.qr_token);
    const popup = window.open("", "_blank", "noopener,noreferrer");

    if (!popup) {
      alert("Ruhusu popups ili kuchapisha tiketi.");
      return;
    }

    popup.document.write(`<!doctype html><html><head><title>${ticket.ticket_number}</title><style>body{font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:30px}.card{max-width:720px;margin:auto;background:white;border:2px solid #0f5132;border-radius:22px;padding:32px;text-align:center}.brand{font-size:14px;font-weight:800;color:#166534}.number{font-size:34px;margin:10px 0}.qr{width:280px;margin:20px auto}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:left}.item{background:#f8fafc;padding:12px;border-radius:10px}.item small{display:block;color:#64748b}.footer{margin-top:22px;font-size:12px;color:#64748b}@media print{body{background:white;padding:0}.card{border-color:#000}}</style></head><body><div class="card"><div class="brand">${FESTIVAL_NAME}</div><h1 class="number">${ticket.ticket_number}</h1><h2>${registration?.jina_kamili || "Mshiriki"}</h2><div class="qr">${qrSvg}</div><div class="grid"><div class="item"><small>Kifurushi</small><strong>${registration?.package_name || "—"}</strong></div><div class="item"><small>Malipo</small><strong>${payment?.payment_status === "verified" ? "Verified" : paymentStatusLabel(payment?.payment_status)}</strong></div><div class="item"><small>Status</small><strong>${ticket.ticket_status}</strong></div><div class="item"><small>Issued</small><strong>${formatDate(ticket.issued_at)}</strong></div></div><div class="footer">QR hii ni tiketi ya kuingia na inaweza kutumika mara moja tu.</div></div><script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }

  /* =========================================================
     QR CHECK-IN
  ========================================================= */

  async function processQrToken(tokenValue) {
    const token = normalizeQrToken(tokenValue);

    if (!token) {
      setScanResult({
        success: false,
        result: "invalid",
        message: "Weka QR token kwanza.",
      });
      return;
    }

    if (scannerBusyRef.current) return;

    scannerBusyRef.current = true;
    setScanLoading(true);
    setScanResult(null);

    try {
      const { data, error: scanError } =
        await supabase.rpc("check_in_ticket", {
          p_qr_token: token,
        });

      if (scanError) throw scanError;

      setScanResult(data);

      await Promise.all([
        loadTickets(),
        loadTicketScans(),
      ]);

      if (data?.success) {
        setQrToken("");
        stopCameraScanner();
      }
    } catch (scanError) {
      console.error(scanError);
      setScanResult({
        success: false,
        result: "error",
        message:
          scanError.message ||
          "Check-in imeshindikana.",
      });
    } finally {
      setScanLoading(false);
      scannerBusyRef.current = false;
    }
  }

  async function checkInTicket(event) {
    event.preventDefault();
    await processQrToken(qrToken);
  }

  function stopCameraScanner() {
    if (cameraScannerRef.current) {
      try {
        cameraScannerRef.current.stop();
        cameraScannerRef.current.destroy();
      } catch (scannerStopError) {
        console.warn(
          "QR scanner cleanup warning:",
          scannerStopError
        );
      }

      cameraScannerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  async function startCameraScanner() {
    setCameraError("");
    setScanResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera haipatikani kwenye browser hii. Tumia Chrome/Edge/Safari ya kisasa au paste QR token."
      );
      return;
    }

    if (!window.isSecureContext) {
      setCameraError(
        "Camera scanner inahitaji HTTPS. Fungua tovuti kupitia https://leahfashion.co.tz/admin."
      );
      return;
    }

    try {
      stopCameraScanner();

      const hasCamera = await QrScanner.hasCamera();

      if (!hasCamera) {
        throw new Error(
          "Hakuna camera iliyopatikana kwenye kifaa hiki."
        );
      }

      // React needs one paint cycle before the <video> ref exists.
      setCameraActive(true);

      await new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
        )
      );

      if (!videoRef.current) {
        throw new Error(
          "Video scanner haijawa tayari. Jaribu tena."
        );
      }

      const scanner = new QrScanner(
        videoRef.current,
        async (result) => {
          const value =
            typeof result === "string"
              ? result
              : result?.data;

          if (!value || scannerBusyRef.current) {
            return;
          }

          scannerBusyRef.current = true;

          try {
            // Stop immediately after a successful decode so the same QR
            // cannot be submitted repeatedly while the backend responds.
            stopCameraScanner();
            setQrToken(value);
            await processQrToken(value);
          } finally {
            scannerBusyRef.current = false;
          }
        },
        {
          preferredCamera: "environment",
          maxScansPerSecond: 8,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          onDecodeError: () => {},
        }
      );

      cameraScannerRef.current = scanner;
      await scanner.start();
      setCameraActive(true);
    } catch (cameraStartError) {
      console.error(cameraStartError);
      stopCameraScanner();

      const errorName = cameraStartError?.name || "";
      const errorMessage =
        cameraStartError?.message ||
        String(cameraStartError || "");

      if (
        errorName === "NotAllowedError" ||
        /permission|denied|notallowed/i.test(errorMessage)
      ) {
        setCameraError(
          "Ruhusa ya camera imekataliwa. Bonyeza alama ya lock/camera kwenye address bar, ruhusu Camera, kisha jaribu tena."
        );
      } else if (
        errorName === "NotFoundError" ||
        /no camera|not found|hakuna camera/i.test(
          errorMessage
        )
      ) {
        setCameraError(
          "Hakuna camera iliyopatikana kwenye kifaa hiki."
        );
      } else if (
        errorName === "NotReadableError" ||
        /could not start|not readable|in use/i.test(
          errorMessage
        )
      ) {
        setCameraError(
          "Camera inatumika na app nyingine. Funga app nyingine inayotumia camera kisha jaribu tena."
        );
      } else {
        setCameraError(
          errorMessage ||
            "Imeshindikana kuwasha QR camera scanner."
        );
      }
    }
  }

  /* =========================================================
     FILTERS
  ========================================================= */

  const filteredRegistrations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return registrations;
      }

      return registrations.filter(
        (registration) => {
          const fields = [
            registration.jina_kamili,
            registration.jina_biashara,
            registration.namba_simu,
            registration.barua_pepe,
            registration.package_name,
            getAgentName(
              registration.agent_id
            ),
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

  const filteredAgents =
    useMemo(() => {
      const query =
        agentSearch
          .trim()
          .toLowerCase();

      if (!query) return agents;

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
    }, [agents, agentSearch]);

  const filteredPayments =
    useMemo(() => {
      const query =
        paymentSearch
          .trim()
          .toLowerCase();

      return registrations.filter(
        (registration) => {
          const payment =
            getPaymentByRegistration(
              registration.id
            );

          if (!query) {
            return true;
          }

          return [
            registration.jina_kamili,
            registration.namba_simu,
            registration.package_name,
            payment?.payment_method,
            payment?.payment_reference,
            payment?.payment_status,
          ].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      registrations,
      payments,
      paymentSearch,
    ]);

  const filteredTickets =
    useMemo(() => {
      const query =
        ticketSearch
          .trim()
          .toLowerCase();

      if (!query) return tickets;

      return tickets.filter(
        (ticket) => {
          const registration =
            getRegistration(
              ticket.registration_id
            );

          return [
            ticket.ticket_number,
            ticket.qr_token,
            ticket.ticket_status,
            registration?.jina_kamili,
            registration?.namba_simu,
          ].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      tickets,
      registrations,
      ticketSearch,
    ]);

  /* =========================================================
     REPORTING
  ========================================================= */

  const newCount =
    registrations.filter(
      (item) =>
        item.hali_ya_usajili ===
        "mpya"
    ).length;

  const paidCount =
    registrations.filter(
      (item) =>
        item.hali_ya_usajili ===
          "amelipa" ||
        item.hali_ya_usajili ===
          "amethibitishwa"
    ).length;

  const confirmedCount =
    registrations.filter(
      (item) =>
        item.hali_ya_usajili ===
        "amethibitishwa"
    ).length;

  const todayCount =
    registrations.filter(
      (item) =>
        sameDay(item.created_at)
    ).length;

  const activeAgents =
    agents.filter(
      (agent) =>
        agent.is_active
    ).length;

  const verifiedPayments =
    payments.filter(
      (payment) =>
        payment.payment_status ===
        "verified"
    );

  const verifiedRevenue =
    verifiedPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount_paid ||
            payment.amount_due ||
            0
        ),
      0
    );

  const expectedRevenue =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount_due || 0
        ),
      0
    );

  const activeTickets =
    tickets.filter(
      (ticket) =>
        ticket.ticket_status ===
        "active"
    ).length;

  const usedTickets =
    tickets.filter(
      (ticket) =>
        ticket.ticket_status ===
        "used"
    ).length;

  const agentPerformance =
    useMemo(() => {
      return agents
        .map((agent) => {
          const list =
            getAgentRegistrations(
              agent.id
            );

          return {
            ...agent,

            total: list.length,

            today:
              list.filter(
                (registration) =>
                  sameDay(
                    registration.created_at
                  )
              ).length,

            paid:
              list.filter(
                (registration) => {
                  const payment =
                    getPaymentByRegistration(
                      registration.id
                    );

                  return (
                    payment?.payment_status ===
                    "verified"
                  );
                }
              ).length,
          };
        })
        .sort(
          (a, b) =>
            b.total - a.total
        );
    }, [
      agents,
      registrations,
      payments,
    ]);

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="loading-page">
          Inapakia mfumo...
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
        <style>{styles}</style>

        <main className="auth-page">
          <section className="auth-card">
            <div className="badge admin">
              ADMIN
            </div>

            <h1>
              {FESTIVAL_NAME}
            </h1>

            <h2>
              Mfumo wa Usimamizi
            </h2>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <form onSubmit={login}>
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
                  required
                />
              </label>

              <button
                className="primary wide"
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
        <style>{styles}</style>

        <main className="auth-page">
          <section className="auth-card">
            <div className="badge secure">
              MFA SECURITY
            </div>

            <h1>
              Admin Security
            </h1>

            {mfaStage ===
              "enroll" && (
              <>
                <p>
                  Scan QR hii kwa
                  Google Authenticator,
                  Microsoft
                  Authenticator au
                  authenticator app.
                </p>

                {mfaQrCode && (
                  <div className="mfa-qr">
                    <img
                      src={
                        mfaQrCode
                      }
                      alt="MFA QR"
                    />
                  </div>
                )}

                {mfaSecret && (
                  <div className="secret">
                    <small>
                      Manual key
                    </small>

                    <code>
                      {
                        mfaSecret
                      }
                    </code>
                  </div>
                )}
              </>
            )}

            {mfaStage ===
              "verify" && (
              <p>
                Weka namba 6 kutoka
                Authenticator app.
              </p>
            )}

            {error && (
              <div className="error">
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
                  className="mfa-input"
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
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
              </label>

              <button
                className="primary wide"
                disabled={
                  mfaLoading ||
                  mfaCode.length !==
                    6
                }
              >
                {mfaLoading
                  ? "INATHIBITISHA..."
                  : "THIBITISHA MFA"}
              </button>
            </form>

            <button
              className="secondary wide"
              onClick={logout}
            >
              Toka
            </button>
          </section>
        </main>
      </>
    );
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  return (
    <>
      <style>{styles}</style>

      <main className="dashboard">
        <header className="header">
          <div>
            <small>
              {FESTIVAL_NAME.toUpperCase()}
            </small>

            <h1>
              Dashibodi ya
              Usimamizi
            </h1>

            <span className="mfa-secured">
              ● MFA Secured
            </span>
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
              onClick={
                loadEverything
              }
            >
              {dataLoading
                ? "Inapakia..."
                : "↻ Refresh"}
            </button>

            <button
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

        <nav className="tabs">
          {[
            [
              "registrations",
              "Washiriki",
            ],
            ["agents", "Agents"],
            [
              "packages",
              "Vifurushi",
            ],
            ["payments", "Malipo"],
            ["tickets", "Tiketi"],
            [
              "checkin",
              "QR Check-in",
            ],
            ["reports", "Ripoti"],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                className={
                  tab === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab(value)
                }
              >
                {label}
              </button>
            )
          )}
        </nav>

        {/* ================= WASHIRIKI ================= */}

        {tab ===
          "registrations" && (
          <>
            <section className="stats">
              <Stat
                label="Washiriki Wote"
                value={
                  registrations.length
                }
              />

              <Stat
                label="Usajili Mpya"
                value={
                  newCount
                }
              />

              <Stat
                label="Wamelipa"
                value={
                  paidCount
                }
              />

              <Stat
                label="Wamethibitishwa"
                value={
                  confirmedCount
                }
              />
            </section>

            <Panel>
              <PanelHeader
                title="Orodha ya Washiriki"
                subtitle="Simamia usajili wote wa festival."
                onRefresh={
                  loadRegistrations
                }
              />

              <SearchBar
                value={search}
                onChange={
                  setSearch
                }
                placeholder="Tafuta jina, simu, biashara, kifurushi au agent..."
                count={
                  filteredRegistrations.length
                }
                label="washiriki"
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Jina</th>
                      <th>
                        Biashara
                      </th>
                      <th>Simu</th>
                      <th>Agent</th>
                      <th>
                        Kifurushi
                      </th>
                      <th>Bei</th>
                      <th>Hali</th>
                      <th>Vitendo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRegistrations.map(
                      (
                        registration
                      ) => {
                        const payment =
                          getPaymentByRegistration(
                            registration.id
                          );

                        const ticket =
                          getTicketByRegistration(
                            registration.id
                          );

                        return (
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
                              {registration.agent_id
                                ? getAgentName(
                                    registration.agent_id
                                  )
                                : "Public"}
                            </td>

                            <td>
                              {registration.package_name ||
                                "—"}
                            </td>

                            <td>
                              TSh{" "}
                              {money(
                                registration.package_price
                              )}
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
                              <div className="actions">
                                <button
                                  onClick={() =>
                                    setSelectedRegistration(
                                      registration
                                    )
                                  }
                                >
                                  Angalia
                                </button>

                                <button
                                  onClick={() =>
                                    openPaymentEditor(
                                      registration
                                    )
                                  }
                                >
                                  Malipo
                                </button>

                                {payment?.payment_status ===
                                  "verified" &&
                                  !ticket && (
                                    <button
                                      onClick={() =>
                                        issueTicket(
                                          registration
                                        )
                                      }
                                    >
                                      Toa Tiketi
                                    </button>
                                  )}

                                {ticket && (
                                  <button
                                    onClick={() =>
                                      setSelectedTicket(
                                        ticket
                                      )
                                    }
                                  >
                                    Tiketi
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* ================= AGENTS ================= */}

        {tab === "agents" && (
          <>
            <section className="stats">
              <Stat
                label="Agents Wote"
                value={
                  agents.length
                }
              />

              <Stat
                label="Active Agents"
                value={
                  activeAgents
                }
              />

              <Stat
                label="Usajili Leo"
                value={
                  todayCount
                }
              />

              <Stat
                label="Kupitia Agents"
                value={
                  registrations.filter(
                    (item) =>
                      item.agent_id
                  ).length
                }
              />
            </section>

            <Panel>
              <PanelHeader
                title="Agents"
                subtitle="Simamia agents na performance zao."
                onRefresh={
                  loadAgents
                }
              />

              <SearchBar
                value={
                  agentSearch
                }
                onChange={
                  setAgentSearch
                }
                placeholder="Tafuta agent..."
                count={
                  filteredAgents.length
                }
                label="agents"
              />

              <div className="cards-grid">
                {filteredAgents.map(
                  (agent) => {
                    const list =
                      getAgentRegistrations(
                        agent.id
                      );

                    return (
                      <article
                        className="card"
                        key={
                          agent.id
                        }
                      >
                        <div className="card-top">
                          <div>
                            <StatusBadge
                              active={
                                agent.is_active
                              }
                            />

                            <h3>
                              {agent.full_name ||
                                "Agent"}
                            </h3>
                          </div>

                          <strong className="large-number">
                            {
                              list.length
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

                        <div className="mini-stats">
                          <div>
                            <span>
                              Jumla
                            </span>

                            <strong>
                              {
                                list.length
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Leo
                            </span>

                            <strong>
                              {
                                list.filter(
                                  (
                                    registration
                                  ) =>
                                    sameDay(
                                      registration.created_at
                                    )
                                ).length
                              }
                            </strong>
                          </div>
                        </div>

                        <div className="actions">
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
                                ? "danger"
                                : "success"
                            }
                            onClick={() =>
                              toggleAgent(
                                agent
                              )
                            }
                          >
                            {agent.is_active
                              ? "Zima"
                              : "Washa"}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </Panel>
          </>
        )}

        {/* ================= PACKAGES ================= */}

        {tab ===
          "packages" && (
          <>
            <Panel>
              <PanelHeader
                title={
                  editingPackageId
                    ? "Hariri Kifurushi"
                    : "Ongeza Kifurushi"
                }
                subtitle="Simamia bei na vifurushi."
              />

              <form
                className="form-grid"
                onSubmit={
                  savePackage
                }
              >
                <Field
                  label="Jina la Kifurushi *"
                >
                  <input
                    value={
                      packageForm.name
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        name:
                          event.target
                            .value,
                      })
                    }
                    required
                  />
                </Field>

                <Field label="Sekta / Aina">
                  <input
                    value={
                      packageForm.category
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        category:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field label="Ukubwa wa Tenti / Eneo">
                  <input
                    value={
                      packageForm.tent_size
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        tent_size:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field label="Bei (TSh) *">
                  <input
                    type="number"
                    min="0"
                    value={
                      packageForm.price
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        price:
                          event.target
                            .value,
                      })
                    }
                    required
                  />
                </Field>

                <Field label="VAT">
                  <input
                    value={
                      packageForm.vat_note
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        vat_note:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field label="Participant Limit">
                  <input
                    type="number"
                    value={
                      packageForm.participant_limit
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        participant_limit:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field
                  label="Maelezo"
                  wide
                >
                  <textarea
                    rows="4"
                    value={
                      packageForm.description
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        description:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field
                  label="Inajumuisha"
                  wide
                >
                  <textarea
                    rows="4"
                    value={
                      packageForm.included_items
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        included_items:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <Field label="Display Order">
                  <input
                    type="number"
                    value={
                      packageForm.display_order
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        display_order:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={
                      packageForm.is_active
                    }
                    onChange={(event) =>
                      setPackageForm({
                        ...packageForm,
                        is_active:
                          event.target
                            .checked,
                      })
                    }
                  />

                  Kinaonekana kwa
                  waombaji
                </label>

                <div className="form-actions wide">
                  <button
                    className="primary"
                    disabled={
                      savingPackage
                    }
                  >
                    {savingPackage
                      ? "Inahifadhi..."
                      : editingPackageId
                      ? "HIFADHI"
                      : "ONGEZA"}
                  </button>

                  {editingPackageId && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        cancelPackageEdit
                      }
                    >
                      Ghairi
                    </button>
                  )}
                </div>
              </form>
            </Panel>

            <Panel>
              <PanelHeader
                title="Vifurushi"
                subtitle="Vifurushi vinavyoonekana kwenye fomu."
                onRefresh={
                  loadPackages
                }
              />

              <div className="cards-grid">
                {packages.map(
                  (pkg) => (
                    <article
                      className="card"
                      key={
                        pkg.id
                      }
                    >
                      <StatusBadge
                        active={
                          pkg.is_active
                        }
                      />

                      <h3>
                        {pkg.name}
                      </h3>

                      <strong className="price">
                        TSh{" "}
                        {money(
                          pkg.price
                        )}
                      </strong>

                      <p>
                        {pkg.description ||
                          "—"}
                      </p>

                      <div className="actions">
                        <button
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
                              ? "danger"
                              : "success"
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
            </Panel>
          </>
        )}

        {/* ================= PAYMENTS ================= */}

        {tab ===
          "payments" && (
          <>
            <section className="stats">
              <Stat
                label="Payment Records"
                value={
                  payments.length
                }
              />

              <Stat
                label="Verified"
                value={
                  verifiedPayments.length
                }
              />

              <Stat
                label="Expected"
                value={`TSh ${money(
                  expectedRevenue
                )}`}
              />

              <Stat
                label="Verified Revenue"
                value={`TSh ${money(
                  verifiedRevenue
                )}`}
              />
            </section>

            <Panel>
              <PanelHeader
                title="Malipo"
                subtitle="Tengeneza, tuma na hakiki malipo."
                onRefresh={
                  loadPayments
                }
              />

              <SearchBar
                value={
                  paymentSearch
                }
                onChange={
                  setPaymentSearch
                }
                placeholder="Tafuta mshiriki, reference, method..."
                count={
                  filteredPayments.length
                }
                label="washiriki"
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mshiriki</th>
                      <th>
                        Kifurushi
                      </th>
                      <th>
                        Amount Due
                      </th>
                      <th>
                        Amount Paid
                      </th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Reference</th>
                      <th>Vitendo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map(
                      (
                        registration
                      ) => {
                        const payment =
                          getPaymentByRegistration(
                            registration.id
                          );

                        return (
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
                                {
                                  registration.namba_simu
                                }
                              </small>
                            </td>

                            <td>
                              {registration.package_name ||
                                "—"}
                            </td>

                            <td>
                              TSh{" "}
                              {money(
                                payment?.amount_due ??
                                  registration.package_price
                              )}
                            </td>

                            <td>
                              TSh{" "}
                              {money(
                                payment?.amount_paid
                              )}
                            </td>

                            <td>
                              {payment?.payment_method ||
                                "—"}
                            </td>

                            <td>
                              {payment
                                ? paymentStatusLabel(
                                    payment.payment_status
                                  )
                                : "Hakuna Record"}
                            </td>

                            <td>
                              {payment?.payment_reference ||
                                "—"}
                            </td>

                            <td>
                              <div className="actions">
                                <button
                                  onClick={() =>
                                    openPaymentEditor(
                                      registration
                                    )
                                  }
                                >
                                  {payment
                                    ? "Hariri"
                                    : "Tengeneza"}
                                </button>

                                {payment && (
                                  <>
                                    <button
                                      onClick={() =>
                                        sendPaymentSms(
                                          registration,
                                          payment
                                        )
                                      }
                                    >
                                      SMS
                                    </button>

                                    <button
                                      onClick={() =>
                                        openPaymentWhatsApp(
                                          registration,
                                          payment
                                        )
                                      }
                                    >
                                      WhatsApp
                                    </button>

                                    {payment.payment_status !==
                                      "verified" && (
                                      <button
                                        className="success"
                                        onClick={() =>
                                          setPaymentStatus(
                                            payment,
                                            "verified"
                                          )
                                        }
                                      >
                                        Verify
                                      </button>
                                    )}

                                    {payment.payment_status ===
                                      "verified" &&
                                      !getTicketByRegistration(
                                        registration.id
                                      ) && (
                                        <button
                                          onClick={() =>
                                            issueTicket(
                                              registration
                                            )
                                          }
                                        >
                                          Toa Tiketi
                                        </button>
                                      )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* ================= TICKETS ================= */}

        {tab ===
          "tickets" && (
          <>
            <section className="stats">
              <Stat
                label="Tiketi Zote"
                value={
                  tickets.length
                }
              />

              <Stat
                label="Active"
                value={
                  activeTickets
                }
              />

              <Stat
                label="Checked In"
                value={
                  usedTickets
                }
              />

              <Stat
                label="Remaining"
                value={
                  activeTickets
                }
              />
            </section>

            <Panel>
              <PanelHeader
                title="Tiketi"
                subtitle="Tiketi zinazotolewa baada ya malipo kuhakikiwa."
                onRefresh={
                  loadTickets
                }
              />

              <SearchBar
                value={
                  ticketSearch
                }
                onChange={
                  setTicketSearch
                }
                placeholder="Ticket number, QR token, jina..."
                count={
                  filteredTickets.length
                }
                label="tiketi"
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Ticket No.
                      </th>
                      <th>Mshiriki</th>
                      <th>Status</th>
                      <th>
                        Issued
                      </th>
                      <th>
                        Check-in
                      </th>
                      <th>Vitendo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTickets.map(
                      (ticket) => {
                        const registration =
                          getRegistration(
                            ticket.registration_id
                          );

                        return (
                          <tr
                            key={
                              ticket.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  ticket.ticket_number
                                }
                              </strong>
                            </td>

                            <td>
                              {registration?.jina_kamili ||
                                "—"}

                              <small>
                                {registration?.namba_simu ||
                                  ""}
                              </small>
                            </td>

                            <td>
                              {
                                ticket.ticket_status
                              }
                            </td>

                            <td>
                              {formatDate(
                                ticket.issued_at
                              )}
                            </td>

                            <td>
                              {ticket.checked_in_at
                                ? formatDate(
                                    ticket.checked_in_at
                                  )
                                : "—"}
                            </td>

                            <td>
                              <div className="actions">
                                <button
                                  onClick={() =>
                                    setSelectedTicket(
                                      ticket
                                    )
                                  }
                                >
                                  Angalia
                                </button>

                                <button
                                  onClick={() =>
                                    copyTicketToken(
                                      ticket
                                    )
                                  }
                                >
                                  Copy QR
                                </button>

                                <button
                                  onClick={() =>
                                    sendTicketSms(
                                      ticket
                                    )
                                  }
                                >
                                  SMS
                                </button>

                                <button
                                  onClick={() =>
                                    sendTicketWhatsApp(
                                      ticket
                                    )
                                  }
                                >
                                  WhatsApp
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* ================= QR CHECK-IN ================= */}

        {tab ===
          "checkin" && (
          <>
            <Panel>
              <div className="checkin">
                <div className="checkin-icon">
                  QR
                </div>

                <h2>
                  QR Ticket Check-in
                </h2>

                <p>
                  Scan QR kwa camera
                  au paste QR token.
                  Tiketi halali
                  itatumika mara moja
                  tu.
                </p>

                <div className="camera-actions">
                  {!cameraActive ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={startCameraScanner}
                    >
                      📷 WASHAA CAMERA SCANNER
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger"
                      onClick={stopCameraScanner}
                    >
                      ZIMA CAMERA
                    </button>
                  )}
                </div>

                {cameraActive && (
                  <div className="camera-scanner">
                    <video
                      ref={videoRef}
                      muted
                      playsInline
                    />
                    <div className="camera-guide">
                      <span />
                    </div>
                    <small>
                      Elekeza QR code ndani ya fremu.
                    </small>
                  </div>
                )}

                {cameraError && (
                  <div className="camera-error">
                    {cameraError}
                  </div>
                )}

                <form
                  onSubmit={
                    checkInTicket
                  }
                >
                  <input
                    autoFocus
                    value={
                      qrToken
                    }
                    onChange={(event) =>
                      setQrToken(
                        event.target.value
                      )
                    }
                    placeholder="Paste / scan QR token"
                  />

                  <button
                    className="primary"
                    disabled={
                      scanLoading
                    }
                  >
                    {scanLoading
                      ? "INAKAGUA..."
                      : "CHECK IN"}
                  </button>
                </form>

                {scanResult && (
                  <div
                    className={`scan-result ${
                      scanResult.success
                        ? "valid"
                        : "invalid"
                    }`}
                  >
                    <strong>
                      {scanResult.success
                        ? "✓ TIKETI HALALI"
                        : "✕ IMEKATALIWA"}
                    </strong>

                    <p>
                      Result:{" "}
                      {
                        scanResult.result
                      }
                    </p>

                    {scanResult.ticket_number && (
                      <p>
                        Ticket:{" "}
                        {
                          scanResult.ticket_number
                        }
                      </p>
                    )}

                    {scanResult.checked_in_at && (
                      <p>
                        Ilitumika:{" "}
                        {formatDate(
                          scanResult.checked_in_at
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Recent Scans"
                subtitle="Audit trail ya scans za hivi karibuni."
                onRefresh={
                  loadTicketScans
                }
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tarehe</th>
                      <th>Ticket</th>
                      <th>Result</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ticketScans.map(
                      (scan) => {
                        const ticket =
                          tickets.find(
                            (item) =>
                              item.id ===
                              scan.ticket_id
                          );

                        return (
                          <tr
                            key={
                              scan.id
                            }
                          >
                            <td>
                              {formatDate(
                                scan.created_at
                              )}
                            </td>

                            <td>
                              {ticket?.ticket_number ||
                                "Unknown"}
                            </td>

                            <td>
                              {
                                scan.scan_result
                              }
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* ================= REPORTS ================= */}

        {tab ===
          "reports" && (
          <>
            <section className="stats">
              <Stat
                label="Washiriki"
                value={
                  registrations.length
                }
              />

              <Stat
                label="Verified Payments"
                value={
                  verifiedPayments.length
                }
              />

              <Stat
                label="Tiketi"
                value={
                  tickets.length
                }
              />

              <Stat
                label="Checked In"
                value={
                  usedTickets
                }
              />
            </section>

            <section className="money-grid">
              <article>
                <span>
                  Expected Revenue
                </span>

                <strong>
                  TSh{" "}
                  {money(
                    expectedRevenue
                  )}
                </strong>
              </article>

              <article>
                <span>
                  Verified Revenue
                </span>

                <strong>
                  TSh{" "}
                  {money(
                    verifiedRevenue
                  )}
                </strong>
              </article>

              <article>
                <span>
                  Active Agents
                </span>

                <strong>
                  {activeAgents}
                </strong>
              </article>
            </section>

            <Panel>
              <PanelHeader
                title="Performance ya Agents"
                subtitle="Usajili na malipo yaliyohakikiwa."
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Simu</th>
                      <th>Jumla</th>
                      <th>Leo</th>
                      <th>
                        Verified
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
                            {
                              agent.full_name
                            }

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
                            {
                              agent.total
                            }
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
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* ================= REGISTRATION MODAL ================= */}

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

            <div className="info-grid">
              <Info
                label="Biashara"
                value={
                  selectedRegistration.jina_biashara ||
                  "—"
                }
              />

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
                value={`TSh ${money(
                  selectedRegistration.package_price
                )}`}
              />

              <Info
                label="Hali"
                value={statusLabel(
                  selectedRegistration.hali_ya_usajili
                )}
              />
            </div>
          </Modal>
        )}

        {/* ================= AGENT MODAL ================= */}

        {selectedAgent && (
          <Modal
            onClose={() =>
              setSelectedAgent(null)
            }
          >
            <StatusBadge
              active={
                selectedAgent.is_active
              }
            />

            <h2>
              {
                selectedAgent.full_name
              }
            </h2>

            <div className="info-grid">
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
                label="Agent ID"
                value={
                  selectedAgent.id
                }
              />
            </div>
          </Modal>
        )}

        {/* ================= PAYMENT MODAL ================= */}

        {selectedPaymentRegistration && (
          <Modal
            onClose={
              closePaymentEditor
            }
          >
            <h2>
              Malipo —{" "}
              {
                selectedPaymentRegistration.jina_kamili
              }
            </h2>

            <p>
              {
                selectedPaymentRegistration.package_name
              }{" "}
              • TSh{" "}
              {money(
                selectedPaymentRegistration.package_price
              )}
            </p>

            <form
              className="payment-form"
              onSubmit={
                savePayment
              }
            >
              <Field label="Amount Due">
                <input
                  type="number"
                  value={
                    paymentForm.amount_due
                  }
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount_due:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>

              <Field label="Amount Paid">
                <input
                  type="number"
                  value={
                    paymentForm.amount_paid
                  }
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount_paid:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>

              <Field label="Payment Method">
                <input
                  placeholder="M-Pesa / Bank / Cash..."
                  value={
                    paymentForm.payment_method
                  }
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_method:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>

              <Field label="Payment Reference">
                <input
                  value={
                    paymentForm.payment_reference
                  }
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_reference:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>

              <Field
                label="Maelekezo / Notes"
                wide
              >
                <textarea
                  rows="5"
                  placeholder="Mfano: Lipa kupitia M-Pesa namba ... jina ..."
                  value={
                    paymentForm.notes
                  }
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>

              <button
                className="primary wide"
                disabled={
                  paymentSaving
                }
              >
                {paymentSaving
                  ? "INAHIFADHI..."
                  : "HIFADHI MALIPO"}
              </button>
            </form>
          </Modal>
        )}

        {/* ================= TICKET MODAL ================= */}

        {selectedTicket && (
          <Modal
            onClose={() =>
              setSelectedTicket(null)
            }
          >
            {(() => {
              const registration = getRegistration(
                selectedTicket.registration_id
              );
              const payment = getPaymentByRegistration(
                selectedTicket.registration_id
              );

              return (
                <div className="ticket ticket-premium">
                  <div className="ticket-brand-row">
                    <div>
                      <span className="ticket-kicker">OFFICIAL ENTRY TICKET</span>
                      <h2>{FESTIVAL_NAME}</h2>
                    </div>
                    <span
                      className={`ticket-status-badge ${
                        selectedTicket.ticket_status === "active"
                          ? "is-active"
                          : "is-revoked"
                      }`}
                    >
                      {selectedTicket.ticket_status}
                    </span>
                  </div>

                  <div className="ticket-main-grid">
                    <div className="ticket-person">
                      <small>TICKET NUMBER</small>
                      <h1>{selectedTicket.ticket_number}</h1>

                      <small>MSHIRIKI</small>
                      <h3>{registration?.jina_kamili || "Mshiriki"}</h3>

                      <div className="ticket-detail-grid">
                        <Info
                          label="Kifurushi"
                          value={registration?.package_name || "—"}
                        />
                        <Info
                          label="Bei"
                          value={`TSh ${money(
                            payment?.amount_due ??
                              registration?.package_price
                          )}`}
                        />
                        <Info
                          label="Malipo"
                          value={
                            payment?.payment_status === "verified"
                              ? "Verified"
                              : paymentStatusLabel(payment?.payment_status)
                          }
                        />
                        <Info
                          label="Issued"
                          value={formatDate(selectedTicket.issued_at)}
                        />
                        <Info
                          label="Check-in"
                          value={
                            selectedTicket.checked_in_at
                              ? formatDate(selectedTicket.checked_in_at)
                              : "Bado"
                          }
                        />
                      </div>
                    </div>

                    <div className="ticket-qr-panel">
                      <QrCode
                        value={selectedTicket.qr_token}
                        size={270}
                      />
                      <strong>SCAN TO CHECK IN</strong>
                      <small>
                        QR hii ni ya tiketi hii pekee na inaweza kutumika mara moja tu.
                      </small>
                    </div>
                  </div>

                  <div className="ticket-security-note">
                    Secure token imefichwa. Tumia Copy QR Token tu kwa fallback ya scanner.
                  </div>

                  <div className="actions ticket-actions">
                    <button
                      onClick={() => printTicket(selectedTicket)}
                    >
                      🖨 Print / PDF
                    </button>
                    <button
                      onClick={() => downloadTicketQr(selectedTicket)}
                    >
                      ↓ Pakua QR
                    </button>
                    <button
                      onClick={() => copyTicketToken(selectedTicket)}
                    >
                      Copy QR Token
                    </button>
                    <button
                      onClick={() => sendTicketSms(selectedTicket)}
                    >
                      Tuma SMS
                    </button>
                    <button
                      onClick={() => sendTicketWhatsApp(selectedTicket)}
                    >
                      WhatsApp
                    </button>
                    <button
                      className="secondary"
                      onClick={() => openTicketEditor(selectedTicket)}
                    >
                      Hariri Tiketi
                    </button>
                  </div>
                </div>
              );
            })()}
          </Modal>
        )}

        {ticketEditor && (
          <Modal onClose={() => setTicketEditor(null)}>
            <div className="ticket-editor">
              <span className="ticket-kicker">SAFE TICKET EDITOR</span>
              <h2>Hariri {ticketEditor.ticket.ticket_number}</h2>
              <p>
                Kwa usalama, ticket number na QR token haziwezi kuhaririwa hapa.
              </p>

              <form onSubmit={saveTicketEditor}>
                <Field label="Ticket Status">
                  <select
                    value={ticketEditor.ticket_status}
                    onChange={(event) =>
                      setTicketEditor({
                        ...ticketEditor,
                        ticket_status: event.target.value,
                      })
                    }
                  >
                    <option value="active">active</option>
                    <option value="revoked">revoked</option>
                  </select>
                </Field>

                <div className="locked-ticket-fields">
                  <Info
                    label="Ticket Number (locked)"
                    value={ticketEditor.ticket.ticket_number}
                  />
                  <Info
                    label="QR Token"
                    value="•••••••••••••••••••• (locked)"
                  />
                </div>

                <button className="primary wide">
                  HIFADHI MABADILIKO
                </button>
              </form>
            </div>
          </Modal>
        )}

      </main>
    </>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Stat({
  label,
  value,
}) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({
  children,
}) {
  return (
    <section className="panel">
      {children}
    </section>
  );
}

function PanelHeader({
  title,
  subtitle,
  onRefresh,
}) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {subtitle && (
          <p>{subtitle}</p>
        )}
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>
      )}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
  count,
  label,
}) {
  return (
    <div className="searchbar">
      <input
        type="search"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
      />

      <span>
        {count} {label}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}) {
  return (
    <label
      className={
        wide ? "wide" : ""
      }
    >
      <strong>{label}</strong>
      {children}
    </label>
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

function StatusBadge({
  active,
}) {
  return (
    <span
      className={
        active
          ? "status active"
          : "status inactive"
      }
    >
      {active
        ? "ACTIVE"
        : "INACTIVE"}
    </span>
  );
}

function Modal({
  children,
  onClose,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <section
        className="modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className="modal-close"
          onClick={onClose}
        >
          ×
        </button>

        {children}
      </section>
    </div>
  );
}

/* =========================================================
   CSS
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f3f5f4;
  color: #17201b;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.loading-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #14532d;
}

/* AUTH */

.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    linear-gradient(
      135deg,
      #071b10,
      #14532d
    );
}

.auth-card {
  width: min(480px,100%);
  padding: 34px;
  border-radius: 20px;
  background: white;
  box-shadow:
    0 30px 90px
    rgba(0,0,0,.30);
}

.auth-card h1 {
  color: #14532d;
}

.auth-card label {
  display: block;
  margin: 17px 0;
  font-weight: 800;
}

.auth-card input {
  width: 100%;
  margin-top: 7px;
  padding: 13px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
}

.mfa-input {
  text-align: center;
  font-size: 24px !important;
  letter-spacing: .25em;
  font-weight: 900;
}

.mfa-qr {
  display: grid;
  place-items: center;
  padding: 18px;
  background: #f9fafb;
  border-radius: 14px;
}

.mfa-qr img {
  width: min(260px,100%);
}

.secret {
  margin: 14px 0;
  padding: 13px;
  background: #f3f4f6;
  border-radius: 9px;
}

.secret small {
  display: block;
  color: #6b7280;
}

.secret code {
  display: block;
  overflow-wrap: anywhere;
  margin-top: 5px;
}

.back-link {
  display: block;
  text-align: center;
  margin-top: 18px;
  color: #166534;
  text-decoration: none;
}

.error,
.top-error {
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  border-radius: 9px;
}

.top-error {
  margin: 20px max(20px,5vw) 0;
}

/* HEADER */

.header {
  background: #14532d;
  color: white;
  padding: 22px max(20px,5vw);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header h1 {
  margin: 5px 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.header-actions a,
.header-actions button {
  padding: 10px 13px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.10);
  color: white;
  text-decoration: none;
}

.mfa-secured {
  font-size: 11px;
  color: #bbf7d0;
}

/* TABS */

.tabs {
  display: flex;
  gap: 9px;
  padding: 20px max(20px,5vw) 0;
  overflow-x: auto;
}

.tabs button {
  border: 0;
  border-radius: 9px;
  padding: 11px 17px;
  white-space: nowrap;
  font-weight: 800;
}

.tabs .active {
  background: #166534;
  color: white;
}

/* STATS */

.stats {
  padding: 24px max(20px,5vw);
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 14px;
}

.stat {
  background: white;
  border-radius: 13px;
  padding: 19px;
  border: 1px solid #e5e7eb;
}

.stat span {
  color: #6b7280;
}

.stat strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  color: #14532d;
}

/* PANEL */

.panel {
  margin: 24px max(20px,5vw);
  padding: 22px;
  border-radius: 15px;
  background: white;
  border: 1px solid #e5e7eb;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.panel-header h2 {
  margin: 0 0 5px;
}

.panel-header p {
  margin: 0;
  color: #6b7280;
}

.panel-header > button {
  border: 1px solid #d1d5db;
  background: white;
  padding: 9px 12px;
  border-radius: 8px;
}

/* SEARCH */

.searchbar {
  margin: 20px 0;
  display: flex;
  justify-content: space-between;
  gap: 15px;
  align-items: center;
}

.searchbar input {
  width: min(520px,100%);
  padding: 11px 13px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
}

.searchbar span {
  color: #6b7280;
}

/* TABLE */

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
}

th,
td {
  padding: 13px 9px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: middle;
}

th {
  font-size: 13px;
}

td small {
  display: block;
  color: #6b7280;
  margin-top: 4px;
}

td select {
  min-width: 180px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.actions {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.actions button,
.actions a {
  border: 0;
  border-radius: 7px;
  background: #166534;
  color: white;
  padding: 8px 10px;
  text-decoration: none;
}

.actions .danger,
.danger {
  background: #fee2e2;
  color: #991b1b;
}

.actions .success,
.success {
  background: #dcfce7;
  color: #166534;
}

/* CARDS */

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 15px;
  margin-top: 20px;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 13px;
  padding: 18px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.large-number {
  font-size: 30px;
  color: #14532d;
}

.status {
  display: inline-block;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 900;
}

.status.active {
  background: #dcfce7;
  color: #166534;
}

.status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.mini-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin: 15px 0;
}

.mini-stats div {
  background: #f9fafb;
  padding: 11px;
  border-radius: 8px;
}

.mini-stats span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.mini-stats strong {
  font-size: 21px;
  color: #14532d;
}

.price {
  display: block;
  color: #14532d;
  font-size: 22px;
}

/* FORMS */

.form-grid,
.payment-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 20px;
}

.form-grid label,
.payment-form label {
  display: block;
}

.form-grid input,
.form-grid textarea,
.payment-form input,
.payment-form textarea {
  width: 100%;
  margin-top: 7px;
  padding: 11px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.wide {
  grid-column: 1 / -1;
}

.checkbox {
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.checkbox input {
  width: auto;
  margin: 0;
}

.form-actions {
  display: flex;
  gap: 9px;
}

.primary,
.secondary {
  border: 0;
  border-radius: 8px;
  padding: 11px 14px;
  font-weight: 800;
}

.primary {
  background: #166534;
  color: white;
}

.secondary {
  background: #e5e7eb;
  color: #374151;
}

/* CHECKIN */

.checkin {
  width: min(650px,100%);
  margin: auto;
  text-align: center;
  padding: 30px 10px;
}

.checkin-icon {
  margin: auto;
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: #14532d;
  color: white;
  font-weight: 900;
  font-size: 20px;
}

.checkin form {
  display: flex;
  gap: 8px;
  margin-top: 22px;
}

.checkin input {
  flex: 1;
  padding: 14px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
}

.scan-result {
  margin-top: 20px;
  border-radius: 12px;
  padding: 20px;
}

.scan-result.valid {
  background: #dcfce7;
  color: #166534;
}

.scan-result.invalid {
  background: #fee2e2;
  color: #991b1b;
}

/* MONEY */

.money-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 14px;
  margin: 0 max(20px,5vw) 24px;
}

.money-grid article {
  background: #14532d;
  color: white;
  border-radius: 13px;
  padding: 20px;
}

.money-grid span {
  opacity: .8;
}

.money-grid strong {
  display: block;
  margin-top: 8px;
  font-size: 25px;
}

/* MODAL */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0,0,0,.58);
  padding: 20px;
  display: grid;
  place-items: center;
}

.modal {
  position: relative;
  width: min(780px,100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 27px;
  background: white;
  border-radius: 17px;
}

.modal-close {
  position: absolute;
  top: 9px;
  right: 15px;
  border: 0;
  background: none;
  font-size: 30px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
  margin-top: 18px;
}

.info {
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
}

.info span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.info strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

/* TICKET */

.ticket {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.badge.admin {
  background: #facc15;
}

.badge.secure {
  background: #dcfce7;
  color: #166534;
}

.qr-token-box {
  margin: 20px 0;
  padding: 18px;
  border: 2px dashed #166534;
  border-radius: 12px;
  background: #f0fdf4;
}

.qr-token-box small {
  display: block;
  color: #166534;
  font-weight: 800;
  margin-bottom: 8px;
}

.qr-token-box code {
  display: block;
  overflow-wrap: anywhere;
  font-size: 16px;
}

.ticket-actions {
  justify-content: center;
  margin-top: 20px;
}


.ticket-premium {
  text-align: left;
}

.ticket-brand-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #e5e7eb;
}

.ticket-brand-row h2 {
  margin: 5px 0 0;
}

.ticket-kicker {
  display: inline-block;
  color: #166534;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.ticket-status-badge {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.ticket-status-badge.is-active {
  background: #dcfce7;
  color: #166534;
}

.ticket-status-badge.is-revoked {
  background: #fee2e2;
  color: #991b1b;
}

.ticket-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 28px;
  padding: 24px 0;
}

.ticket-person > small {
  color: #64748b;
  font-weight: 800;
}

.ticket-person h1 {
  margin: 4px 0 22px;
  font-size: 36px;
}

.ticket-person h3 {
  margin: 4px 0 20px;
  font-size: 24px;
}

.ticket-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ticket-qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1fae5;
  background: #f0fdf4;
  border-radius: 18px;
  padding: 18px;
  text-align: center;
}

.ticket-qr-panel strong {
  margin-top: 10px;
  color: #14532d;
}

.ticket-qr-panel small {
  margin-top: 6px;
  color: #64748b;
}

.ticket-qr-svg {
  max-width: 100%;
  height: auto;
  background: white;
  border-radius: 12px;
}

.ticket-security-note {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
}

.ticket-editor form {
  margin-top: 18px;
}

.ticket-editor select {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
}

.locked-ticket-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px 0;
}

.camera-actions {
  display: flex;
  justify-content: center;
  margin: 18px 0 12px;
}

.camera-scanner {
  position: relative;
  max-width: 620px;
  margin: 0 auto 18px;
  border-radius: 18px;
  overflow: hidden;
  background: #0b1f14;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.16);
}

.camera-scanner video {
  display: block;
  width: 100%;
  min-height: 300px;
  object-fit: cover;
}

.camera-guide {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.camera-guide span {
  width: min(62%, 300px);
  aspect-ratio: 1;
  border: 3px solid #4ade80;
  border-radius: 18px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.28);
}

.camera-scanner > small {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  color: white;
  font-weight: 700;
  text-align: center;
  text-shadow: 0 1px 3px black;
}

.camera-error {
  max-width: 620px;
  margin: 0 auto 14px;
  padding: 12px;
  border-radius: 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
}

/* RESPONSIVE */

@media (max-width: 1000px) {
  .cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 800px) {
  .ticket-main-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats,
  .money-grid,
  .form-grid,
  .payment-form {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .ticket-brand-row {
    flex-direction: column;
  }

  .ticket-detail-grid,
  .locked-ticket-fields {
    grid-template-columns: 1fr;
  }

  .ticket-person h1 {
    font-size: 28px;
  }

  .stats,
  .money-grid,
  .cards-grid,
  .form-grid,
  .payment-form,
  .info-grid {
    grid-template-columns: 1fr;
  }

  .wide {
    grid-column: auto;
  }

  .searchbar,
  .checkin form {
    flex-direction: column;
    align-items: stretch;
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
