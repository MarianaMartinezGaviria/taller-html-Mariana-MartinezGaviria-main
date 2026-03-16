// Configuración
const CONFIG = {
    apiUrl: "https://pokeapi.co/api/v2",
    limiteInicial: 24, 
    imagenesRespaldo: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
};

// Elementos del DOM (con nombres descriptivos)
const elementos = {
    buscador: document.getElementById("inputBuscar"),
    botonBuscar: document.getElementById("btnBuscar"),
    botonVerTodos: document.getElementById("btnTodos"),
    contenedorPokemon: document.getElementById("listaPokemon"),
    mensajeError: document.getElementById("error"),
    indicadorCarga: document.getElementById("cargando")
};

// Estado de la aplicación
let pokemonCache = [];
let pokemonFiltrados = [];
let busquedaActual = "";

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function mostrarCarga(estado = true) {
    if (elementos.indicadorCarga) {
        elementos.indicadorCarga.hidden = !estado;
    }
    if (estado && elementos.contenedorPokemon) {
        elementos.contenedorPokemon.innerHTML = "";
    }
    ocultarError();
}

function ocultarCarga() {
    if (elementos.indicadorCarga) {
        elementos.indicadorCarga.hidden = true;
    }
}

function mostrarError(mensaje, tiempo = 3000) {
    if (elementos.mensajeError) {
        elementos.mensajeError.textContent = "❌ " + mensaje;
        elementos.mensajeError.hidden = false;
        
        // Auto-ocultar después de tiempo
        setTimeout(() => {
            elementos.mensajeError.hidden = true;
        }, tiempo);
    }
}

function ocultarError() {
    if (elementos.mensajeError) {
        elementos.mensajeError.hidden = true;
    }
}

// ============================================
// FUNCIONES DE LA API
// ============================================

async function obtenerPokemonApi(identificador) {
    try {
        const respuesta = await fetch(`${CONFIG.apiUrl}/pokemon/${identificador}`);
        
        if (!respuesta.ok) {
            throw new Error(`Error ${respuesta.status}: Pokémon no encontrado`);
        }
        
        return await respuesta.json();
    } catch (error) {
        console.error("Error en obtenerPokemonApi:", error);
        throw error;
    }
}

async function obtenerListaPokemonApi(limite = CONFIG.limiteInicial) {
    try {
        const respuesta = await fetch(`${CONFIG.apiUrl}/pokemon?limit=${limite}`);
        
        if (!respuesta.ok) {
            throw new Error("Error al cargar la lista");
        }
        
        const datos = await respuesta.json();
        
        // Cargar detalles de cada Pokémon (con manejo de errores individual)
        const detalles = [];
        for (let i = 0; i < datos.results.length; i++) {
            try {
                const detalle = await obtenerPokemonApi(datos.results[i].name);
                detalles.push(detalle);
            } catch (error) {
                console.warn(`No se pudo cargar ${datos.results[i].name}:`, error);
            }
        }
        
        return detalles;
    } catch (error) {
        console.error("Error en obtenerListaPokemonApi:", error);
        throw error;
    }
}

// ============================================
// PROCESAMIENTO DE DATOS
// ============================================

function procesarPokemon(pokemon) {
    // Extraer solo los datos que necesitamos
    return {
        id: pokemon.id,
        nombre: pokemon.name,
        nombreCapitalizado: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
        tipos: pokemon.types.map(t => t.type.name),
        tipoPrincipal: pokemon.types[0]?.type?.name || "normal",
        imagen: obtenerMejorImagen(pokemon),
        numeroFormateado: "#" + String(pokemon.id).padStart(4, "0"), // 4 dígitos (diferente)
        altura: pokemon.height / 10, // En metros
        peso: pokemon.weight / 10, // En kg
        experienciaBase: pokemon.base_experience || 0
    };
}

function obtenerMejorImagen(pokemon) {
    const opciones = [
        pokemon.sprites?.other?.dream_world?.front_default,
        pokemon.sprites?.other?.home?.front_default,
        pokemon.sprites?.other?.["official-artwork"]?.front_default,
        pokemon.sprites?.front_default,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`
    ];
    
    return opciones.find(url => url) || CONFIG.imagenesRespaldo;
}

// ============================================
// RENDERIZADO 
// ============================================

function crearTarjetaPersonalizada(pokemon) {
    const datos = procesarPokemon(pokemon);

    return `
        <div class="pokemon-card" data-id="${datos.id}" data-tipos="${datos.tipos.join(',')}">
            <div class="card-imagen-container">
                <img src="${datos.imagen}" 
                     alt="${datos.nombre}"
                     loading="lazy"
                     onerror="this.src='${CONFIG.imagenesRespaldo}'">
                <span class="card-experiencia">⚡${datos.experienciaBase}</span>
            </div>
            
            <div class="card-codigo">${datos.numeroFormateado}</div>
            <button type="button" class="card-toggle" aria-expanded="false">Ver detalles</button>
            
            <div class="card-info">
                <h3 class="card-nombre">${datos.nombreCapitalizado}</h3>
                
                <div class="card-tipos">
                    ${datos.tipos.map(tipo => 
                        `<span class="tipo-badge tipo-${tipo}">${tipo}</span>`
                    ).join('')}
                </div>
                
                <div class="card-medidas">
                    <span title="Altura">📏 ${datos.altura}m</span>
                    <span title="Peso">⚖️ ${datos.peso}kg</span>
                </div>
            </div>
        </div>
    `;
}

function mostrarPokemonEnPantalla(listaPokemon) {
    ocultarCarga();
    ocultarError();

    if (!listaPokemon || listaPokemon.length === 0) {
        elementos.contenedorPokemon.innerHTML = `
            <div class="mensaje-sin-resultados">
                <img src="${CONFIG.imagenesRespaldo}" alt="Sin resultados" class="sin-resultados-img">
                <p>No se encontraron Pokémon</p>
                <small>Intenta con otra búsqueda</small>
            </div>
        `;
        return;
    }

    // Ordenar por ID (para mantener consistencia)
    const listaOrdenada = [...listaPokemon].sort((a, b) => a.id - b.id);
    
    let html = "";
    for (let i = 0; i < listaOrdenada.length; i++) {
        html += crearTarjetaPersonalizada(listaOrdenada[i]);
    }
    
    elementos.contenedorPokemon.innerHTML = html;

    configurarTarjetasExpandibles();
    
    // Actualizar contador 
    actualizarContadorResultados(listaOrdenada.length);
}

function configurarTarjetasExpandibles() {
    const tarjetas = document.querySelectorAll('.pokemon-card');
    tarjetas.forEach(tarjeta => {
        const btn = tarjeta.querySelector('.card-toggle');
        const info = tarjeta.querySelector('.card-info');

        if (!btn || !info) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const abierto = tarjeta.classList.toggle('activo');
            info.style.maxHeight = abierto ? info.scrollHeight + 'px' : '0';
            btn.textContent = abierto ? 'Ocultar detalles' : 'Ver detalles';
            btn.setAttribute('aria-expanded', abierto);
        });

        tarjeta.addEventListener('click', () => {
            btn.click();
        });
    });
}

function actualizarContadorResultados(cantidad) {
    // Crear o actualizar contador
    let contador = document.getElementById('contador-resultados');
    if (!contador) {
        contador = document.createElement('div');
        contador.id = 'contador-resultados';
        contador.className = 'contador-resultados';
        elementos.contenedorPokemon.parentNode.insertBefore(contador, elementos.contenedorPokemon);
    }
}

// ============================================
// FUNCIONES DE BÚSQUEDA Y FILTRADO
// ============================================

async function buscarPokemon() {
    const texto = elementos.buscador.value.trim().toLowerCase();
    
    if (!texto) {
        mostrarError("Ingresa un nombre o número");
        return;
    }
    
    busquedaActual = texto;
    mostrarCarga(true);
    
    try {
        const pokemon = await obtenerPokemonApi(texto);
        pokemonFiltrados = [pokemon];
        mostrarPokemonEnPantalla([pokemon]);
        
        // Mostrar mensaje de éxito
        console.log(`✅ Encontrado: ${pokemon.name}`);
    } catch (error) {
        ocultarCarga();
        
        // Buscar en caché local como respaldo
        const resultadosLocales = pokemonCache.filter(p => 
            p.name.includes(texto) || 
            p.id.toString().includes(texto)
        );
        
        if (resultadosLocales.length > 0) {
            mostrarPokemonEnPantalla(resultadosLocales);
            mostrarError(`Mostrando ${resultadosLocales.length} resultados locales`, 2000);
        } else {
            elementos.contenedorPokemon.innerHTML = `
                <div class="mensaje-error-personalizado">
                    <span class="emoji-grande">😕</span>
                    <h3>No encontramos "${texto}"</h3>
                    <p>Revisa el nombre o intenta con otro Pokémon</p>
                </div>
            `;
        }
    }
}

async function cargarPokemonInicial() {
    mostrarCarga(true);
    
    try {
        const lista = await obtenerListaPokemonApi(CONFIG.limiteInicial);
        pokemonCache = lista;
        pokemonFiltrados = lista;
        mostrarPokemonEnPantalla(lista);
    } catch (error) {
        ocultarCarga();
        elementos.contenedorPokemon.innerHTML = `
            <div class="mensaje-error-personalizado">
                <span class="emoji-grande">⚠️</span>
                <h3>Error de conexión</h3>
                <p>No se pudieron cargar los Pokémon</p>
                <button onclick="cargarPokemonInicial()" class="btn-reintentar">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

function verTodosLosPokemon() {
    elementos.buscador.value = "";
    busquedaActual = "";
    
    if (pokemonCache.length > 0) {
        mostrarPokemonEnPantalla(pokemonCache);
    } else {
        cargarPokemonInicial();
    }
}

// ============================================
// EVENTOS Y INICIALIZACIÓN
// ============================================

function inicializarEventos() {
    // Evento de búsqueda
    elementos.botonBuscar.addEventListener("click", buscarPokemon);
    
    // Evento de tecla Enter
    elementos.buscador.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            buscarPokemon();
        }
    });
    
    // Evento de "Ver todos"
    elementos.botonVerTodos.addEventListener("click", verTodosLosPokemon);
    
    // Evento de input 
    elementos.buscador.addEventListener("input", (e) => {
        if (e.target.value.length > 2) {
            // Debounce para no saturar
            clearTimeout(window.debounceTimer);
            window.debounceTimer = setTimeout(() => {
                if (e.target.value === elementos.buscador.value) {
                    buscarPokemon();
                }
            }, 500);
        }
    });
    
    console.log("✅ Eventos inicializados");
}

// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Iniciando Pokédex Personalizada...");
    inicializarEventos();
    cargarPokemonInicial();
});

// Exponer funciones globales para debugging
window.pokedex = {
    recargar: cargarPokemonInicial,
    cache: () => pokemonCache,
    version: "1.0.0-personalizada"
};