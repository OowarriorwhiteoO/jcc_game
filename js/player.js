// js/player.js
import { Deck } from './deck.js';
import { Zone, PlayerID, CardType } from './constants.js';
import { ChallengerCard, ResourceCard } from './card.js'; // Importar para instanceof

/**
 * Representa a un jugador en el juego.
 */
export class Player {
    /**
     * @param {PlayerID} id - Identificador del jugador (PLAYER o OPPONENT)
     * @param {string} name - Nombre del jugador
     * @param {string[]} deckList - Lista de IDs de cartas para el mazo
     * @param {number} [life=20] - Puntos de vida iniciales
     */
    constructor(id, name, deckList, life = 20) {
        this.id = id;
        this.name = name;
        this.life = life;
        this.maxLife = life;
        this.deck = new Deck(deckList);
        /** @type {Card[]} */
        this.hand = [];
        /** @type {ChallengerCard[]} */
        this.field = []; // Contendrá principalmente Desafiantes
        /** @type {ResourceCard[]} */
        this.resources = [];
        /** @type {Card[]} */
        this.discard = [];
        this.maxHandSize = 7; // Límite de mano (opcional)
        this.maxFieldSize = 5; // Límite de campo para Desafiantes
        this.crystals = 0; // Cristales disponibles este turno
        this.maxCrystals = 0; // Cristales totales (basado en cartas de Recurso)
        this.playedResourceThisTurn = false; // Control para jugar 1 recurso por turno
        this.hasLost = false; // Indica si el jugador ha perdido
    }

    /**
     * Inicializa al jugador para una nueva partida: baraja mazo, roba mano inicial.
     */
    initialize() {
        this.deck.shuffle();
        this.hand = []; // Limpiar mano por si acaso
        // Robar mano inicial (ej: 5 cartas)
        for (let i = 0; i < 5; i++) {
            // El robo inicial no debería causar derrota por mazo vacío
            const card = this.deck.draw();
            if (card) {
                 card.currentZone = Zone.HAND;
                 card.owner = this.id;
                 this.hand.push(card);
            } else {
                console.error("Error: Mazo inicial demasiado pequeño para robar mano inicial.");
                // Podría lanzar un error o manejarlo de otra forma
                break;
            }
        }
        this.updateOwnerForCards(); // Asigna propietario a todas las cartas del mazo
        console.log(`${this.name} inicializado. Mano: ${this.hand.length}, Mazo: ${this.deck.getRemainingCards()}`);
    }

     /**
     * Asigna este jugador como propietario a todas las cartas actualmente en su mazo.
     * Importante hacerlo después de construir el mazo.
     */
    updateOwnerForCards() {
        this.deck.cards.forEach(card => {
            if (card) card.owner = this.id;
        });
    }


    /**
     * Roba una carta del mazo y la añade a la mano. Maneja la condición de derrota por mazo vacío.
     * @returns {Card | null} La carta robada o null si no se pudo robar (derrota o mano llena).
     */
    drawCard() {
        if (this.hasLost) return null; // No puede robar si ya perdió

        if (this.deck.isEmpty()) {
            console.log(`${this.name} intenta robar de un mazo vacío. ¡Ha perdido!`);
            this.hasLost = true; // Marcar como perdido
            // Notificar al GameManager (se hará en checkWinCondition)
            return null;
        }
        if (this.hand.length >= this.maxHandSize) {
             console.log(`${this.name} tiene la mano llena (${this.hand.length}), no puede robar más.`);
             // Opcional: descartar la carta robada o implementar otra regla
             return null;
        }

        const card = this.deck.draw();
        if (card) {
            card.currentZone = Zone.HAND;
            card.owner = this.id; // Asegurar propietario
            this.hand.push(card);
            console.log(`${this.name} robó: ${card.name}`);
        }
        return card;
    }

    /**
     * Intenta jugar una carta desde la mano a la zona correspondiente.
     * Valida coste, reglas de tipo y límites de zona.
     * @param {string} cardInstanceId - El ID de instancia de la carta a jugar.
     * @returns {Card | null} La carta jugada si tuvo éxito, null en caso contrario.
     */
    playCard(cardInstanceId) {
        const cardIndex = this.hand.findIndex(c => c.instanceId === cardInstanceId);
        if (cardIndex === -1) {
            console.error(`Carta con ID ${cardInstanceId} no encontrada en la mano de ${this.name}.`);
            return null;
        }

        const card = this.hand[cardIndex];

        // 1. Verificar Coste
        if (card.cost > this.crystals) {
            console.log(`Cristales insuficientes para ${card.name}. Coste: ${card.cost}, Disponibles: ${this.crystals}`);
            // UI.showMessage(`Cristales insuficientes para ${card.name}`); // Feedback visual
            return null;
        }

        // 2. Verificar reglas específicas de tipo y zona
        let targetZone = null;
        let canPlay = false;

        if (card instanceof ResourceCard) {
            if (this.playedResourceThisTurn) {
                console.log("Ya has jugado una carta de Recurso este turno.");
                // UI.showMessage("Ya jugaste un recurso este turno.");
                return null;
            }
            if (this.resources.length >= 10) { // Límite arbitrario
                 console.log("Zona de recursos llena.");
                 return null;
            }
            targetZone = Zone.RESOURCES;
            canPlay = true; // Coste 0 ya verificado implícitamente
            this.playedResourceThisTurn = true; // Marcar que ya jugó recurso
            this.maxCrystals++; // Aumenta el máximo al jugar un recurso
            // No gasta cristales para jugar
        } else if (card instanceof ChallengerCard) {
            if (this.field.length >= this.maxFieldSize) {
                console.log("El campo de batalla está lleno.");
                // UI.showMessage("Campo de batalla lleno.");
                return null;
            }
            targetZone = Zone.FIELD;
            canPlay = true;
            this.crystals -= card.cost; // Pagar coste
        } else if (card.type === CardType.SUPPORT) {
            // Lógica para Soportes (Objetos, Partidarios, Estadios)
            // Ejemplo simple: Objeto va directo al descarte
            console.log(`${this.name} jugó el Soporte: ${card.name} (va al descarte - ejemplo)`);
            targetZone = Zone.DISCARD; // Destino temporal para ejemplo
            canPlay = true;
            this.crystals -= card.cost; // Pagar coste
            // Aquí iría lógica más compleja: aplicar efecto, poner en campo si es Estadio, etc.
        } else {
            console.error(`Tipo de carta desconocido: ${card.type}`);
            return null;
        }

        // 3. Mover la carta si se puede jugar
        if (canPlay && targetZone) {
            // Eliminar de la mano ANTES de añadir a la nueva zona
            this.hand.splice(cardIndex, 1);
            this.moveCardToZone(card, targetZone);
            console.log(`${this.name} jugó ${card.type}: ${card.name} a ${targetZone}. Cristales restantes: ${this.crystals}`);
            return card; // Devolver la carta jugada
        }

        return null; // No se pudo jugar
    }

    /**
     * Mueve una instancia de carta específica a la zona destino designada.
     * Se encarga de eliminarla de la zona origen (si es una lista).
     * @param {Card} card - La instancia de la carta a mover.
     * @param {Zone} targetZone - La zona destino (constants.js).
     */
    moveCardToZone(card, targetZone) {
        const currentZone = card.currentZone;

        // Eliminar de la zona origen (si es una lista gestionada por el jugador)
        const removeFromList = (list) => {
            const index = list.findIndex(c => c.instanceId === card.instanceId);
            if (index > -1) {
                list.splice(index, 1);
                 console.log(`Removida ${card.name} de ${currentZone}`);
                 return true;
            }
            return false;
        };

        let removed = false;
        switch (currentZone) {
            case Zone.HAND: removed = removeFromList(this.hand); break;
            case Zone.FIELD: removed = removeFromList(this.field); break;
            case Zone.RESOURCES: removed = removeFromList(this.resources); break;
            case Zone.DECK: console.error("No se debería mover desde el mazo usando moveCardToZone."); break;
            case Zone.DISCARD: removed = removeFromList(this.discard); break;
            // case null: // Si la carta no estaba en ninguna zona (ej: recién creada)
            //     removed = true;
            //     break;
        }
        // if (!removed && currentZone !== null) {
        //      console.warn(`No se encontró ${card.name} en la zona origen ${currentZone} para removerla.`);
        // }


        // Añadir a la zona destino
        switch (targetZone) {
            case Zone.HAND: this.hand.push(card); break;
            case Zone.FIELD:
                // Asegurarse que solo Desafiantes van al campo principal
                if (card instanceof ChallengerCard) {
                    this.field.push(card);
                    card.isReady = false; // Entra 'tapped' (mareo de invocación)
                    card.canAttack = false; // No puede atacar este turno
                } else {
                    console.error(`Intento de mover carta no-Desafiante (${card.name}) a la zona FIELD.`);
                    // Podría ir al descarte o manejar error
                    targetZone = Zone.DISCARD;
                    this.discard.push(card);
                }
                break;
            case Zone.RESOURCES:
                 if (card instanceof ResourceCard) {
                    this.resources.push(card);
                 } else {
                     console.error(`Intento de mover carta no-Recurso (${card.name}) a la zona RESOURCES.`);
                     targetZone = Zone.DISCARD;
                     this.discard.push(card);
                 }
                 break;
            case Zone.DISCARD: this.discard.push(card); break;
            case Zone.DECK:
                // Podría ir al fondo o arriba, o requerir barajar
                this.deck.cards.push(card); // Ejemplo: añadir al final (fondo)
                console.log(`${card.name} añadida al fondo del mazo.`);
                break;
            default:
                console.error(`Zona destino desconocida: ${targetZone}`);
                return; // No actualizar currentZone si el destino es inválido
        }
        card.currentZone = targetZone;
        console.log(`Carta ${card.name} movida a la zona ${targetZone}`);
    }

    /**
     * Prepara al jugador para el inicio de su turno:
     * Rellena cristales, resetea permiso de recurso, prepara Desafiantes y roba carta.
     */
    startTurn() {
        if (this.hasLost) return; // No hacer nada si ya perdió

        this.crystals = this.maxCrystals; // Rellena cristales
        this.playedResourceThisTurn = false; // Resetea permiso para jugar recurso

        // Preparar Desafiantes en el campo
        this.field.forEach(card => {
            if (card instanceof ChallengerCard) {
                card.readyUp(); // Quita 'tap', permite atacar (si sobrevive mareo)
            }
        });

        // Robar carta (maneja derrota por mazo vacío internamente)
        this.drawCard();
    }

    /**
     * Realiza acciones de fin de turno para el jugador.
     */
    endTurn() {
        if (this.hasLost) return;
        // Lógica de fin de turno (ej: efectos "al final del turno", quitar estados temporales)
        console.log(`Terminando acciones de fin de turno para ${this.name}`);
    }

     /**
      * Aplica daño directo a los puntos de vida del jugador.
      * @param {number} amount - Cantidad de daño.
      */
    takeDamage(amount) {
        if (this.hasLost) return;
        this.life -= amount;
        console.log(`${this.name} recibe ${amount} de daño directo. Vida restante: ${this.life}`);
        if (this.life <= 0) {
            this.life = 0; // No dejar vida negativa
            console.log(`${this.name} ha sido derrotado (vida <= 0).`);
            this.hasLost = true;
            // Notificar al GameManager (se hará en checkWinCondition)
        }
    }
}
