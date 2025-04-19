// js/game.js
import { Player } from './player.js';
import { UI } from './ui.js';
import { PlayerID, TurnPhase, Zone, CardType } from './constants.js';
import { ChallengerCard, Card, ResourceCard } from './card.js'; // Importar clases necesarias

/**
 * Clase principal que maneja la lógica y el estado del juego.
 */
export class Game {
    /**
     * @param {string[]} playerDeckList - Lista de IDs para el mazo del jugador.
     * @param {string[]} opponentDeckList - Lista de IDs para el mazo del oponente.
     */
    constructor(playerDeckList, opponentDeckList) {
        /** @type {Object.<PlayerID, Player>} */
        this.players = {
            [PlayerID.PLAYER]: new Player(PlayerID.PLAYER, 'Jugador', playerDeckList),
            [PlayerID.OPPONENT]: new Player(PlayerID.OPPONENT, 'Oponente', opponentDeckList)
        };
        this.turn = 0; // Empezará en 1 al iniciar el primer turno
        /** @type {PlayerID} */
        this.currentPlayerId = PlayerID.PLAYER; // El jugador empieza por defecto
        /** @type {TurnPhase} */
        this.currentPhase = TurnPhase.START;
        this.gameEnded = false;
        /** @type {PlayerID | null} */
        this.winner = null;

        // Inicializar la UI pasándole esta instancia del juego
        UI.initialize(this);
    }

    /**
     * Inicia la partida: inicializa jugadores, determina quién empieza, inicia el primer turno.
     */
    startGame() {
        console.log("Iniciando partida...");
        UI.logMessage("Nueva partida iniciada.");

        // Reiniciar estado del juego
        this.turn = 0;
        this.gameEnded = false;
        this.winner = null;

        // Inicializar ambos jugadores (barajar, robar mano)
        this.players[PlayerID.PLAYER].initialize();
        this.players[PlayerID.OPPONENT].initialize();

        // Determinar quién empieza (ej: aleatorio o siempre el jugador)
        this.currentPlayerId = PlayerID.PLAYER; // El jugador empieza

        // Iniciar el primer turno
        this.startNextTurn();

        console.log(`Partida iniciada. Turno 1 - ${this.players[this.currentPlayerId].name}.`);
        UI.logMessage(`Empieza ${this.players[this.currentPlayerId].name}.`);
    }

     /**
     * Avanza al siguiente turno o inicia el primero.
     */
    startNextTurn() {
         if (this.gameEnded) return;

         // Incrementar turno si vuelve al jugador 1
         if (this.currentPlayerId === PlayerID.PLAYER) {
            this.turn++;
         }

         const currentPlayer = this.players[this.currentPlayerId];
         console.log(`--- Inicio del Turno ${this.turn} para ${currentPlayer.name} ---`);
         UI.logMessage(`Inicio del Turno ${this.turn} - ${currentPlayer.name}`);
         this.currentPhase = TurnPhase.START;

         // Lógica de inicio de turno (efectos "al inicio del turno")
         // ...

         // Preparar jugador (recargar cristales, preparar unidades, robar carta)
         // La regla del T1 P1 sin robo debe manejarse aquí o en Player.startTurn
         let skipDraw = (this.turn === 1 && this.currentPlayerId === PlayerID.PLAYER);
         if (skipDraw) {
             console.log("Jugador 1, Turno 1: No roba carta.");
             UI.logMessage("Es tu primer turno, no robas carta.");
             // Ejecutar resto de startTurn sin el robo
             currentPlayer.crystals = currentPlayer.maxCrystals;
             currentPlayer.playedResourceThisTurn = false;
             currentPlayer.field.forEach(card => {
                 if (card instanceof ChallengerCard) card.readyUp();
             });
         } else {
             currentPlayer.startTurn(); // Incluye el robo
         }


         // Comprobar si el robo causó derrota por mazo vacío
         if (this.checkWinCondition()) {
             // No necesitamos llamar a endGame() aquí, checkWinCondition actualiza el estado
             // La UI se actualizará igualmente
             console.log("Condición de victoria detectada al inicio del turno.");
         }

         this.currentPhase = TurnPhase.MAIN;
         console.log("Fase Principal.");
         UI.updateUI(this); // Actualizar UI después de preparar y robar

         // Si es el turno del oponente, ejecutar su IA
         if (this.currentPlayerId === PlayerID.OPPONENT && !this.gameEnded) {
             // Usar setTimeout para dar una sensación de "pensamiento" y no bloquear UI
             setTimeout(() => this.runOpponentTurn(), 500); // 0.5s delay
         }
    }


    /**
     * Ejecuta las acciones del oponente (IA muy básica).
     * Se ejecuta con un delay para simular pensamiento.
     */
    runOpponentTurn() {
        // Doble chequeo de seguridad
        if (this.gameEnded || this.currentPlayerId !== PlayerID.OPPONENT) {
            console.log("runOpponentTurn abortado: Juego terminado o no es turno del oponente.");
            return;
        }

        console.log("Ejecutando IA del Oponente...");
        UI.logMessage("Turno del Oponente.");
        const opponent = this.players[PlayerID.OPPONENT];
        const player = this.players[PlayerID.PLAYER]; // Referencia al jugador humano para objetivos

        // --- Loguear estado inicial del oponente ---
        console.log(`[IA] Mano Oponente: ${opponent.hand.map(c => c.name).join(', ')}`);
        console.log(`[IA] Cristales Oponente: ${opponent.crystals}/${opponent.maxCrystals}`);
        console.log(`[IA] Campo Oponente: ${opponent.field.map(c => c.name).join(', ')}`);
        console.log(`[IA] ¿Jugó Recurso?: ${opponent.playedResourceThisTurn}`);


        // --- Lógica de IA Simple ---

        // 1. Jugar Recurso: Si tiene uno en mano y no ha jugado.
        if (!opponent.playedResourceThisTurn) {
            console.log("[IA] Buscando carta de Recurso...");
            const resourceCard = opponent.hand.find(c => c instanceof ResourceCard);
            if (resourceCard) {
                console.log(`[IA] Recurso encontrado: ${resourceCard.name}. Intentando jugar...`);
                const played = this.playerPlayCard(PlayerID.OPPONENT, resourceCard.instanceId);
                console.log(`[IA] Resultado de jugar Recurso: ${played}`);
                // La UI se actualiza dentro de playerPlayCard si tiene éxito
            } else {
                console.log("[IA] No se encontró carta de Recurso en mano.");
            }
        } else {
             console.log("[IA] Ya jugó un recurso este turno.");
        }

        // Comprobar si el juego terminó después de jugar recurso
        if (this.gameEnded) return;

        // 2. Jugar Desafiantes: Jugar el más caro posible que pueda pagar.
        console.log(`[IA] Buscando Desafiantes jugables (Cristales: ${opponent.crystals}, Campo: ${opponent.field.length}/${opponent.maxFieldSize})...`);
        const playableChallengers = opponent.hand.filter(card =>
            card instanceof ChallengerCard &&
            card.cost <= opponent.crystals &&
            opponent.field.length < opponent.maxFieldSize
        ).sort((a, b) => b.cost - a.cost); // Ordenar de más caro a más barato

        if (playableChallengers.length > 0) {
            const cardToPlay = playableChallengers[0];
            console.log(`[IA] Desafiante jugable encontrado: ${cardToPlay.name} (Coste: ${cardToPlay.cost}). Intentando jugar...`);
            const played = this.playerPlayCard(PlayerID.OPPONENT, cardToPlay.instanceId);
            console.log(`[IA] Resultado de jugar Desafiante: ${played}`);
        } else {
            console.log("[IA] No se encontraron Desafiantes jugables.");
        }

        // Comprobar si el juego terminó después de jugar desafiante
        if (this.gameEnded) return;

        // 3. Atacar: Con cada Desafiante listo, atacar a un objetivo prioritario.
        console.log("[IA] Buscando atacantes listos...");
        const readyAttackers = opponent.field.filter(card => card instanceof ChallengerCard && card.isAbleToAttack());
        console.log(`[IA] Atacantes encontrados: ${readyAttackers.map(c => c.name).join(', ')}`);

        readyAttackers.forEach(attacker => {
             // Comprobar estado del juego antes de cada ataque individual
             if (this.gameEnded) return;

             console.log(`[IA] Evaluando ataque para: ${attacker.name} (Atk: ${attacker.attack})`);
             let targetId = null;
             let targetName = ''; // Para logging

             // Prioridad: Atacar Desafiantes del jugador que puedan ser destruidos.
             const killableTargets = player.field.filter(pCard =>
                 pCard instanceof ChallengerCard && pCard.currentHealth <= attacker.attack
             ).sort((a,b) => b.attack - a.attack); // Priorizar matar atacantes fuertes

             if (killableTargets.length > 0) {
                 targetId = killableTargets[0].instanceId;
                 targetName = killableTargets[0].name;
                 console.log(`[IA] ${attacker.name} ataca a ${targetName} (letal).`);
                 UI.logMessage(`Oponente ataca a tu ${targetName} con ${attacker.name}.`);
             } else if (player.field.length > 0) {
                 // Si no hay letales, atacar al Desafiante con más ataque (o el primero si hay empate)
                 const strongestTarget = [...player.field].sort((a,b) => b.attack - a.attack)[0];
                 targetId = strongestTarget.instanceId;
                 targetName = strongestTarget.name;
                 console.log(`[IA] ${attacker.name} ataca a ${targetName} (más fuerte).`);
                  UI.logMessage(`Oponente ataca a tu ${targetName} con ${attacker.name}.`);
             } else {
                 // Si no hay Desafiantes, atacar al jugador
                 targetId = PlayerID.PLAYER;
                 targetName = player.name;
                 console.log(`[IA] ${attacker.name} ataca directamente a ${targetName}.`);
                  UI.logMessage(`Oponente te ataca directamente con ${attacker.name}.`);
             }

             if (targetId) {
                 console.log(`[IA] Declarando ataque: ${attacker.name} -> ${targetName}`);
                 this.playerDeclareAttack(PlayerID.OPPONENT, attacker.instanceId, targetId);
                 // La UI se actualiza dentro de playerDeclareAttack
             } else {
                 console.log(`[IA] No se encontró objetivo válido para ${attacker.name}.`);
             }
        });

        // Comprobar si el juego terminó después de los ataques
        if (this.gameEnded) return;

        // 4. Terminar Turno: Después de un breve delay adicional.
        console.log("[IA] Acciones completadas. Programando fin de turno...");
        setTimeout(() => {
             // Volver a comprobar estado antes de terminar
             if (!this.gameEnded && this.currentPlayerId === PlayerID.OPPONENT) {
                 console.log("[IA] Ejecutando fin de turno.");
                 this.endTurn();
             } else {
                  console.log("[IA] Fin de turno abortado (juego terminado o ya no es turno del oponente).");
             }
        }, 1000); // 1s delay adicional después de las acciones
    }


    /**
     * Finaliza el turno actual y pasa al siguiente jugador.
     */
    endTurn() {
        if (this.gameEnded) return;

        const currentPlayer = this.players[this.currentPlayerId];
        console.log(`--- Fin del Turno ${this.turn} para ${currentPlayer.name} ---`);
         UI.logMessage(`Fin del turno de ${currentPlayer.name}.`);
        this.currentPhase = TurnPhase.END;
        currentPlayer.endTurn(); // Ejecutar lógica de fin de turno del jugador

        // Limpiar estados temporales (ej: atacante seleccionado en UI)
        UI.clearAttackerSelection();

        // Comprobar condiciones de victoria/derrota ANTES de cambiar de jugador
        // checkWinCondition ahora actualiza gameEnded y winner
        if (this.checkWinCondition()) {
            // No llamar a endGame aquí directamente, startNextTurn lo manejará si gameEnded es true
            console.log("Condición de victoria detectada al final del turno.");
            // Es importante actualizar la UI una última vez si el juego termina aquí
             UI.updateUI(this);
             // Si el juego terminó, no iniciar el siguiente turno
             return;
        }

        // Cambiar de jugador
        this.currentPlayerId = (this.currentPlayerId === PlayerID.PLAYER) ? PlayerID.OPPONENT : PlayerID.PLAYER;

        // Iniciar el siguiente turno (que comprobará gameEnded al inicio)
        this.startNextTurn();
    }

    /**
     * Intenta que un jugador robe una carta (generalmente llamado por startTurn).
     * @param {PlayerID} playerId - El ID del jugador que roba.
     */
    playerDrawCard(playerId) {
         if (this.gameEnded) return;
        const player = this.players[playerId];
        const drawnCard = player.drawCard(); // drawCard actualiza player.hasLost

        if (player.hasLost) {
             console.log(`Derrota detectada para ${player.name} al robar.`);
             // No llamar a endGame aquí, checkWinCondition lo hará
        } else if (drawnCard) {
             UI.logMessage(`${player.name} robó ${drawnCard.name}.`); // Log más específico
        } else {
             // Podría ser mano llena u otro error
             UI.logMessage(`${player.name} no pudo robar.`);
        }
        // No actualizar UI aquí, se hace en startNextTurn
    }

    /**
     * Intenta que un jugador juegue una carta desde su mano.
     * @param {PlayerID} playerId - El ID del jugador que juega.
     * @param {string} cardInstanceId - El ID de la instancia de carta a jugar.
     * @returns {boolean} True si la carta se jugó con éxito.
     */
    playerPlayCard(playerId, cardInstanceId) {
         // Solo el jugador activo puede jugar cartas
         if (this.gameEnded || playerId !== this.currentPlayerId) {
             console.log(`playerPlayCard abortado: Juego terminado (${this.gameEnded}) o no es turno de ${playerId} (actual: ${this.currentPlayerId})`);
             return false;
         }

        const player = this.players[playerId];
        const playedCard = player.playCard(cardInstanceId); // playCard ahora devuelve la carta o null

        if (playedCard) {
            console.log(`${player.name} jugó la carta ID: ${cardInstanceId} (${playedCard.name})`);
            UI.logMessage(`${player.name} jugó ${playedCard.name}.`);
            // --- Aquí irían efectos "al jugar la carta" ---
            // Ejemplo: Habilidad "Al entrar en juego"
            // if (playedCard.onPlayEffect) {
            //     playedCard.onPlayEffect(this, playerId);
            // }
            // --- Fin efectos ---

            // Comprobar si jugar la carta ganó/perdió el juego
            // (Ej: una carta que haga daño directo o cumpla condición de victoria)
            if (this.checkWinCondition()) {
                 console.log("Condición de victoria detectada después de jugar carta.");
                 // endGame() será llamado por la lógica de turno si es necesario
            }
            UI.updateUI(this); // Actualizar UI para reflejar el cambio
            return true;
        } else {
            console.log(`No se pudo jugar la carta ID: ${cardInstanceId} por ${player.name}.`);
            // La razón del fallo se loguea en Player.playCard
            // UI.showMessage("No se pudo jugar la carta.", true); // Opcional: feedback visual
            return false;
        }
    }

     /**
     * Maneja la declaración de un ataque de un Desafiante a un objetivo.
     * @param {PlayerID} attackerPlayerId - Quién ataca.
     * @param {string} attackerInstanceId - ID de la carta atacante.
     * @param {string | PlayerID} targetId - ID de la carta objetivo o ID del jugador objetivo.
     */
    playerDeclareAttack(attackerPlayerId, attackerInstanceId, targetId) {
        if (this.gameEnded || attackerPlayerId !== this.currentPlayerId) return;

        const attackerPlayer = this.players[attackerPlayerId];
        const opponentPlayerId = (attackerPlayerId === PlayerID.PLAYER) ? PlayerID.OPPONENT : PlayerID.PLAYER;
        const opponentPlayer = this.players[opponentPlayerId];

        /** @type {ChallengerCard | undefined} */
        const attackerCard = attackerPlayer.field.find(c => c.instanceId === attackerInstanceId);

        // 1. Validar Atacante
        if (!attackerCard || !(attackerCard instanceof ChallengerCard)) {
            console.error("Error: Atacante inválido o no encontrado.");
            return;
        }
        if (!attackerCard.isAbleToAttack()) {
            console.log(`${attackerCard.name} no puede atacar ahora (girado o con mareo).`);
            if (attackerPlayerId === PlayerID.PLAYER) { // Solo mostrar mensaje al jugador humano
                UI.logMessage(`${attackerCard.name} no puede atacar.`);
            }
            return;
        }

        // 2. Determinar y Validar Objetivo
        /** @type {ChallengerCard | null} */
        let targetCard = null;
        /** @type {Player | null} */
        let targetPlayer = null;
        let isDirectAttack = false;

        if (targetId === PlayerID.PLAYER || targetId === PlayerID.OPPONENT) {
            // Ataque directo al jugador
            if (targetId !== opponentPlayerId) {
                 console.error("Error: Intento de atacar al jugador incorrecto.");
                 return;
            }
            targetPlayer = opponentPlayer;
            isDirectAttack = true;
            // Validar si hay defensores (regla común "provocar" o "taunt")
            // Simplificado: Permitir ataque directo solo si el oponente no tiene Desafiantes
            // Añadir lógica de "Taunt" aquí si se implementa
            const taunters = opponentPlayer.field.filter(c => c instanceof ChallengerCard /* && c.hasTaunt */); // Placeholder for taunt
            if (taunters.length > 0) {
                 console.log("Ataque directo fallido: El oponente tiene Desafiantes con Provocar (o simplemente Desafiantes).");
                 if (attackerPlayerId === PlayerID.PLAYER) {
                    UI.showMessage("Debes atacar a los Desafiantes enemigos primero.");
                 }
                 return; // Detener el ataque
            }
             console.log(`${attackerCard.name} ataca directamente a ${targetPlayer.name}`);
             // UI.logMessage ya se hizo en la IA o se hará si es el jugador
        } else {
            // Ataque a una carta Desafiante
            targetCard = opponentPlayer.field.find(c => c.instanceId === targetId);
            if (!targetCard || !(targetCard instanceof ChallengerCard)) {
                console.error(`Error: Objetivo de ataque inválido o no encontrado (ID: ${targetId}).`);
                return;
            }
             // Validar si hay Provocar y este no es el objetivo
             const taunters = opponentPlayer.field.filter(c => c instanceof ChallengerCard /* && c.hasTaunt */);
             if (taunters.length > 0 && !taunters.some(t => t.instanceId === targetId)) {
                 console.log(`Ataque a ${targetCard.name} fallido: Hay Desafiantes con Provocar.`);
                  if (attackerPlayerId === PlayerID.PLAYER) {
                    UI.showMessage("Debes atacar a un Desafiante con Provocar.");
                 }
                 return;
             }
             console.log(`${attackerCard.name} (${attackerCard.attack} atk) ataca a ${targetCard.name} (${targetCard.currentHealth} hp)`);
             // UI.logMessage ya se hizo en la IA o se hará si es el jugador
        }

        // 3. Ejecutar Combate y Registrar Ataque
        // Registrar ataque ANTES de aplicar daño por si hay efectos "al atacar"
        attackerCard.registerAttack(); // Marcar como atacado (y girar si es necesario)

        // --- Aquí irían efectos "antes del combate" ---

        // 4. Calcular y Aplicar Daño
        if (isDirectAttack && targetPlayer) {
            targetPlayer.takeDamage(attackerCard.attack);
        } else if (targetCard) {
            targetCard.takeDamage(attackerCard.attack);
            // Lógica de contraataque (si las reglas lo incluyen)
            // if (targetCard.currentHealth > 0 && targetCard.attack > 0 && targetCard.isReady) { // Solo si está listo?
            //     console.log(`${targetCard.name} contraataca.`);
            //     attackerCard.takeDamage(targetCard.attack);
            //     UI.logMessage(`${targetCard.name} contraataca a ${attackerCard.name}.`);
            // }
        }

        // --- Aquí irían efectos "después del combate" ---

        // 5. Comprobar Muertes y Actualizar Estado
        this.checkDeaths(opponentPlayerId); // Comprobar muertes en el defensor
        // this.checkDeaths(attackerPlayerId); // Comprobar muertes en atacante (si hubo contraataque)

        // Comprobar si el juego terminó debido al combate
        // checkWinCondition actualiza el estado interno
        this.checkWinCondition();

        // Actualizar UI siempre después del combate, incluso si el juego termina
        UI.updateUI(this);

        // Si el juego terminó, llamar a endGame para el mensaje final y bloqueo
        if (this.gameEnded) {
            this.endGame();
        }
    }

    /**
     * Revisa las cartas en el campo de un jugador y mueve las que tengan vida <= 0 al descarte.
     * @param {PlayerID} playerId - El ID del jugador cuyo campo revisar.
     */
    checkDeaths(playerId) {
        const player = this.players[playerId];
        if (!player || player.field.length === 0) return; // Salir si no hay jugador o campo

        const deadCards = [];
        // Usar filter para crear una nueva lista de supervivientes
        const survivors = player.field.filter(card => {
            // Asegurarse que es un Desafiante antes de chequear vida
            if (card instanceof ChallengerCard && card.currentHealth <= 0) {
                console.log(`${card.name} (${player.name}) ha sido destruido (Vida: ${card.currentHealth}).`);
                UI.logMessage(`${card.name} (${player.name}) fue destruido.`);
                deadCards.push(card); // Guardar para mover al descarte
                return false; // No incluir en la lista de supervivientes
            }
            return true; // Mantener en la lista de supervivientes
        });

        // Solo actualizar si hubo cambios
        if (deadCards.length > 0) {
            // Actualizar el campo del jugador con los supervivientes
            player.field = survivors;

            // Mover las cartas muertas al descarte
            deadCards.forEach(deadCard => {
                // Asegurarse que la carta no esté ya en el descarte por algún efecto
                if (deadCard.currentZone !== Zone.DISCARD) {
                    player.moveCardToZone(deadCard, Zone.DISCARD);
                }
            });
             // No actualizar UI aquí, se hace después del ataque completo
        }
    }


    /**
     * Comprueba si algún jugador ha cumplido una condición de victoria/derrota.
     * Actualiza el estado `gameEnded` y `winner`.
     * @returns {boolean} True si el juego ha terminado, false en caso contrario.
     */
    checkWinCondition() {
        // Si ya terminó, no comprobar de nuevo para evitar logs repetidos
        if (this.gameEnded) return true;

        const player = this.players[PlayerID.PLAYER];
        const opponent = this.players[PlayerID.OPPONENT];

        let ended = false;
        // Comprobar derrota por vida <= 0 o por mazo vacío (marcado en Player.hasLost)
        if (player.hasLost || player.life <= 0) {
            this.winner = PlayerID.OPPONENT;
            ended = true;
             console.log(`Condición de victoria: ${player.name} ha perdido.`);
        } else if (opponent.hasLost || opponent.life <= 0) {
            this.winner = PlayerID.PLAYER;
            ended = true;
             console.log(`Condición de victoria: ${opponent.name} ha perdido.`);
        }

        if (ended) {
            this.gameEnded = true; // Marcar solo si realmente terminó
        }

        return this.gameEnded;
    }

    /**
     * Finaliza la partida, muestra el resultado y deshabilita acciones.
     * Se asegura de llamarse solo una vez.
     */
    endGame() {
        // Asegurar que solo se ejecute una vez
        if (!this.gameEnded) {
             console.warn("endGame llamado pero checkWinCondition no detectó fin. Forzando fin.");
             // Intentar determinar ganador de nuevo si es posible
             this.checkWinCondition();
             if (!this.gameEnded) { // Si sigue sin detectarse, es un error
                  console.error("Error crítico: No se pudo determinar el ganador en endGame.");
                  this.gameEnded = true; // Forzar fin de todos modos
                  this.winner = null; // Indicar empate o error
             }
        }

        // Evitar mostrar mensaje de victoria múltiple si ya se mostró
        if (UI.elements.messageOverlay.classList.contains('hidden')) {
            const winnerName = this.winner ? this.players[this.winner].name : 'Nadie (Empate?)';
            const message = `¡Partida Terminada! Ganador: ${winnerName}`;

            console.log(message);
            UI.logMessage(message);
            UI.showMessage(message); // Mostrar mensaje modal

            // Deshabilitar acciones principales
            UI.elements.endTurnButton.disabled = true;
            // Añadir clase al body o contenedor principal para deshabilitar clics en cartas?
            document.body.classList.add('game-over'); // Necesita CSS para .game-over { pointer-events: none; } en zonas clave
        }
    }
}
