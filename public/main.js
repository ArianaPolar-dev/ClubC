
// main.js para Club Social Canaima - Versión mejorada

let usuarioActual = null;
let reservaEnEdicion = null;

// --- Navegación entre secciones ---
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(sec => sec.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

// --- Manejo de pestañas de autenticación ---
function mostrarFormulario(tipo) {
  const loginContainer = document.getElementById('loginFormContainer');
  const registerContainer = document.getElementById('registerFormContainer');
  const tabs = document.querySelectorAll('.auth-tabs .tab-btn');
  
  // Resetear pestañas
  tabs.forEach(tab => tab.classList.remove('active'));
  
  if (tipo === 'login') {
    loginContainer.style.display = 'block';
    registerContainer.style.display = 'none';
    tabs[0].classList.add('active');
  } else {
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'block';
    tabs[1].classList.add('active');
  }
}

// --- Manejo de pestañas del panel admin ---
function mostrarTabAdmin(tipo) {
  const tabs = document.querySelectorAll('#admin-tabs .tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  
  if (tipo === 'reservas') {
    renderAdminReservas();
  } else if (tipo === 'usuarios') {
    renderAdminUsuarios();
  }
}

// --- Navegación del navbar ---
document.getElementById('btnCatalogo').onclick = () => mostrarSeccion('catalogo');
document.getElementById('btnCalendario').onclick = () => { mostrarSeccion('calendario'); renderCalendario(); };
document.getElementById('btnLogin').onclick = () => mostrarSeccion('login');
document.getElementById('btnReservarSalon').onclick = () => mostrarSeccion('catalogo');

// --- Manejo de sesión ---
document.getElementById('btnCerrarSesion').onclick = () => {
  usuarioActual = null;
  document.getElementById('btnLogin').style.display = '';
  document.getElementById('btnCerrarSesion').style.display = 'none';
  document.getElementById('btnAdmin').style.display = 'none';
  alert('Sesión cerrada exitosamente');
  mostrarSeccion('hero');
};

// Mostrar formulario de reserva desde catálogo
window.abrirReserva = function(salon) {
  mostrarSeccion('reserva');
  document.querySelector('#reservaForm select[name="salon"]').value = salon;
};

// Mostrar disponibilidad desde catálogo
window.verDisponibilidad = function(salon) {
  mostrarSeccion('calendario');
  document.getElementById('filtroSalon').value = salon;
  renderCalendario();
};

// --- API funciones ---
async function registrarUsuario(data) {
  const res = await fetch('/api/registro', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function loginUsuario(data) {
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function crearReserva(data) {
  const res = await fetch('/api/reservas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function consultarReservas(salon, fecha) {
  const params = [];
  if (salon) params.push('salon=' + encodeURIComponent(salon));
  if (fecha) params.push('fecha=' + encodeURIComponent(fecha));
  const url = '/api/reservas' + (params.length ? '?' + params.join('&') : '');
  const res = await fetch(url);
  return await res.json();
}

async function consultarTodasReservas() {
  const res = await fetch('/api/admin/reservas');
  return await res.json();
}

async function cambiarEstadoReserva(id, estado) {
  const res = await fetch('/api/admin/estado', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, estado })
  });
  return await res.json();
}

async function actualizarReserva(id, data) {
  const res = await fetch('/api/admin/actualizar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
}

async function consultarUsuarios() {
  const res = await fetch('/api/admin/usuarios');
  return await res.json();
}

async function obtenerDetallesReserva(id) {
  const res = await fetch(`/api/admin/reserva/${id}`);
  return await res.json();
}

// --- Autenticación ---
document.getElementById("loginForm").onsubmit = async function(e) {
  e.preventDefault();
  const user = this.usuario.value;
  const pass = this.password.value;
  const result = await loginUsuario({ usuario: user, password: pass });
  
  if (result.success) {
    usuarioActual = result.user;
    alert("¡Bienvenido " + usuarioActual.usuario + "!");
    
    // Cambiar botones del navbar
    document.getElementById('btnLogin').style.display = 'none';
    document.getElementById('btnCerrarSesion').style.display = '';
    
    if (usuarioActual.rol === "admin") {
      document.getElementById('btnAdmin').style.display = '';
    }
    
    mostrarSeccion('catalogo');
  } else {
    alert(result.message || "Usuario o contraseña incorrectos");
  }
};

// --- Registro de usuario ---
document.getElementById("registerForm").onsubmit = async function(e) {
  e.preventDefault();
  const nuevoUsuario = {
    usuario: this.usuario.value,
    password: this.password.value,
    rol: this.rol.value,
    correo: this.correo.value
  };
  
  const result = await registrarUsuario(nuevoUsuario);
  if (result.success) {
    alert("Registro exitoso. Ahora puedes iniciar sesión.");
    mostrarFormulario('login');
  } else {
    alert(result.message || "Error al registrar.");
  }
};

// --- Reservas ---
document.getElementById("reservaForm").onsubmit = async function(e) {
  e.preventDefault();
  const reserva = {
    nombre: this.nombre.value,
    cedula: this.cedula.value,
    correo: this.correo.value,
    telefono: this.telefono.value,
    salon: this.salon.value,
    fecha: this.fecha.value,
    hora: this.hora.value,
    servicios: Array.from(this.querySelectorAll('input[name="servicios"]:checked')).map(x => x.value),
    comentarios: this.comentarios.value
  };
  
  const result = await crearReserva(reserva);
  if (result.success) {
    alert("Reserva registrada. Un administrador la confirmará pronto.");
    mostrarSeccion('catalogo');
  } else {
    alert(result.message || "Error al registrar reserva.");
  }
};

// --- Calendario de disponibilidad ---
async function renderCalendario() {
  const cont = document.getElementById('calendario-container');
  cont.innerHTML = "";
  const salonFilter = document.getElementById('filtroSalon').value;
  const fechaFilter = document.getElementById('filtroFecha').value;

  let lista = await consultarReservas(salonFilter, fechaFilter);

  let html = "<table><tr><th>Salón</th><th>Fecha</th><th>Hora</th><th>Estado</th>";
  
  // Solo mostrar columna de acciones si es admin
  if (usuarioActual && usuarioActual.rol === "admin") {
    html += "<th>Acciones</th>";
  }
  
  html += "</tr>";
  
  lista.forEach(r => {
    let color = r.estado === "Confirmado" ? "reservado" : (r.estado === "En proceso" ? "proceso" : "disponible");
    html += `<tr>
      <td>${r.salon}</td>
      <td>${r.fecha}</td>
      <td>${r.hora}</td>
      <td><span class="${color}">${r.estado}</span></td>`;
    
    // Solo mostrar acciones si es admin
    if (usuarioActual && usuarioActual.rol === "admin") {
      html += `<td><button class="btn-small" onclick="verDetallesReserva(${r.id})">Ver Detalles</button></td>`;
    }
    
    html += "</tr>";
  });
  
  html += "</table>";
  cont.innerHTML = html;
}

document.getElementById("btnFiltrarCalendario").onclick = renderCalendario;

// --- Panel Administrativo ---
document.getElementById('btnAdmin').onclick = () => {
  mostrarSeccion('admin');
  renderAdminReservas();
};

async function renderAdminReservas() {
  const cont = document.getElementById('admin-content');
  let reservas = await consultarTodasReservas();

  let html = "<div class='admin-reservas'>";
  html += "<table><tr><th>ID</th><th>Salón</th><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Estado</th><th>Acciones</th></tr>";
  
  reservas.forEach((r) => {
    html += `<tr>
      <td>${r.id}</td>
      <td>${r.salon}</td>
      <td>${r.fecha}</td>
      <td>${r.hora}</td>
      <td>${r.nombre}</td>
      <td>${r.estado}</td>
      <td>
        <button class="btn-small" onclick="verDetallesReserva(${r.id})">Ver Detalles</button>
        <button class="btn-small btn-success" onclick="confirmarReserva(${r.id})">Confirmar</button>
        <button class="btn-small btn-danger" onclick="cancelarReserva(${r.id})">Cancelar</button>
      </td>
    </tr>`;
  });
  
  html += "</table></div>";
  cont.innerHTML = html;
}

async function renderAdminUsuarios() {
  const cont = document.getElementById('admin-content');
  let usuarios = await consultarUsuarios();

  let html = "<div class='admin-usuarios'>";
  html += "<h3>Usuarios Registrados</h3>";
  html += "<table><tr><th>Usuario</th><th>Correo</th><th>Rol</th></tr>";
  
  usuarios.forEach(u => {
    html += `<tr>
      <td>${u.usuario}</td>
      <td>${u.correo}</td>
      <td>${u.rol}</td>
    </tr>`;
  });
  
  html += "</table></div>";
  cont.innerHTML = html;
}

// --- Modal de detalles de reserva ---
async function verDetallesReserva(id) {
  const reserva = await obtenerDetallesReserva(id);
  const modal = document.getElementById('modalReserva');
  const detalles = document.getElementById('detallesReserva');
  
  const servicios = reserva.servicios ? reserva.servicios.split(',') : [];
  
  let html = `
    <div class="detalle-reserva">
      <div class="detalle-grupo">
        <h3>Información del Cliente</h3>
        <p><strong>Nombre:</strong> ${reserva.nombre}</p>
        <p><strong>Cédula:</strong> ${reserva.cedula}</p>
        <p><strong>Correo:</strong> ${reserva.correo}</p>
        <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
      </div>
      
      <div class="detalle-grupo">
        <h3>Información del Evento</h3>
        <p><strong>Salón:</strong> ${reserva.salon}</p>
        <p><strong>Fecha:</strong> ${reserva.fecha}</p>
        <p><strong>Hora:</strong> ${reserva.hora}</p>
        <p><strong>Estado:</strong> ${reserva.estado}</p>
      </div>
      
      <div class="detalle-grupo">
        <h3>Servicios Adicionales</h3>
        <div class="servicios">
          <label><input type="checkbox" ${servicios.includes('catering') ? 'checked' : ''} onchange="actualizarServicio(${reserva.id}, 'catering', this.checked)"> Catering</label>
          <label><input type="checkbox" ${servicios.includes('camareros') ? 'checked' : ''} onchange="actualizarServicio(${reserva.id}, 'camareros', this.checked)"> Camareros</label>
          <label><input type="checkbox" ${servicios.includes('decoracion') ? 'checked' : ''} onchange="actualizarServicio(${reserva.id}, 'decoracion', this.checked)"> Decoración</label>
        </div>
      </div>
      
      <div class="detalle-grupo">
        <h3>Comentarios</h3>
        <textarea id="comentarios-${reserva.id}" onchange="actualizarComentarios(${reserva.id})">${reserva.comentarios || ''}</textarea>
      </div>
      
      <div class="detalle-acciones">
        <button class="btn btn-success" onclick="confirmarReserva(${reserva.id}); cerrarModal();">Confirmar</button>
        <button class="btn btn-danger" onclick="cancelarReserva(${reserva.id}); cerrarModal();">Cancelar</button>
        <button class="btn btn-outline" onclick="cerrarModal()">Cerrar</button>
      </div>
    </div>
  `;
  
  detalles.innerHTML = html;
  modal.style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modalReserva').style.display = 'none';
}

// Cerrar modal si se hace clic fuera de él
window.onclick = function(event) {
  const modal = document.getElementById('modalReserva');
  if (event.target === modal) {
    cerrarModal();
  }
}

// --- Funciones para actualizar reservas ---
async function actualizarServicio(reservaId, servicio, activo) {
  const reserva = await obtenerDetallesReserva(reservaId);
  let servicios = reserva.servicios ? reserva.servicios.split(',') : [];
  
  if (activo && !servicios.includes(servicio)) {
    servicios.push(servicio);
  } else if (!activo && servicios.includes(servicio)) {
    servicios = servicios.filter(s => s !== servicio);
  }
  
  await actualizarReserva(reservaId, { servicios: servicios.join(',') });
}

async function actualizarComentarios(reservaId) {
  const comentarios = document.getElementById(`comentarios-${reservaId}`).value;
  await actualizarReserva(reservaId, { comentarios });
}

// --- Funciones de estado de reserva ---
window.confirmarReserva = async function(id) {
  await cambiarEstadoReserva(id, "Confirmado");
  renderAdminReservas();
  renderCalendario();
};

window.cancelarReserva = async function(id) {
  await cambiarEstadoReserva(id, "Cancelada");
  renderAdminReservas();
  renderCalendario();
};

// --- Hacer funciones globales ---
window.mostrarFormulario = mostrarFormulario;
window.mostrarTabAdmin = mostrarTabAdmin;
window.verDetallesReserva = verDetallesReserva;
window.cerrarModal = cerrarModal;
window.actualizarServicio = actualizarServicio;
window.actualizarComentarios = actualizarComentarios;

// Inicio: mostrar solo portada
mostrarSeccion('hero');