// js/deck.js
import { createCard } from './card.js';
import { Zone } from './constants.js';

/**
 * Representa un mazo de cartas.
 */
export class Deck {
    /**
     * @param {string[]} [cardList=[]] - Lista inicial de IDs de cartas para el mazo.
     */
    constructor(cardList = []) {
        /** @type {Card[]} */
        this.cards = []; // Array de instancias de Card
        this.buildDeck(cardList);
    }

    /**
     * Construye el mazo creando instancias de cartas a partir de una lista de IDs.
     * @param {string[]} cardList - Array de IDs de cartas (ej: ['crystal', 'crystal', 'kaelen'])
     */
    buildDeck(cardList) {
        this.cards = cardList.map(cardId => {
            const card = createCard(cardId);
            if (card) {
                card.currentZone = Zone.DECK;
                // El propietario se asigna cuando el jugador se inicializa
            }
            return card;
        }).filter(card => card !== null); // Filtrar nulos si createCard falla
        console.log(`Mazo construido con ${this.cards.length} cartas.`);
    }

    /**
     * Baraja las cartas del mazo in-place usando el algoritmo Fisher-Yates (Durstenfeld shuffle).
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]; // Intercambio eficiente
        }
        console.log("Mazo barajado.");
    }

    /**
     * Roba una carta de la parte superior del mazo (último elemento del array).
     * @returns {Card | null} La carta robada o null si el mazo está vacío.
     */
    draw() {
        if (this.isEmpty()) {
            console.warn("Intento de robar de un mazo vacío.");
            return null;
        }
        const drawnCard = this.cards.pop();
        // La zona se actualizará en Player.drawCard()
        // drawnCard.currentZone = Zone.HAND;
        return drawnCard;
    }

    /**
     * Verifica si el mazo está vacío.
     * @returns {boolean} True si el mazo no tiene cartas.
     */
    isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Devuelve el número de cartas restantes en el mazo.
     * @returns {number}
     */
    getRemainingCards() {
        return this.cards.length;
    }
}