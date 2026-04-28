const STORAGE_KEY = "la_marrana_mvp_v1";

const state = loadState();

const $ = (id) => document.getElementById(id);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const defaultState = {
    ingresoActual: 0,
    proximaFechaPago: "",
    pagos: [],
    gastos: [],
    movimientosLana: []
  };

  if (!raw) return defaultState;

  try {
    const saved = JSON.parse(raw);

    return {
      ...defaultState,
      ...saved,
      ingresoActual: Number(saved.ingresoActual || 0),
      pagos: Array.isArray(saved.pagos) ? saved.pagos : [],
      gastos: Array.isArray(saved.gastos) ? saved.gastos : [],
      movimientosLana: Array.isArray(saved.movimientosLana) ? saved.movimientosLana : []
    };
  } catch (error) {
    return defaultState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  });
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateString) {
  if (!dateString) return 0;
  const target = new Date(dateString + "T00:00:00");
  const diff = target - todayStart();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

function getTotals() {
  const totalGastos = state.gastos.reduce((sum, item) => sum + Number(item.monto), 0);
  const dineroTotal = Number(state.ingresoActual || 0) - totalGastos;
  const dineroDueno = state.pagos.reduce((sum, item) => sum + Number(item.monto), 0);
  const dineroLibre = dineroTotal - dineroDueno;
  const dias = daysUntil(state.proximaFechaPago);
  const gastoDiario = dias > 0 ? dineroLibre / dias : dineroLibre;

  return { totalGastos, dineroTotal, dineroDueno, dineroLibre, dias, gastoDiario };
}

function getEstado(dineroLibre, gastoDiario, dias) {
  if (!state.ingresoActual && !state.proximaFechaPago) {
    return {
      clase: "",
      titulo: "Vamos a repartir la lana",
      mensaje: "Registra cuánto tienes y cuándo te vuelve a caer."
    };
  }

  if (dineroLibre < 0) {
    return {
      clase: "roja",
      titulo: "Zona roja",
      mensaje: "No alcanza si sigues así. Hay que ajustar ya."
    };
  }

  if (dias === 0) {
    return {
      clase: "tranquilo",
      titulo: "Hoy pone la marrana",
      mensaje: "Revisa tus pagos antes de gastar."
    };
  }

  if (gastoDiario >= 250) {
    return {
      clase: "tranquilo",
      titulo: "Vas tranquilo",
      mensaje: "Si sigues así, llegas sin apretarte."
    };
  }

  if (gastoDiario >= 120) {
    return {
      clase: "aguas",
      titulo: "Aguas",
      mensaje: "Todavía alcanzas, pero no te aloques."
    };
  }

  if (gastoDiario >= 50) {
    return {
      clase: "aguante",
      titulo: "Modo aguante",
      mensaje: "Se puede llegar, pero cuidando cada gasto."
    };
  }

  return {
    clase: "roja",
    titulo: "Zona roja",
    mensaje: "Si sigues así, no llegas."
  };
}

function render() {
  const totals = getTotals();
  const estado = getEstado(totals.dineroLibre, totals.gastoDiario, totals.dias);

  $("dineroTotal").textContent = money(totals.dineroTotal);
  $("dineroDueno").textContent = money(totals.dineroDueno);
  $("dineroLibre").textContent = money(totals.dineroLibre);
  $("gastoDiario").textContent = totals.dias > 0 ? money(totals.gastoDiario) : money(totals.dineroLibre);

  $("estadoTexto").textContent = estado.titulo;
  $("estadoMensaje").textContent = `${estado.mensaje}${totals.dias ? ` Faltan ${totals.dias} día(s).` : ""}`;

  const statusCard = document.querySelector(".status-card");
  statusCard.className = `card status-card ${estado.clase}`;

  $("proximaFecha").value = state.proximaFechaPago || "";

  $("listaMovimientosLana").innerHTML = state.movimientosLana.slice().reverse().slice(0, 8).map((m) => {
    const signo = m.tipo === "ingreso" ? "+" : "-";
    const etiqueta = m.tipo === "ingreso" ? "Cayó lana" : "No recibido";
    return `
      <li>
        <span>${etiqueta} · ${m.nota || "Sin nota"} · ${m.fecha}</span>
        <strong>${signo}${money(m.monto)}</strong>
      </li>
    `;
  }).join("");

  $("listaPagos").innerHTML = state.pagos.map((p, index) => `
    <li>
      <span>${p.concepto || "Pago"}</span>
      <strong>${money(p.monto)}</strong>
      <button class="mini" onclick="borrarPago(${index})" aria-label="Borrar pago">×</button>
    </li>
  `).join("");

  $("listaGastos").innerHTML = state.gastos.slice().reverse().slice(0, 8).map((g) => `
    <li>
      <span>${g.nota || "Gasto"} · ${g.fecha}</span>
      <strong>${money(g.monto)}</strong>
    </li>
  `).join("");
}

function addMiniButtonStyle() {
  const style = document.createElement("style");
  style.textContent = `
    .mini {
      width: 34px;
      height: 34px;
      padding: 0;
      border-radius: 50%;
      background: #f1d8cd;
      color: #541c12;
      font-size: 22px;
      line-height: 1;
      flex: 0 0 34px;
    }
  `;
  document.head.appendChild(style);
}

window.borrarPago = function(index) {
  state.pagos.splice(index, 1);
  saveState();
};

$("guardarIngreso").addEventListener("click", () => {
  const monto = Number($("montoIngreso").value);
  const fecha = $("proximaFecha").value;

  if (!monto || monto <= 0) {
    alert("Pon cuánto te cayó.");
    return;
  }

  if (!fecha) {
    alert("Pon cuándo vuelve a poner la marrana.");
    return;
  }

  state.ingresoActual = Number(state.ingresoActual || 0) + monto;
  state.proximaFechaPago = fecha;

  state.movimientosLana.push({
    tipo: "ingreso",
    monto,
    nota: "Ya puso",
    fecha: new Date().toISOString().slice(0, 10)
  });

  $("montoIngreso").value = "";
  saveState();
});

$("guardarNoRecibido").addEventListener("click", () => {
  const monto = Number($("montoNoRecibido").value);
  const nota = $("notaNoRecibido").value.trim();

  if (!monto || monto <= 0) {
    alert("Pon cuánto no llegó.");
    return;
  }

  state.ingresoActual = Number(state.ingresoActual || 0) - monto;

  state.movimientosLana.push({
    tipo: "no_recibido",
    monto,
    nota: nota || "Esto no lo recibí",
    fecha: new Date().toISOString().slice(0, 10)
  });

  $("montoNoRecibido").value = "";
  $("notaNoRecibido").value = "";
  saveState();
});

$("guardarPago").addEventListener("click", () => {
  const concepto = $("conceptoPago").value.trim();
  const monto = Number($("montoPago").value);

  if (!monto || monto <= 0) {
    alert("Pon el monto del pago.");
    return;
  }

  state.pagos.push({
    concepto: concepto || "Pago",
    monto,
    fecha: new Date().toISOString().slice(0, 10)
  });

  $("conceptoPago").value = "";
  $("montoPago").value = "";
  saveState();
});

$("guardarGasto").addEventListener("click", () => {
  const monto = Number($("montoGasto").value);
  const nota = $("notaGasto").value.trim();

  if (!monto || monto <= 0) {
    alert("Pon cuánto salió.");
    return;
  }

  state.gastos.push({
    monto,
    nota: nota || "Gasto",
    fecha: new Date().toISOString().slice(0, 10)
  });

  $("montoGasto").value = "";
  $("notaGasto").value = "";
  saveState();
});

$("evaluarCompra").addEventListener("click", () => {
  const compra = Number($("montoCompra").value);
  const totals = getTotals();

  if (!compra || compra <= 0) {
    $("resultadoCompra").textContent = "Pon cuánto cuesta para checar si te conviene.";
    return;
  }

  const nuevoLibre = totals.dineroLibre - compra;
  const nuevoDiario = totals.dias > 0 ? nuevoLibre / totals.dias : nuevoLibre;
  const estado = getEstado(nuevoLibre, nuevoDiario, totals.dias);

  $("resultadoCompra").textContent =
    `Si lo compras, te quedas con ${money(nuevoLibre)} libres. ` +
    `Eso te deja en ${money(nuevoDiario)} diarios. ${estado.titulo}: ${estado.mensaje}`;
});

$("exportarCSV").addEventListener("click", () => {
  const rows = [
    ["tipo", "concepto_nota", "monto", "fecha"],
    ...state.movimientosLana.map(m => [
      m.tipo === "ingreso" ? "ingreso" : "no_recibido",
      m.nota,
      m.tipo === "ingreso" ? m.monto : -Math.abs(Number(m.monto)),
      m.fecha
    ]),
    ...state.pagos.map(p => ["pago_con_dueno", p.concepto, p.monto, p.fecha]),
    ...state.gastos.map(g => ["gasto", g.nota, g.monto, g.fecha])
  ];

  const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `la_marrana_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

$("limpiarTodo").addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar todo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

addMiniButtonStyle();
render();
