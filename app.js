const STORAGE_KEY = "la_marrana_mvp_v1";

const state = loadState();

const $ = (id) => document.getElementById(id);
const on = (id, event, handler) => {
  const element = $(id);
  if (element) element.addEventListener(event, handler);
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const defaultState = {
    ingresoActual: 0,
    proximaFechaPago: "",
    ahorroTotal: 0,
    pagos: [],
    gastos: [],
    movimientosLana: [],
    ahorros: [],
    prestamos: []
  };

  if (!raw) return defaultState;

  try {
    const saved = JSON.parse(raw);
    return {
      ...defaultState,
      ...saved,
      ingresoActual: Number(saved.ingresoActual || 0),
      ahorroTotal: Number(saved.ahorroTotal || 0),
      pagos: Array.isArray(saved.pagos) ? saved.pagos : [],
      gastos: Array.isArray(saved.gastos) ? saved.gastos : [],
      movimientosLana: Array.isArray(saved.movimientosLana) ? saved.movimientosLana : [],
      ahorros: Array.isArray(saved.ahorros) ? saved.ahorros : [],
      prestamos: Array.isArray(saved.prestamos) ? saved.prestamos : []
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

function getFechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarTexto(value) {
  return String(value || "").trim().toLowerCase();
}

function getConcepto(selectId, inputId, fallback) {
  const select = $(selectId);
  const input = $(inputId);
  const selected = select ? select.value : "otro";
  const openValue = input ? input.value.trim() : "";

  if (selected === "otro") return openValue || fallback;
  return selected || openValue || fallback;
}

function clearFields(ids) {
  ids.forEach((id) => {
    const element = $(id);
    if (!element) return;
    if (element.tagName === "SELECT") element.value = "otro";
    else element.value = "";
  });
}

function getTotals() {
  const totalGastos = state.gastos.reduce((sum, item) => sum + Number(item.monto), 0);
  const dineroTotal = Number(state.ingresoActual || 0) - totalGastos;
  const dineroDueno = state.pagos.reduce((sum, item) => sum + Number(item.monto), 0);
  const dineroLibre = dineroTotal - dineroDueno;
  const dias = daysUntil(state.proximaFechaPago);
  const gastoDiario = dias > 0 ? dineroLibre / dias : dineroLibre;
  const prestamosPendientes = state.prestamos
    .filter((p) => p.status !== "pagado")
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);

  return { totalGastos, dineroTotal, dineroDueno, dineroLibre, dias, gastoDiario, prestamosPendientes };
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
      mensaje: "Antes de arrancar otro ciclo, revisa qué guardas, qué debes y qué anda prestado."
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

function getTipoMovimiento(movimiento) {
  if (movimiento.tipo === "ingreso_extra") return "ingreso_extra";
  if (movimiento.tipo === "ingreso_base") return "ingreso_base";
  if (movimiento.tipo === "no_recibido") return "no_recibido";
  if (movimiento.tipo === "ahorro") return "ahorro";
  if (movimiento.tipo === "prestamo") return "prestamo";
  if (movimiento.tipo === "prestamo_pagado") return "prestamo_pagado";
  if (movimiento.tipo === "ingreso") {
    return movimiento.nota === "Ya puso" ? "ingreso_base" : "ingreso_extra";
  }
  return movimiento.tipo || "movimiento";
}

function getMovimientoValor(m) {
  const tipo = getTipoMovimiento(m);
  if (["no_recibido", "ahorro", "prestamo"].includes(tipo)) return -Math.abs(Number(m.monto || 0));
  return Math.abs(Number(m.monto || 0));
}

function getEventosSaldo() {
  const eventos = [];

  state.movimientosLana.forEach((m) => {
    eventos.push({
      fecha: m.fecha || getFechaHoy(),
      valor: getMovimientoValor(m),
      tipo: getTipoMovimiento(m)
    });
  });

  state.gastos.forEach((g) => {
    eventos.push({
      fecha: g.fecha || getFechaHoy(),
      valor: -Math.abs(Number(g.monto || 0)),
      tipo: "gasto"
    });
  });

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function getSerieSaldoDiario() {
  const eventos = getEventosSaldo();
  if (!eventos.length) return [];

  const porDia = new Map();
  eventos.forEach((event) => {
    porDia.set(event.fecha, (porDia.get(event.fecha) || 0) + event.valor);
  });

  let acumulado = 0;
  return [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, cambio]) => {
    acumulado += cambio;
    return { fecha, saldo: acumulado };
  });
}

function getGastosPorTipo() {
  const grupos = new Map();
  state.gastos.forEach((g) => {
    const tipo = normalizarTexto(g.nota) || "gasto";
    const etiqueta = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    const monto = Number(g.monto || 0);
    const actual = grupos.get(tipo) || { etiqueta, monto: 0 };
    actual.monto += monto;
    grupos.set(tipo, actual);
  });

  return [...grupos.values()].sort((a, b) => b.monto - a.monto).slice(0, 6);
}

function clearCanvas(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(rect.width * ratio, 1);
  canvas.height = Math.max(Number(canvas.getAttribute("height") || 180) * ratio, 1);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, canvas.height / ratio);
  return { ctx, width: rect.width, height: canvas.height / ratio };
}

function drawEmptyChart(canvasId, mensaje) {
  const canvas = $(canvasId);
  const info = clearCanvas(canvas);
  if (!info) return;
  const { ctx, width, height } = info;
  ctx.fillStyle = "#74584f";
  ctx.font = "700 14px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(mensaje, width / 2, height / 2);
}

function drawSaldoChart() {
  const data = getSerieSaldoDiario();
  if (data.length < 2) {
    drawEmptyChart("graficaSaldo", "Con dos días de movimientos ya se empieza a ver la historia.");
    return;
  }

  const info = clearCanvas($("graficaSaldo"));
  if (!info) return;
  const { ctx, width, height } = info;
  const pad = 28;
  const values = data.map((d) => d.saldo);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  ctx.strokeStyle = "rgba(116, 88, 79, .25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  ctx.strokeStyle = "#8f3424";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  data.forEach((point, index) => {
    const x = pad + (index / (data.length - 1)) * (width - pad * 2);
    const y = pad + ((max - point.saldo) / range) * (height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#1f120d";
  ctx.font = "800 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(money(data[0].saldo), pad, height - 8);
  ctx.textAlign = "right";
  ctx.fillText(money(data[data.length - 1].saldo), width - pad, 18);
}

function drawGastosChart() {
  const data = getGastosPorTipo();
  if (!data.length) {
    drawEmptyChart("graficaGastos", "Cuando apuntes gastos, aquí se van a acomodar por tipo.");
    return;
  }

  const info = clearCanvas($("graficaGastos"));
  if (!info) return;
  const { ctx, width, height } = info;
  const padX = 16;
  const top = 10;
  const rowH = Math.max((height - top) / data.length, 28);
  const max = Math.max(...data.map((d) => d.monto), 1);

  data.forEach((item, index) => {
    const y = top + index * rowH;
    const barW = ((width - padX * 2) * item.monto) / max;

    ctx.fillStyle = "rgba(143, 52, 36, .12)";
    ctx.fillRect(padX, y + 20, width - padX * 2, 10);

    ctx.fillStyle = "#8f3424";
    ctx.fillRect(padX, y + 20, barW, 10);

    ctx.fillStyle = "#1f120d";
    ctx.font = "800 13px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(item.etiqueta.slice(0, 22), padX, y + 14);

    ctx.fillStyle = "#74584f";
    ctx.textAlign = "right";
    ctx.fillText(money(item.monto), width - padX, y + 14);
  });
}

function renderCharts() {
  requestAnimationFrame(() => {
    drawSaldoChart();
    drawGastosChart();
  });
}

function render() {
  const totals = getTotals();
  const estado = getEstado(totals.dineroLibre, totals.gastoDiario, totals.dias);

  $("dineroTotal").textContent = money(totals.dineroTotal);
  $("dineroDueno").textContent = money(totals.dineroDueno);
  $("dineroLibre").textContent = money(totals.dineroLibre);
  $("gastoDiario").textContent = totals.dias > 0 ? money(totals.gastoDiario) : money(totals.dineroLibre);
  $("ahorroTotal").textContent = money(state.ahorroTotal || 0);
  $("prestamosTotal").textContent = money(totals.prestamosPendientes || 0);

  $("estadoTexto").textContent = estado.titulo;
  $("estadoMensaje").textContent = `${estado.mensaje}${totals.dias ? ` Faltan ${totals.dias} día(s).` : ""}`;

  const mensajeAhorro = $("mensajeAhorro");
  if (mensajeAhorro) {
    mensajeAhorro.textContent = totals.dineroLibre > 0
      ? `Tienes ${money(totals.dineroLibre)} libre. Si quieres salvar una parte, métela aquí.`
      : "Ahorita no hay lana libre. Primero hay que respirar.";
  }

  const statusCard = document.querySelector(".status-card");
  statusCard.className = `card status-card ${estado.clase}`;

  $("proximaFecha").value = state.proximaFechaPago || "";

  const listaAhorros = $("listaAhorros");
  listaAhorros.innerHTML = state.ahorros.length
    ? state.ahorros.slice().reverse().slice(0, 6).map((a) => `
      <li>
        <span>${a.nota || "Guardadito"} · ${a.fecha}</span>
        <strong>+${money(a.monto)}</strong>
      </li>
    `).join("")
    : `<li><span>La Marranita todavía está vacía.</span><strong>${money(0)}</strong></li>`;

  const prestamosPendientes = state.prestamos.filter((p) => p.status !== "pagado");
  $("listaPrestamos").innerHTML = prestamosPendientes.length
    ? prestamosPendientes.slice().reverse().map((p) => {
      const index = state.prestamos.indexOf(p);
      const promesa = p.fechaPromesa ? ` · paga: ${p.fechaPromesa}` : "";
      return `
        <li class="stacked-item">
          <span><strong>${p.persona || "Alguien"}</strong> · ${p.nota || "Préstamo"}${promesa}<br><small>${p.fecha}</small></span>
          <span class="row-actions">
            <strong>${money(p.monto)}</strong>
            <button class="mini" onclick="marcarPrestamoPagado(${index})" aria-label="Marcar como pagado">✓</button>
          </span>
        </li>
      `;
    }).join("")
    : `<li><span>No tienes lana prestada pendiente.</span><strong>${money(0)}</strong></li>`;

  const extras = state.movimientosLana.filter((m) => getTipoMovimiento(m) === "ingreso_extra");
  $("listaExtras").innerHTML = extras.length
    ? extras.slice().reverse().slice(0, 6).map((m) => `
      <li>
        <span>${m.nota || "Extra"} · ${m.fecha}</span>
        <strong>+${money(m.monto)}</strong>
      </li>
    `).join("")
    : `<li><span>Todavía no ha caído extra.</span><strong>${money(0)}</strong></li>`;

  $("listaMovimientosLana").innerHTML = state.movimientosLana.slice().reverse().slice(0, 8).map((m) => {
    const tipo = getTipoMovimiento(m);
    const esDescuento = ["no_recibido", "ahorro", "prestamo"].includes(tipo);
    const signo = esDescuento ? "-" : "+";
    const etiqueta = tipo === "ingreso_base" ? "Ya puso"
      : tipo === "ingreso_extra" ? "Extra"
      : tipo === "ahorro" ? "A La Marranita"
      : tipo === "prestamo" ? "Prestado"
      : tipo === "prestamo_pagado" ? "Me pagaron"
      : "No cayó";

    return `
      <li>
        <span>${etiqueta} · ${m.nota || "Sin nota"} · ${m.fecha}</span>
        <strong>${signo}${money(m.monto)}</strong>
      </li>
    `;
  }).join("");

  $("listaPagos").innerHTML = state.pagos.length
    ? state.pagos.map((p, index) => `
      <li>
        <span>${p.concepto || "Pago"}</span>
        <strong>${money(p.monto)}</strong>
        <button class="mini" onclick="borrarPago(${index})" aria-label="Borrar pago">×</button>
      </li>
    `).join("")
    : `<li><span>Sin pagos apartados todavía.</span><strong>${money(0)}</strong></li>`;

  $("listaGastos").innerHTML = state.gastos.length
    ? state.gastos.slice().reverse().slice(0, 8).map((g) => `
      <li>
        <span>${g.nota || "Gasto"} · ${g.fecha}</span>
        <strong>${money(g.monto)}</strong>
      </li>
    `).join("")
    : `<li><span>Todavía no apuntas gastos.</span><strong>${money(0)}</strong></li>`;

}

window.borrarPago = function(index) {
  state.pagos.splice(index, 1);
  saveState();
};

window.marcarPrestamoPagado = function(index) {
  const prestamo = state.prestamos[index];
  if (!prestamo || prestamo.status === "pagado") return;

  if (!confirm(`¿Ya te pagó ${prestamo.persona || "esa persona"} ${money(prestamo.monto)}?`)) return;

  prestamo.status = "pagado";
  prestamo.fechaPago = getFechaHoy();
  state.ingresoActual = Number(state.ingresoActual || 0) + Number(prestamo.monto || 0);

  state.movimientosLana.push({
    tipo: "prestamo_pagado",
    monto: Number(prestamo.monto || 0),
    nota: `Pagó ${prestamo.persona || "préstamo"}`,
    fecha: getFechaHoy()
  });

  saveState();
};

on("guardarIngreso", "click", () => {
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
    tipo: "ingreso_base",
    monto,
    nota: "Sueldo base",
    fecha: getFechaHoy()
  });

  clearFields(["montoIngreso"]);
  saveState();
});

on("guardarExtra", "click", () => {
  const monto = Number($("montoExtra").value);
  const nota = getConcepto("conceptoExtra", "otroExtra", "Lanita extra");

  if (!monto || monto <= 0) {
    alert("Pon cuánto te cayó de más.");
    return;
  }

  state.ingresoActual = Number(state.ingresoActual || 0) + monto;

  state.movimientosLana.push({
    tipo: "ingreso_extra",
    monto,
    nota,
    fecha: getFechaHoy()
  });

  clearFields(["montoExtra", "conceptoExtra", "otroExtra"]);
  saveState();
});

on("guardarNoRecibido", "click", () => {
  const monto = Number($("montoNoRecibido").value);
  const nota = getConcepto("conceptoNoRecibido", "otroNoRecibido", "Esto no cayó");

  if (!monto || monto <= 0) {
    alert("Pon cuánto no cayó.");
    return;
  }

  state.ingresoActual = Number(state.ingresoActual || 0) - monto;

  state.movimientosLana.push({
    tipo: "no_recibido",
    monto,
    nota,
    fecha: getFechaHoy()
  });

  clearFields(["montoNoRecibido", "conceptoNoRecibido", "otroNoRecibido"]);
  saveState();
});

on("guardarAhorro", "click", () => {
  const monto = Number($("montoAhorro").value);
  const nota = getConcepto("conceptoAhorro", "otroAhorro", "Guardadito");
  const totals = getTotals();

  if (!monto || monto <= 0) {
    alert("Pon cuánto vas a meter al cochinito.");
    return;
  }

  if (monto > totals.dineroTotal) {
    alert("Esa lana no está disponible ahorita. Baja el monto para no descuadrarte.");
    return;
  }

  state.ahorroTotal = Number(state.ahorroTotal || 0) + monto;
  state.ingresoActual = Number(state.ingresoActual || 0) - monto;

  const ahorro = {
    tipo: "ahorro",
    monto,
    nota,
    fecha: getFechaHoy()
  };

  state.ahorros.push(ahorro);
  state.movimientosLana.push(ahorro);
  clearFields(["montoAhorro", "conceptoAhorro", "otroAhorro"]);
  saveState();
});

on("guardarPrestamo", "click", () => {
  const monto = Number($("montoPrestamo").value);
  const persona = $("personaPrestamo").value.trim();
  const nota = getConcepto("conceptoPrestamo", "otroPrestamo", "Préstamo");
  const fechaPromesa = $("fechaPrestamo").value;
  const totals = getTotals();

  if (!monto || monto <= 0) {
    alert("Pon cuánto prestaste.");
    return;
  }

  if (!persona) {
    alert("Pon a quién le prestaste.");
    return;
  }

  if (monto > totals.dineroTotal) {
    alert("No parece que tengas esa lana disponible. Revisa el monto antes de apuntarlo.");
    return;
  }

  const prestamo = {
    monto,
    persona,
    nota,
    fechaPromesa,
    fecha: getFechaHoy(),
    status: "pendiente"
  };

  state.prestamos.push(prestamo);
  state.ingresoActual = Number(state.ingresoActual || 0) - monto;
  state.movimientosLana.push({
    tipo: "prestamo",
    monto,
    nota: `${persona} · ${nota}`,
    fecha: getFechaHoy()
  });

  clearFields(["montoPrestamo", "personaPrestamo", "conceptoPrestamo", "otroPrestamo", "fechaPrestamo"]);
  saveState();
});

on("guardarPago", "click", () => {
  const monto = Number($("montoPago").value);
  const concepto = getConcepto("conceptoPagoSelect", "conceptoPago", "Pago");

  if (!monto || monto <= 0) {
    alert("Pon el monto del pago.");
    return;
  }

  state.pagos.push({
    concepto,
    monto,
    fecha: getFechaHoy()
  });

  clearFields(["montoPago", "conceptoPagoSelect", "conceptoPago"]);
  saveState();
});

on("guardarGasto", "click", () => {
  const monto = Number($("montoGasto").value);
  const nota = getConcepto("notaGastoSelect", "notaGasto", "Gasto");

  if (!monto || monto <= 0) {
    alert("Pon cuánto salió.");
    return;
  }

  state.gastos.push({
    monto,
    nota,
    fecha: getFechaHoy()
  });

  clearFields(["montoGasto", "notaGastoSelect", "notaGasto"]);
  saveState();
});

on("evaluarCompra", "click", () => {
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

on("exportarCSV", "click", () => {
  const rows = [
    ["tipo", "concepto_nota", "monto", "fecha", "persona", "fecha_promesa", "status"],
    ...state.movimientosLana.map(m => {
      const tipo = getTipoMovimiento(m);
      const monto = ["no_recibido", "ahorro", "prestamo"].includes(tipo) ? -Math.abs(Number(m.monto)) : Number(m.monto);
      return [tipo, m.nota, monto, m.fecha, "", "", ""];
    }),
    ...state.pagos.map(p => ["pago_con_dueno", p.concepto, p.monto, p.fecha, "", "", ""]),
    ...state.gastos.map(g => ["gasto", g.nota, -Math.abs(Number(g.monto)), g.fecha, "", "", ""]),
    ...state.prestamos.map(p => ["prestamo_detalle", p.nota, p.monto, p.fecha, p.persona, p.fechaPromesa || "", p.status])
  ];

  const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `la_marrana_${getFechaHoy()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

on("limpiarTodo", "click", () => {
  if (!confirm("¿Seguro que quieres borrar todo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

window.addEventListener("resize", renderCharts);
document.querySelectorAll("details").forEach((section) => {
  section.addEventListener("toggle", renderCharts);
});

render();
