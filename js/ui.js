// js/ui.js
import { Zone, PlayerID, CardType } from './constants.js';
import { ChallengerCard, ResourceCard, Card } from './card.js'; // Importar clases necesarias

/**
 * Módulo Singleton para manejar la interfaz de usuario y las interacciones.
 */
export const UI = {
    // Referencias a elementos del DOM (cachear al inicializar)
    elements: {},

    /** @type {Game | null} */
    gameInstance: null, // Referencia a la instancia del juego para callbacks
    selectedAttackerId: null, // Guarda el ID de la carta atacante seleccionada

    /**
     * Inicializa la UI: cachea elementos y añade listeners básicos.
     * @param {Game} game - La instancia del juego.
     */
    initialize(game) {
        this.gameInstance = game;
        this.cacheElements();
        this.addEventListeners();
        this.elements.messageCloseButton.addEventListener('click', () => this.hideMessage());
        // Mostrar el log del juego
        this.elements.gameLog.classList.remove('hidden');
        console.log("UI Inicializada y elementos cacheados.");
    },

    /**
     * Cachea las referencias a los elementos del DOM para acceso rápido.
     */
    cacheElements() {
        this.elements = {
            playerHandElement: document.getElementById('player-hand-area'),
            playerFieldElement: document.getElementById('player-field'),
            playerResourcesElement: document.getElementById('player-resources'),
            playerDeckElement: document.getElementById('player-deck'),
            playerDiscardElement: document.getElementById('player-discard'),
            playerLifeElement: document.getElementById('player-life'),
            playerCrystalsElement: document.getElementById('player-crystals'),
            playerDeckCountElement: document.getElementById('player-deck-count'),
            playerDeckCountVisualElement: document.getElementById('player-deck-count-visual'),
            playerHandCountElement: document.getElementById('player-hand-count'),

            opponentFieldElement: document.getElementById('opponent-field'),
            opponentResourcesElement: document.getElementById('opponent-resources'),
            opponentDeckElement: document.getElementById('opponent-deck'),
            opponentDiscardElement: document.getElementById('opponent-discard'),
            opponentLifeElement: document.getElementById('opponent-life'),
            opponentCrystalsElement: document.getElementById('opponent-crystals'),
            opponentDeckCountElement: document.getElementById('opponent-deck-count'),
            opponentDeckCountVisualElement: document.getElementById('opponent-deck-count-visual'),
            opponentHandCountElement: document.getElementById('opponent-hand-count'),

            turnNumberElement: document.getElementById('turn-number'),
            currentPlayerElement: document.getElementById('current-player'),
            endTurnButton: document.getElementById('end-turn-button'),
            messageOverlay: document.getElementById('message-overlay'),
            messageText: document.getElementById('message-text'),
            messageCloseButton: document.getElementById('message-close-button'),
            gameLog: document.getElementById('game-log'),
        };
    },

    /**
     * Añade los event listeners principales para interacción del jugador.
     */
    addEventListeners() {
        // Listener para terminar turno
        this.elements.endTurnButton.addEventListener('click', () => {
            if (this.gameInstance && this.gameInstance.currentPlayerId === PlayerID.PLAYER && !this.gameInstance.gameEnded) {
                this.gameInstance.endTurn();
            }
        });

        // Listener para jugar cartas (delegación en la mano)
        this.elements.playerHandElement.addEventListener('click', (event) => {
            const cardElement = event.target.closest('.card');
            if (cardElement && this.gameInstance && this.gameInstance.currentPlayerId === PlayerID.PLAYER && !this.gameInstance.gameEnded) {
                const cardInstanceId = cardElement.id;
                // Verificar si la carta es jugable (tiene la clase)
                if (cardElement.classList.contains('playable')) {
                    console.log(`Intentando jugar carta de la mano: ${cardInstanceId}`);
                    this.gameInstance.playerPlayCard(PlayerID.PLAYER, cardInstanceId);
                } else {
                    console.log(`Carta ${cardInstanceId} no es jugable ahora.`);
                    // Podríamos mostrar un mensaje o simplemente no hacer nada
                }
            }
        });

         // Listener para acciones en el campo del jugador (atacar, habilidad)
        this.elements.playerFieldElement.addEventListener('click', (event) => {
            const cardElement = event.target.closest('.card');
            if (cardElement && this.gameInstance && this.gameInstance.currentPlayerId === PlayerID.PLAYER && !this.gameInstance.gameEnded) {
                 this.handleFieldCardClick(cardElement);
            }
        });

        // Listener para seleccionar objetivos en campo oponente
         this.elements.opponentFieldElement.addEventListener('click', (event) => {
            const cardElement = event.target.closest('.card');
            // Permitir seleccionar objetivo incluso si no hay atacante seleccionado (para habilidades futuras)
            if (cardElement && this.gameInstance && this.gameInstance.currentPlayerId === PlayerID.PLAYER && !this.gameInstance.gameEnded) {
                 this.handleOpponentFieldCardClick(cardElement);
            }
        });

        // Listener para atacar directamente al oponente (clic en su info/avatar?)
        // Ejemplo: Clic en la zona de vida del oponente
        const opponentInfoArea = document.getElementById('opponent-info'); // Cachear si se usa mucho
        if (opponentInfoArea) {
            opponentInfoArea.addEventListener('click', () => {
                 if (this.gameInstance && this.gameInstance.currentPlayerId === PlayerID.PLAYER && !this.gameInstance.gameEnded) {
                    this.handleOpponentPlayerClick();
                 }
            });
        }

    },

     /**
     * Maneja el clic en una carta del campo del jugador.
     * Lógica: Si la carta puede atacar, la selecciona como atacante. Si ya hay un atacante, deselecciona.
     * @param {HTMLElement} cardElement - El elemento de la carta clickeada.
     */
    handleFieldCardClick(cardElement) {
        const cardInstanceId = cardElement.id;
        const player = this.gameInstance.players[PlayerID.PLAYER];
        /** @type {ChallengerCard | undefined} */
        const card = player.field.find(c => c.instanceId === cardInstanceId);

        // Validar que sea un Desafiante listo para atacar
        if (!card || !(card instanceof ChallengerCard) || !card.isAbleToAttack()) {
            console.log(`${card ? card.name : 'Carta desconocida'} no puede atacar ahora.`);
            this.clearAttackerSelection(); // Limpiar selección si se hace clic en una carta no válida
            return;
        }

        // Si ya estaba seleccionada, deseleccionar
        if (this.selectedAttackerId === cardInstanceId) {
            this.clearAttackerSelection();
            console.log(`Ataque con ${card.name} cancelado.`);
        } else {
            // Si había otra seleccionada, quitarle la clase
            this.clearAttackerSelection();
            // Seleccionar la nueva
            cardElement.classList.add('selected-attacker');
            this.selectedAttackerId = cardInstanceId;
            console.log(`${card.name} seleccionada para atacar.`);
            this.logMessage(`Seleccionaste a ${card.name} para atacar.`); // Log para el jugador
        }
    },

    /**
     * Maneja el clic en una carta del campo oponente (como objetivo de ataque).
     * @param {HTMLElement} targetElement - El elemento de la carta oponente clickeada.
     */
    handleOpponentFieldCardClick(targetElement) {
        if (!this.selectedAttackerId) {
            console.log("Selecciona primero un atacante de tu campo.");
            // Podría ser objetivo de habilidad, manejar eso después
            return;
        }

        const attackerInstanceId = this.selectedAttackerId;
        const targetInstanceId = targetElement.id; // ID de la carta oponente

        console.log(`Intentando atacar con ${attackerInstanceId} a ${targetInstanceId}`);
        this.gameInstance.playerDeclareAttack(PlayerID.PLAYER, attackerInstanceId, targetInstanceId);

        // Limpiar selección después de declarar el ataque
        this.clearAttackerSelection();
    },

    /**
     * Maneja el clic en el área del oponente para ataque directo.
     */
     handleOpponentPlayerClick() {
         if (!this.selectedAttackerId) {
            console.log("Selecciona primero un atacante de tu campo para atacar al oponente.");
            return;
        }

        const attackerInstanceId = this.selectedAttackerId;
        const targetId = PlayerID.OPPONENT; // Atacar directamente al jugador oponente

        console.log(`Intentando atacar directamente al oponente con ${attackerInstanceId}`);
        this.gameInstance.playerDeclareAttack(PlayerID.PLAYER, attackerInstanceId, targetId);

        this.clearAttackerSelection();
     },

    /**
     * Limpia la selección visual y lógica del atacante.
     */
    clearAttackerSelection() {
        if (this.selectedAttackerId) {
            const previousAttackerElement = document.getElementById(this.selectedAttackerId);
            if (previousAttackerElement) {
                previousAttackerElement.classList.remove('selected-attacker');
            }
            this.selectedAttackerId = null;
        }
    },


    /**
     * Actualiza toda la interfaz de usuario basada en el estado actual del juego.
     * @param {Game} game - La instancia del juego.
     */
    updateUI(game) {
        if (!game) return;
        const player = game.players[PlayerID.PLAYER];
        const opponent = game.players[PlayerID.OPPONENT];

        // Actualizar mano del jugador
        this.renderZone(player.hand, this.elements.playerHandElement, player.crystals);
        // Actualizar campo del jugador
        this.renderZone(player.field, this.elements.playerFieldElement);
        // Actualizar recursos del jugador
        this.renderZone(player.resources, this.elements.playerResourcesElement);

        // Actualizar campo del oponente
        this.renderZone(opponent.field, this.elements.opponentFieldElement, -1, true);
        // Actualizar recursos del oponente
        this.renderZone(opponent.resources, this.elements.opponentResourcesElement, -1, true);

        // Actualizar contadores y vida
        this.updatePlayerStats(player, PlayerID.PLAYER);
        this.updatePlayerStats(opponent, PlayerID.OPPONENT);

        // Actualizar info del turno
        this.elements.turnNumberElement.textContent = game.turn;
        this.elements.currentPlayerElement.textContent = game.players[game.currentPlayerId].name;

        // Habilitar/deshabilitar botón de fin de turno y limpiar selección si cambia el turno
        const isPlayerTurn = game.currentPlayerId === PlayerID.PLAYER && !game.gameEnded;
        this.elements.endTurnButton.disabled = !isPlayerTurn;
        if (!isPlayerTurn) {
            this.clearAttackerSelection();
        }

        // Actualizar descartes
        this.renderDiscardPile(player.discard, this.elements.playerDiscardElement);
        this.renderDiscardPile(opponent.discard, this.elements.opponentDiscardElement);

        console.log("UI actualizada.");
    },

    /**
     * Actualiza los contadores de estadísticas de un jugador en el HUD.
     * @param {Player} player - La instancia del jugador.
     * @param {PlayerID} playerId - El ID del jugador (para seleccionar elementos correctos).
     */
    updatePlayerStats(player, playerId) {
        const prefix = playerId === PlayerID.PLAYER ? 'player' : 'opponent';
        this.elements[`${prefix}LifeElement`].textContent = `${player.life} ❤️`;
        this.elements[`${prefix}CrystalsElement`].textContent = `${player.crystals} / ${player.maxCrystals}`;
        this.elements[`${prefix}DeckCountElement`].textContent = player.deck.getRemainingCards();
        this.elements[`${prefix}DeckCountVisualElement`].textContent = player.deck.getRemainingCards();
        this.elements[`${prefix}HandCountElement`].textContent = player.hand.length;
    },


    /**
     * Renderiza las cartas en una zona específica del DOM.
     * @param {Card[]} cards - Array de cartas en la zona.
     * @param {HTMLElement} zoneElement - El elemento del DOM para la zona.
     * @param {number} [playerCrystals=-1] - Cristales del jugador actual (para marcar jugables). -1 si no aplica.
     * @param {boolean} [isOpponentZone=false] - Si es una zona del oponente (puede afectar el renderizado).
     */
    renderZone(cards, zoneElement, playerCrystals = -1, isOpponentZone = false) {
        zoneElement.innerHTML = ''; // Limpiar zona antes de renderizar

        // Añadir texto placeholder si la zona está vacía
        if (cards.length === 0) {
            let placeholderText = '';
            if (zoneElement === this.elements.playerFieldElement) placeholderText = 'Mi Campo';
            else if (zoneElement === this.elements.opponentFieldElement) placeholderText = 'Campo Oponente';
            else if (zoneElement === this.elements.playerHandElement) placeholderText = 'Mano Vacía';
            else if (zoneElement === this.elements.playerResourcesElement) placeholderText = 'Mis Recursos';
            else if (zoneElement === this.elements.opponentResourcesElement) placeholderText = 'Recursos Op.';

            if (placeholderText) {
                 zoneElement.innerHTML = `<span class="text-gray-500 text-sm p-4">${placeholderText}</span>`;
            }
            return;
        }

        // Renderizar cada carta
        cards.forEach(card => {
            const cardHtml = card.getHtmlRepresentation(); // Obtener HTML de la instancia de carta
            const tempContainer = document.createElement('div'); // Contenedor temporal para parsear HTML
            tempContainer.innerHTML = cardHtml;
            const actualCardElement = tempContainer.firstElementChild; // El elemento .card

            if (!actualCardElement) return; // Seguridad

            // --- Aplicar clases de estado dinámicas ---

            // Marcar como jugable (si está en mano del jugador activo y cumple condiciones)
            if (card.currentZone === Zone.HAND && card.owner === PlayerID.PLAYER && this.gameInstance.currentPlayerId === PlayerID.PLAYER) {
                 let canAfford = playerCrystals >= card.cost;
                 let canPlayType = true;
                 if (card instanceof ResourceCard && this.gameInstance.players[PlayerID.PLAYER].playedResourceThisTurn) {
                     canPlayType = false;
                 }
                 // Añadir más validaciones si es necesario (ej: límite de campo)

                 if (canAfford && canPlayType) {
                    actualCardElement.classList.add('playable');
                 }
            }

             // Marcar si está 'tapped' (girada) - para desafiantes en campo
            if (card instanceof ChallengerCard && !card.isReady && card.currentZone === Zone.FIELD) {
                 actualCardElement.classList.add('tapped');
            }

            // Marcar si es el atacante seleccionado actualmente
            if (this.selectedAttackerId === card.instanceId) {
                 actualCardElement.classList.add('selected-attacker');
            }

            // Opcional: Ocultar detalles si es carta oponente en mano (no implementado aquí)
            // if (isOpponentZone && card.currentZone === Zone.HAND) { ... }

            zoneElement.appendChild(actualCardElement);
        });
    },

    /**
     * Muestra la carta superior del montón de descarte de forma simplificada.
     * @param {Card[]} discardPile - El array de cartas descartadas.
     * @param {HTMLElement} discardElement - El elemento del DOM para la zona de descarte.
     */
    renderDiscardPile(discardPile, discardElement) {
        discardElement.innerHTML = ''; // Limpiar
        if (discardPile.length > 0) {
            const topCard = discardPile[discardPile.length - 1];
            // Mostrar una versión MUY miniatura o solo el nombre
            const miniCard = document.createElement('div');
            miniCard.classList.add('card', 'p-1', 'text-center', 'overflow-hidden'); // Clases base + ajustes
             // Determinar clase de tipo
            const typeClass = topCard.type === CardType.CHALLENGER ? 'challenger-card'
                        : topCard.type === CardType.RESOURCE ? 'resource-card'
                        : topCard.type === CardType.SUPPORT ? 'support-card'
                        : '';
            if(typeClass) miniCard.classList.add(typeClass);

            miniCard.style.width = '50px';
            miniCard.style.height = '70px';
            miniCard.style.fontSize = '0.5rem';
            miniCard.style.cursor = 'default'; // No interactuable
            miniCard.style.boxShadow = 'none';
            miniCard.innerHTML = `<div class="font-bold text-xs truncate">${topCard.name}</div>`; // Solo nombre
            miniCard.title = `Descarte: ${topCard.name}`; // Tooltip

            discardElement.appendChild(miniCard);

        } else {
            discardElement.innerHTML = '<span class="text-xs">Descarte</span>';
        }
    },

    /**
     * Muestra un mensaje modal en el overlay.
     * @param {string} message - El mensaje a mostrar.
     * @param {boolean} [isError=false] - Si es un mensaje de error (podría cambiar color).
     */
    showMessage(message, isError = false) {
        this.elements.messageText.textContent = message;
        // Opcional: Cambiar estilo si es error
        this.elements.messageText.style.color = isError ? '#f56565' : 'white'; // red-500
        this.elements.messageOverlay.classList.remove('hidden');
    },

    /**
     * Oculta el overlay de mensajes.
     */
    hideMessage() {
        this.elements.messageOverlay.classList.add('hidden');
    },

    /**
     * Añade un mensaje al log del juego visible en la UI.
     * @param {string} message - El mensaje para el log.
     */
    logMessage(message) {
        if (this.elements.gameLog && this.gameInstance) {
            const messageElement = document.createElement('p');
            // Añadir prefijo de turno y jugador si es relevante
            const turnInfo = `[T${this.gameInstance.turn}]`;
            messageElement.textContent = `${turnInfo} ${message}`;
            messageElement.classList.add('mb-1'); // Pequeño margen inferior

            // Mantener el log con scroll hacia abajo
            const isScrolledToBottom = this.elements.gameLog.scrollHeight - this.elements.gameLog.clientHeight <= this.elements.gameLog.scrollTop + 1;

            this.elements.gameLog.appendChild(messageElement);

            if (isScrolledToBottom) {
                this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
            }
        }
    }
};
