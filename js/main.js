// js/main.js
import { Game } from './game.js';

// --- Configuración Inicial del Juego ---

// Definir los mazos iniciales para cada jugador usando IDs de cartas
// Asegúrate de que los IDs coincidan con los definidos en card.js (cardDatabase)
// Mazo de 40 cartas como ejemplo
const playerDeckList = [
    'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', // 10
    'crystal', 'crystal', 'crystal', 'crystal', 'crystal', // 15
    'kaelen', 'kaelen', 'kaelen', // 18
    'golem', 'golem', // 20
    'sylph', 'sylph', 'sylph', // 23
    'roric', 'roric', // 25
    'acechador', 'acechador', 'acechador', 'acechador', // 29
    // Relleno simple para llegar a 40
    'crystal', 'crystal', 'crystal', 'kaelen', 'golem', 'sylph', 'roric', 'acechador', 'crystal', 'crystal', 'crystal', // 40
];

// Mazo similar para el oponente
const opponentDeckList = [
    'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', // 10
    'crystal', 'crystal', 'crystal', 'crystal', 'crystal', // 15
    'kaelen', 'kaelen', // 17
    'golem', 'golem', 'golem', // 20
    'sylph', 'sylph', // 22
    'roric', 'roric', 'roric', // 25
    'acechador', 'acechador', 'acechador', // 28
    // Relleno simple para llegar a 40
    'crystal', 'crystal', 'crystal', 'kaelen', 'golem', 'sylph', 'roric', 'acechador', 'crystal', 'crystal', 'crystal', 'crystal', // 40
];


// --- Inicialización del Juego ---

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado. Inicializando juego...");
    // Crear la instancia del juego
    try {
        const game = new Game(playerDeckList, opponentDeckList);
        // Iniciar la partida
        game.startGame();
         // Hacer accesible la instancia del juego globalmente para depuración (opcional)
         window.currentGame = game;
         console.log("Juego iniciado. Accede a 'window.currentGame' para depurar.");
    } catch (error) {
        console.error("Error fatal al inicializar el juego:", error);
        // Mostrar un mensaje de error al usuario en la página
        document.body.innerHTML = `<div class="text-red-500 p-4 text-center">Error al cargar el juego. Revisa la consola para más detalles.</div>`;
    }
});
