// js/card.js
import { CardType, Zone, PlayerID } from './constants.js';

// Contador global para IDs únicos de cartas (instancias)
let cardInstanceIdCounter = 0;

/**
 * Clase base para todas las cartas del juego.
 */
export class Card {
    /**
     * @param {string} id - ID único del tipo de carta (ej: "kaelen")
     * @param {string} name - Nombre de la carta
     * @param {CardType} type - Tipo de carta (Desafiante, Soporte, Recurso)
     * @param {number} cost - Coste en Cristales
     * @param {string} [text=''] - Texto de habilidad/descripción
     * @param {string} [visual='default'] - Identificador para la apariencia visual
     */
    constructor(id, name, type, cost, text = '', visual = 'default') {
        this.id = id;
        this.instanceId = `card-${cardInstanceIdCounter++}`; // ID único de esta instancia específica
        this.name = name;
        this.type = type;
        this.cost = cost;
        this.text = text;
        this.visual = visual; // Podría usarse para clases CSS o seleccionar imágenes
        /** @type {Zone | null} */
        this.currentZone = null;
        /** @type {PlayerID | null} */
        this.owner = null;
    }

    /**
     * Genera la representación HTML básica de la carta.
     * La clase UI puede personalizar esto más adelante.
     * @returns {string} HTML string for the card.
     */
    getHtmlRepresentation() {
        // Añadir clase específica del tipo para estilos CSS
        const typeClass = this.type === CardType.CHALLENGER ? 'challenger-card'
                        : this.type === CardType.RESOURCE ? 'resource-card'
                        : this.type === CardType.SUPPORT ? 'support-card'
                        : '';

        return `
            <div class="card ${typeClass}" id="${this.instanceId}" data-card-id="${this.id}" title="${this.name} - Coste: ${this.cost}\n${this.text}">
                <div class="card-header">
                    <span class="card-cost">${this.cost}</span>
                    <span class="card-name">${this.name}</span>
                </div>
                <div class="card-image-placeholder">${this.type === CardType.RESOURCE ? '💎' : (this.role || this.type)}</div>
                <div class="card-text">${this.text.substring(0, 30)}${this.text.length > 30 ? '...' : ''}</div>
                ${this.getStatsHtml()}
            </div>
        `;
    }

    /**
     * Devuelve el HTML para las estadísticas (sobrescrito por subclases).
     * @returns {string} HTML string for stats or empty string.
     */
    getStatsHtml() {
        return '';
    }

     /**
      * Verifica si la carta puede ser jugada con los recursos disponibles.
      * @param {number} playerResources - Cristales disponibles del jugador.
      * @returns {boolean} True if the card can be played.
      */
    canBePlayed(playerResources) {
        // Regla básica: tener suficientes cristales
        return playerResources >= this.cost;
    }
}

/**
 * Clase para cartas de Desafiante.
 * Extiende la clase Card.
 */
export class ChallengerCard extends Card {
     /**
     * @param {string} id
     * @param {string} name
     * @param {number} cost
     * @param {number} attack - Ataque base
     * @param {number} health - Vida máxima y actual inicial
     * @param {string} [role=''] - Rol (Atacante, Defensor, etc.)
     * @param {string} [cardText='']
     * @param {string} [visual='challenger']
     */
    constructor(id, name, cost, attack, health, role = '', cardText = '', visual = 'challenger') {
        super(id, name, CardType.CHALLENGER, cost, cardText, visual);
        this.baseAttack = attack;
        this.attack = attack; // Ataque actual (puede ser modificado)
        this.maxHealth = health;
        this.currentHealth = health; // Vida actual
        this.role = role;
        this.canAttack = false; // No puede atacar el turno que entra (regla común 'mareo de invocación')
        this.isReady = false; // Indica si está lista (no 'tapped')
        this.attacksPerformedThisTurn = 0; // Contador de ataques realizados
        this.maxAttacksPerTurn = 1; // Normalmente 1
    }

    /**
     * Devuelve el HTML para las estadísticas de Ataque y Vida.
     * @returns {string} HTML string for stats.
     */
    getStatsHtml() {
        return `
            <div class="card-stats">
                <span class="card-attack">${this.attack}</span>
                <span class="card-health">${this.currentHealth}/${this.maxHealth}</span>
            </div>
        `;
    }

    // getHtmlRepresentation se hereda y usa la clase 'challenger-card' definida en el padre

    /**
     * Aplica daño a la carta.
     * @param {number} amount - Cantidad de daño a recibir.
     */
    takeDamage(amount) {
        this.currentHealth -= amount;
        console.log(`${this.name} (${this.owner}) recibe ${amount} de daño. Vida restante: ${this.currentHealth}`);
        // La lógica de muerte se maneja en Game.checkDeaths()
    }

    /**
     * Prepara la carta al inicio del turno del jugador.
     * La carta puede atacar y usar habilidades (si no está 'tapped').
     */
    readyUp() {
        this.isReady = true;
        this.canAttack = true; // Puede atacar después del primer turno en juego
        this.attacksPerformedThisTurn = 0; // Resetea contador de ataques
        console.log(`${this.name} (${this.owner}) está lista.`);

    }

     /**
      * Marca la carta como usada ('tapped') después de atacar o usar una habilidad principal.
      */
    tap() {
        this.isReady = false;
        console.log(`${this.name} (${this.owner}) se ha girado (tapped).`);

    }

    /**
     * Verifica si la carta puede atacar (está lista y no ha excedido sus ataques).
     * @returns {boolean}
     */
    isAbleToAttack() {
        return this.isReady && this.canAttack && (this.attacksPerformedThisTurn < this.maxAttacksPerTurn);
    }

    /**
     * Registra que la carta ha atacado.
     */
    registerAttack() {
        this.attacksPerformedThisTurn++;
        // Si solo puede atacar una vez, se gira
        if (this.attacksPerformedThisTurn >= this.maxAttacksPerTurn) {
            this.tap();
        }
    }
}

/**
 * Clase para cartas de Recurso.
 * Extiende la clase Card.
 */
export class ResourceCard extends Card {
    /**
     * @param {string} [id='crystal']
     * @param {string} [name='Fragmento de Cristal']
     */
    constructor(id = 'crystal', name = 'Fragmento de Cristal') {
        // Coste 0 para jugar desde la mano
        super(id, name, CardType.RESOURCE, 0, 'Genera 1 Cristal por turno.', 'resource');
    }

    // getHtmlRepresentation se hereda y usa la clase 'resource-card' definida en el padre

    // Las cartas de recurso no tienen stats visibles
    getStatsHtml() {
        return '';
    }

    /**
     * Los recursos siempre se pueden jugar si la regla lo permite (1 por turno).
     * @override
     */
     canBePlayed(playerResources) {
        return true; // La lógica de "1 por turno" se maneja en Player.playCard
    }
}

// --- Base de Datos de Cartas ---
// Define las plantillas para crear instancias de cartas

export const cardDatabase = {
    // Recursos
    'crystal': () => new ResourceCard(),

    // Desafiantes (Ejemplos)
    'kaelen': () => new ChallengerCard('kaelen', 'Kaelen, Filo Arcano', 3, 4, 3, 'Atacante', 'Golpe Etéreo: Si ataca a un defensor con menos Ataque, +1 daño.'),
    'golem': () => new ChallengerCard('golem', 'Golem de Vapor VII', 4, 2, 6, 'Defensor', 'Blindaje Reforzado: Reduce en 1 el daño recibido. Protocolo Defensivo: +1 Defensa al entrar.'),
    'sylph': () => new ChallengerCard('sylph', 'Sylph, Susurrante', 2, 1, 2, 'Controlador', 'Vientos Protectores (Activar: 1 Cristal): Protege a un aliado hasta tu próximo turno.'),
    'roric': () => new ChallengerCard('roric', 'Inquisidor Roric', 3, 3, 3, 'Anti-Magia', 'Sello de Silencio: Al entrar, anula habilidades de un oponente hasta su próximo turno.'),
    'acechador': () => new ChallengerCard('acechador', 'Acechador Sombrío', 2, 3, 1, 'Sigilo', 'Emboscar: No puede ser atacado si no atacó. Ataque Furtivo: Doble daño si el objetivo no atacó.'),

    // Soportes (Añadir más adelante)
    // 'potion': () => new SupportCard('potion', 'Poción Curativa', 1, CardType.SUPPORT, 'Cura 3 de vida a un Desafiante.', 'support')
};

/**
 * Crea una nueva instancia de una carta a partir de su ID en la base de datos.
 * @param {string} cardId - El ID de la carta a crear (ej: 'kaelen').
 * @returns {Card | null} Una nueva instancia de Card o null si el ID no existe.
 */
export function createCard(cardId) {
    if (cardDatabase[cardId]) {
        const cardInstance = cardDatabase[cardId]();
        // Asegurarse de que la instancia tenga un ID único diferente al de la plantilla
        cardInstance.instanceId = `card-${cardInstanceIdCounter++}`;
        return cardInstance;
    }
    console.error(`Error: No se encontró la carta con ID: ${cardId}`);
    return null;
}