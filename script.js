// script.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, runTransaction, serverTimestamp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Imposta il livello di log per il debug di Firestore
setLogLevel('debug');

// Configurazione Firebase fornita dall'utente 
const rawFirebaseConfig = {
    apiKey: "AIzaSyAV03nyfn-IFQ5GlYNKXovrGvrDobqdaGQ",
    authDomain: "lega-fantacalcio-unica-2024.firebaseapp.com",
    projectId: "lega-fantacalcio-unica-2024",
    storageBucket: "lega-fantacalcio-unica-2024.firebasestorage.app",
    messagingSenderId: "219665032240",
    appId: "1:219665032240:web:14cfa85e5186384cc339f5",
    measurementId: "G-4WFPVEF886"
};

// Determina la configurazione (usa la variabile globale se disponibile, altrimenti usa quella raw)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : rawFirebaseConfig;

// VARIABILE GLOBALE DI ACCESSO
const GLOBAL_ACCESS_PASSWORD = 'scarso';

// Variabili Globali
let app;
let db;
let auth;
let userId = null;
let currentTeam = null;
let isAuthReady = false;
let teams = []; // Cache di tutte le squadre per l'admin e la visualizzazione del draft
let draftPlayers = []; // Cache dei giocatori disponibili per il draft
let hasGlobalAccess = false; // Nuovo stato di accesso globale

// Stato locale per il draft (Include ora draftOrder, currentTurnIndex e roundNumber)
let draftStatus = { 
    isDraftActive: false,
    draftOrder: [], // Array di ID squadra in ordine di draft
    currentTurnIndex: 0, // Indice della squadra che deve draftare
    roundNumber: 1 // NUOVO: Traccia il round attuale (per reset)
}; 

// Configurazione dell'ID dell'App per i percorsi Firestore
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;
const PLAYER_COLLECTION_NAME = 'draft_players';
const TEAM_COLLECTION_NAME = 'teams';
const DRAFT_STATUS_DOC_NAME = 'config/draft_status'; // Path del documento per lo stato del draft
// Limite di 1 giocatore per turno
const MAX_PLAYERS_PER_TEAM_PER_ROUND = 1; 
// Limite totale per la rosa (utilizzato solo per la visualizzazione)
const FINAL_ROSTER_SIZE = 99; 

// LINK ESTERNI PER CLASSIFICA E RISULTATI (SOSTITUISCI QUESTI CON I TUOI LINK REALI)
const CLASSIFICA_IMAGE_URL = 'https://i.imgur.com/example_classifica.png'; // SOSTITUISCI QUI!
const RISULTATI_IMAGE_URL = 'https://i.imgur.com/example_risultati.png';   // SOSTITUISCI QUI!


// --- FUNZIONE UTILITY PER LIVELLO CASUALE ---

/**
 * Genera un numero intero casuale tra min (incluso) e max (incluso).
 * @param {number} min Il livello minimo.
 * @param {number} max Il livello massimo.
 * @returns {number} Il livello casuale generato.
 */
const getRandomLevel = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    // Math.random() * (max - min + 1) genera un numero tra 0 e (max - min + 1)
    // Math.floor(...) lo arrotonda per difetto, + min sposta il range.
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Genera un ordine casuale per l'array di ID squadra.
 * @param {Array<string>} teamIds - Array di ID squadra.
 * @returns {Array<string>} Array di ID squadra mischiato.
 */
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- FUNZIONE UTILITY PER MODALE DI CONFERMA CUSTOM ---

/**
 * Mostra una modale di conferma personalizzata (sostituisce window.confirm).
 * @param {string} message - Il messaggio da visualizzare.
 * @returns {Promise<boolean>} Risolve a true se confermato, false altrimenti.
 */
const showConfirmationModal = (message) => {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmation-modal');
        const modalText = document.getElementById('modal-text');
        const btnConfirm = document.getElementById('modal-confirm');
        const btnCancel = document.getElementById('modal-cancel');

        modalText.textContent = message;
        modal.classList.remove('hidden');

        const handleConfirm = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            btnConfirm.removeEventListener('click', handleConfirm);
            btnCancel.removeEventListener('click', handleCancel);
        };

        btnConfirm.addEventListener('click', handleConfirm);
        btnCancel.addEventListener('click', handleCancel);
    });
};


// --- INIZIALIZZAZIONE FIREBASE E AUTENTICAZIONE ---

async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Autenticazione con token personalizzato o anonima
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Listener per lo stato di autenticazione
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
            }
            isAuthReady = true;

            // Il rendering finale viene gestito dopo la verifica della password globale
            if (userId) {
                if (!hasGlobalAccess) {
                    renderGlobalAccess();
                } else if (!currentTeam) {
                    renderLogin();
                } else {
                    currentTeam.isAdmin ? renderAdmin() : renderHomepage();
                }
            } else {
                 document.getElementById('content').innerHTML = `
                    <div class="error-message">Errore Auth: Impossibile ottenere un ID utente. Controlla la configurazione Firebase Auth.</div>
                 `;
            }
            lucide.createIcons(); // Inizializza le icone
        });

    } catch (error) {
        console.error("ERRORE GRAVE NELL'INIZIALIZZAZIONE DI FIREBASE:", error);
        document.getElementById('content').innerHTML = `
            <div class="error-message">Errore grave: Impossibile connettersi al database. Controlla la console per i dettagli.</div>
        `;
    }
}

// --- FUNZIONI DI UTILITY PER I PATH FIREBASE ---

// Percorso per i dati pubblici (Squadre e Giocatori Draft)
const getPublicCollectionRef = (collectionName) => {
    // Path: artifacts/{appId}/public/data/{collectionName}
    return collection(db, `artifacts/${appId}/public/data/${collectionName}`);
};

// Path per il documento di stato del draft
const getDraftStatusDocRef = () => {
    // Path: artifacts/{appId}/public/data/config/draft_status
    return doc(db, `artifacts/${appId}/public/data/${DRAFT_STATUS_DOC_NAME}`);
};

/**
 * Carica in modo esplicito la lista delle squadre se la cache locale `teams` è vuota o per un refresh garantito.
 */
const fetchTeams = async () => {
    try {
        const teamsSnapshot = await getDocs(getPublicCollectionRef(TEAM_COLLECTION_NAME));
        teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Errore nel caricamento esplicito delle squadre:", error);
        teams = [];
    }
};

// --- FUNZIONI DI RENDERIZZAZIONE ---

const setContent = (html) => {
    document.getElementById('content').innerHTML = html;
    lucide.createIcons(); // Inizializza le icone dopo il rendering
};

const renderGlobalAccess = (message = '') => {
    document.getElementById('header-title').textContent = "Accesso alla Lega";
    const globalAccessHtml = `
        <div class="max-w-md mx-auto p-8 bg-white rounded-xl shadow-xl border border-gray-100">
            <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Accesso Riservato</h2>
            ${message ? `<div class="error-message">${message}</div>` : ''}
            <form id="global-access-form" class="space-y-6">
                <div>
                    <label for="globalPassword" class="block text-sm font-medium text-gray-700 mb-1">Password d'Accesso alla Lega</label>
                    <div class="relative">
                        <i data-lucide="key" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-600"></i>
                        <input type="password" id="globalPassword" required class="input-style mt-1 pl-10" placeholder="Inserisci la password globale">
                    </div>
                </div>
                <button type="submit" class="btn-secondary w-full bg-yellow-500 hover:bg-yellow-600">
                    <i data-lucide="unlock" class="w-5 h-5"></i>
                    Sblocca Lega
                </button>
            </form>
        </div>
    `;
    setContent(globalAccessHtml);
    document.getElementById('global-access-form').addEventListener('submit', handleGlobalAccess);
};
window.renderGlobalAccess = renderGlobalAccess; // Esposizione per l'uso interno

const handleGlobalAccess = (e) => {
    e.preventDefault();
    const password = document.getElementById('globalPassword').value.trim();

    if (password === GLOBAL_ACCESS_PASSWORD) {
        hasGlobalAccess = true;
        startDataListeners(); // Inizializza i listener anche qui per avere subito lo stato del draft
        renderLogin();
    } else {
        renderGlobalAccess("Password errata. Riprova.");
    }
};

const renderLogin = (message = '') => {
    document.getElementById('header-title').textContent = "Accesso alla Lega Fantacalcio";
    const loginHtml = `
        <div class="max-w-md mx-auto p-8 bg-white rounded-xl shadow-xl border border-gray-100">
            ${message ? `<div class="error-message">${message}</div>` : ''}
            <form id="login-form" class="space-y-6">
                <div>
                    <label for="teamName" class="block text-sm font-medium text-gray-700 mb-1">Di che squadra sei il presidente?</label>
                    <div class="relative">
                        <i data-lucide="shield" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500"></i>
                        <input type="text" id="teamName" required class="input-style mt-1 pl-10" placeholder="Nome Squadra (es. 'Magic Team')" autocomplete="off">
                    </div>
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div class="relative">
                        <i data-lucide="lock" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500"></i>
                        <input type="password" id="password" required class="input-style mt-1 pl-10" placeholder="Inserisci la password">
                    </div>
                </div>
                <button type="submit" class="btn-primary w-full">
                    <i data-lucide="log-in" class="w-5 h-5"></i>
                    Accedi o Registrati
                </button>
            </form>
            
            <hr class="my-6 border-gray-200">

            <div class="space-y-4">
                <p class="text-lg font-bold text-gray-700 text-center">Info Lega</p>
                
                <a href="${CLASSIFICA_IMAGE_URL}" target="_blank" class="w-full text-white font-semibold py-2 px-4 rounded-lg transition duration-150 bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center shadow-lg">
                    <i data-lucide="bar-chart-3" class="w-5 h-5 mr-2"></i>
                    Classifica Aggiornata
                </a>
                
                <a href="${RISULTATI_IMAGE_URL}" target="_blank" class="w-full text-white font-semibold py-2 px-4 rounded-lg transition duration-150 bg-teal-500 hover:bg-teal-600 flex items-center justify-center shadow-lg">
                    <i data-lucide="receipt-text" class="w-5 h-5 mr-2"></i>
                    Risultati Giornata
                </a>
            </div>

            <p class="mt-6 text-xs text-gray-500 text-center">ID Utente Firebase: <span class="font-mono text-xs text-green-600 break-all">${userId || 'N/A'}</span></p>
        </div>
    `;
    setContent(loginHtml);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
};

const renderHomepage = () => {
    if (!currentTeam) return renderLogin("Errore: Dati squadra non disponibili.");

    document.getElementById('header-title').textContent = `${currentTeam.name} - Homepage`;

    // Lista dei giocatori
    const playersListHtml = currentTeam.players && currentTeam.players.length > 0
        ? currentTeam.players.map(p => `
            <li class="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center text-gray-700 shadow-sm">
                <span>
                    <i data-lucide="user" class="inline w-4 h-4 mr-2 text-blue-500"></i>
                    ${p.name} - ${p.role} 
                    ${p.level ? `(Livello: <span class="font-bold text-green-600">${p.level}</span>)` : `(Range: ${p.minLevel}/${p.maxLevel})`}
                    (Rnd: ${p.roundNumber || '1'})
                </span>
                </li>
        `).join('')
        : '<li class="text-center text-gray-500 p-4 bg-gray-100 rounded-lg border border-gray-200">Ancora nessun giocatore in squadra. Vai al Draft!</li>';

    const homepageHtml = `
        <div class="space-y-8">
            <div class="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-lg">
                <h2 class="text-xl font-bold text-blue-700 mb-3 flex items-center">
                    <i data-lucide="badge-check" class="w-5 h-5 mr-2 text-blue-500"></i>
                    I Miei Dettagli Squadra
                </h2>
                <p class="text-gray-700 mb-4">Nome Squadra (Login): <span class="font-mono bg-blue-100 px-2 py-1 rounded text-sm text-blue-700">${currentTeam.name}</span></p>
                <div class="mt-4">
                    <label for="presidentName" class="block text-sm font-medium text-gray-700 mb-1">Nome Presidente (Modificabile)</label>
                    <input type="text" id="presidentName" value="${currentTeam.presidentName}" class="input-style max-w-md" onchange="updatePresidentName(this.value)">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onclick="renderDraft()" class="btn-primary">
                    <i data-lucide="rocket" class="w-5 h-5"></i>
                    Area Draft
                </button>
                <button onclick="logout()" class="btn-secondary bg-red-500 hover:bg-red-600">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    Logout
                </button>
            </div>

            <div>
                <h2 class="text-xl font-bold text-gray-700 mb-4 flex items-center">
                    <i data-lucide="users" class="w-5 h-5 mr-2 text-green-500"></i>
                    Rosa Giocatori (${currentTeam.players ? currentTeam.players.length : 0}/${FINAL_ROSTER_SIZE})
                </h2>
                <ul id="players-list" class="space-y-3">
                    ${playersListHtml}
                </ul>
            </div>
        </div>
    `;
    setContent(homepageHtml);
};

window.renderDraft = async () => {
    document.getElementById('content').innerHTML = `
        <div class="text-center text-gray-500">Caricamento dati Draft...</div>
    `;
    document.getElementById('header-title').textContent = "Area Draft - Giocatori Disponibili";

    // **CORREZIONE CACHE**: Garantisce che la lista squadre sia caricata prima di usare i nomi nell'ordine
    if (!currentTeam.isAdmin) {
        await fetchTeams(); // Forza il ricaricamento completo per l'utente normale
    }
    
    // Logica per il turno e lo stato del draft
    const draftOrderLength = draftStatus.draftOrder?.length || 0;
    
    // Assicura che currentTurnIndex sia valido. 
    const turnIndex = draftStatus.currentTurnIndex < draftOrderLength ? draftStatus.currentTurnIndex : draftOrderLength > 0 ? draftOrderLength - 1 : 0;
    
    const currentTurnTeamId = draftOrderLength > 0 && draftStatus.currentTurnIndex < draftOrderLength ? draftStatus.draftOrder[draftStatus.currentTurnIndex] : null;
    const isMyTurn = currentTurnTeamId === currentTeam.id;
    
    // CERCA IL NOME DELLA SQUADRA CORRETTA
    const teamIdForDisplay = currentTurnTeamId || (draftOrderLength > 0 ? draftStatus.draftOrder[turnIndex] : null);
    const currentTurnTeam = teams.find(t => t.id === teamIdForDisplay) || { name: 'Squadra Sconosciuta' };
    
    // Tracking del round
    const currentRoundNumber = draftStatus.roundNumber || 1;
    const hasDraftedThisRound = currentTeam.players?.some(p => p.roundNumber === currentRoundNumber) || false;
    
    // Determina se il Draft è Finito (tutte le squadre hanno avuto un turno)
    const isDraftFinished = draftStatus.currentTurnIndex >= draftOrderLength && draftOrderLength > 0 && !draftStatus.isDraftActive;
    
    let draftMessageHtml = '';
    let draftTableHtml = '';

    if (!draftStatus.isDraftActive && !isDraftFinished) {
        // Draft fermo dall'admin (non ancora iniziato o resettato)
        draftMessageHtml = `
            <div class="text-center text-red-700 p-8 bg-red-100 rounded-xl border border-red-400">
                <i data-lucide="gavel" class="w-8 h-8 mx-auto mb-4"></i>
                <h3 class="text-xl font-bold">Draft non attivo!</h3>
                <p>L'Admin non ha ancora avviato la sessione di Draft (Round ${currentRoundNumber}). Riprova più tardi.</p>
            </div>
        `;
    } else if (isDraftFinished) {
         // Draft completato
        draftMessageHtml = `
            <div class="text-center text-blue-700 p-8 bg-blue-100 rounded-xl border border-blue-400">
                <i data-lucide="trophy" class="w-8 h-8 mx-auto mb-4"></i>
                <h3 class="text-xl font-bold">Draft Round ${currentRoundNumber} Completato!</h3>
                <p>Tutte le squadre hanno avuto il loro turno. L'Admin deve avviare il prossimo round.</p>
            </div>
        `;
    } else {
        // --- LOGICA ATTIVA ---
        
        // Controlliamo se la squadra ha già draftato in questo round specifico.
        if (hasDraftedThisRound) {
            // Se ha draftato in questo round, deve aspettare che il draft finisca o che il round cambi.
             draftMessageHtml = `
                <div class="p-4 rounded-xl border border-blue-400 bg-blue-100 text-blue-800">
                    <p class="text-lg font-semibold flex items-center justify-center">
                        <i data-lucide="check-circle" class="w-6 h-6 mr-2"></i>
                        Hai già draftato un giocatore in questo Round (${currentRoundNumber}). Attendi che l'Admin avvii il prossimo giro.
                    </p>
                </div>
            `;
        } else {
            // Visualizzazione del Turno NORMALE
            const turnStatusClass = isMyTurn ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800';
            const turnStatusIcon = isMyTurn ? 'megaphone' : 'watch';
            
            const turnStatusText = isMyTurn 
                ? 'È il tuo turno! Scegli rapidamente il tuo giocatore.'
                : `Attendi il tuo turno. Attualmente sta draftando: <strong class="text-red-700">${currentTurnTeam.name}</strong>.`;

            draftMessageHtml = `
                <div class="p-4 rounded-xl border ${turnStatusClass} mb-4">
                    <p class="text-lg font-semibold flex items-center">
                        <i data-lucide="${turnStatusIcon}" class="w-6 h-6 mr-2"></i>
                        ${turnStatusText} (Round ${currentRoundNumber})
                    </p>
                </div>
                <div class="p-4 rounded-xl border border-yellow-400 bg-yellow-100 text-yellow-800">
                    <p class="text-sm font-semibold flex items-center">
                        <i data-lucide="alert-triangle" class="w-5 h-5 mr-2"></i>
                        Seleziona un giocatore. Il suo livello verrà estratto casualmente dal range Min/Max. (1 solo giocatore consentito per questo giro).
                    </p>
                </div>
            `;

            if (!draftPlayers || draftPlayers.length === 0) {
                draftMessageHtml += `
                    <div class="text-center text-gray-500 p-8 bg-gray-100 rounded-xl border border-gray-200 mt-4">Nessun giocatore disponibile nel draft al momento.</div>
                `;
            } else {
                // Tabella dei giocatori
                 draftTableHtml = `
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden border border-gray-200">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruolo</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Età</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livello (Min/Max)</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azione</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200" id="draft-players-table">
                                ${draftPlayers.map(p => `
                                    <tr class="text-gray-700 hover:bg-green-50 transition duration-100">
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${p.name}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm">${p.role}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm">${p.age}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-color">${p.minLevel} / ${p.maxLevel}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                            <button onclick="draftPlayer('${p.id}')" 
                                                    class="text-white text-xs font-bold py-2 px-4 rounded-full transition duration-150 ${isMyTurn ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}"
                                                    ${isMyTurn ? '' : 'disabled'}>
                                                Drafta
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        }
    }

    // Costruzione dell'HTML finale
    const finalHtml = `
        <div class="space-y-6">
            <button onclick="renderHomepage()" class="btn-secondary bg-gray-500 hover:bg-gray-600">
                <i data-lucide="arrow-left" class="w-5 h-5"></i>
                Torna alla Homepage
            </button>
            
            ${draftMessageHtml}
            ${draftTableHtml}

            ${draftOrderLength > 0 ? `
                <div class="p-4 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
                    <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center">
                        <i data-lucide="list-ordered" class="w-5 h-5 mr-2 text-indigo-500"></i>
                        Ordine di Draft (Turno ${draftStatus.currentTurnIndex + 1}/${draftOrderLength})
                    </h3>
                    <ul class="space-y-1 text-sm">
                        ${draftStatus.draftOrder.map((teamId, index) => {
                            // Cerca la squadra nella cache globale `teams`
                            const team = teams.find(t => t.id === teamId);
                            const teamName = team?.name || 'Squadra Sconosciuta';
                            const isCurrent = index === draftStatus.currentTurnIndex;
                            
                            // Controlla se la squadra ha draftato nel round corrente
                            const hasDraftedInCurrentRound = team?.players?.some(p => p.roundNumber === currentRoundNumber) || false;

                            const isPast = index < draftStatus.currentTurnIndex; 
                            
                            const statusClass = isCurrent ? 'bg-yellow-200 border-yellow-500 font-bold' : 
                                                hasDraftedInCurrentRound ? 'bg-green-100 border-green-300' : 
                                                isPast ? 'bg-red-100 border-red-300 line-through' :
                                                'bg-gray-50 border-gray-200';
                            const statusIcon = isCurrent ? 'chevrons-right' : hasDraftedInCurrentRound ? 'check' : 'minus';

                            return `
                                <li class="p-2 rounded-lg border flex items-center ${statusClass}">
                                    <i data-lucide="${statusIcon}" class="w-4 h-4 mr-2"></i>
                                    #${index + 1}: ${teamName} 
                                    ${isCurrent ? '(Turno Attuale)' : hasDraftedInCurrentRound ? '(Draftato in Round ' + currentRoundNumber + ')' : isPast ? '(Saltato/Assente)' : ''}
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    setContent(finalHtml);
};

// Nuova vista per l'Admin per gestire la rosa di una squadra specifica
const renderAdminTeamView = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return renderAdmin();

    document.getElementById('header-title').textContent = `Admin: Gestione Rosa di ${team.name}`;

    const playersListHtml = team.players && team.players.length > 0
        ? team.players.map(p => `
            <li class="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-center text-gray-700 shadow-sm">
                <span>
                    <i data-lucide="user" class="inline w-4 h-4 mr-2 text-blue-500"></i>
                    ${p.name} - ${p.role} (Livello: <span class="font-bold text-green-600">${p.level || 'N/D'}</span>) (Rnd: ${p.roundNumber || '1'})
                </span>
                <button onclick="window.removePlayerFromTeamAdmin('${teamId}', '${p.id}', '${p.name}', ${p.minLevel}, ${p.maxLevel})" class="text-red-500 hover:text-red-700 text-sm font-semibold transition">
                    <i data-lucide="trash-2" class="inline w-4 h-4"></i> Rimuovi
                </button>
            </li>
        `).join('')
        : '<li class="text-center text-gray-500 p-4 bg-gray-100 rounded-lg border border-gray-200">Questa squadra non ha giocatori.</li>';

    const teamViewHtml = `
        <div class="space-y-6">
            <button onclick="renderAdmin()" class="btn-secondary bg-gray-500 hover:bg-gray-600">
                <i data-lucide="arrow-left" class="w-5 h-5"></i>
                Torna all'Area Admin
            </button>
            
            <div class="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-lg">
                <h3 class="text-xl font-bold text-blue-700 mb-2">Dettagli Squadra</h3>
                <p>Presidente: ${team.presidentName}</p>
                <p>Giocatori in rosa: ${team.players ? team.players.length : 0}/${FINAL_ROSTER_SIZE}</p>
            </div>

            <div>
                <h3 class="text-xl font-bold text-gray-700 mb-4 flex items-center">
                    <i data-lucide="users" class="w-5 h-5 mr-2 text-red-500"></i>
                    Rosa Attuale (Rimuovi Giocatori)
                </h3>
                <ul class="space-y-3">
                    ${playersListHtml}
                </ul>
            </div>
        </div>
    `;
    setContent(teamViewHtml);
};
window.renderAdminTeamView = renderAdminTeamView;

// NUOVA FUNZIONE: Avanza al Round Successivo
window.advanceToNextRound = async () => {
    if (!currentTeam || !currentTeam.isAdmin) return;

    const currentRound = draftStatus.roundNumber || 1;
    const confirmation = await showConfirmationModal(`Sei sicuro di voler avviare il Round ${currentRound + 1}? Questo resetterà l'ordine di draft e permetterà a tutte le squadre di draftare un altro giocatore.`);
    if (!confirmation) return;

    try {
        const docRef = getDraftStatusDocRef();

        // 1. Incrementa il round number
        const newRoundNumber = currentRound + 1;

        // 2. Ricarica la lista squadre e rimescola l'ordine
        const teamsSnapshot = await getDocs(getPublicCollectionRef(TEAM_COLLECTION_NAME));
        teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        let teamIds = teams.map(t => t.id); 
        const shuffledOrder = shuffleArray(teamIds);
        
        await setDoc(docRef, { 
            isDraftActive: true, 
            draftOrder: shuffledOrder, // Nuovo ordine casuale
            currentTurnIndex: 0, // Reset del turno
            roundNumber: newRoundNumber, // Nuovo round number
            lastUpdated: serverTimestamp() 
        }, { merge: true });

        // Dopo l'aggiornamento, il listener re-renderizzerà la vista Admin.
        alert(`Round ${newRoundNumber} avviato con successo!`);
    } catch (error) {
        console.error("Errore nell'avanzamento al round successivo:", error);
        alert("Errore nell'avanzamento del round. Controlla la console.");
    }
};
window.advanceToNextRound = advanceToNextRound;

const renderAdmin = () => {
    document.getElementById('header-title').textContent = "Area Admin (serieseria)";

    // Logica per il pulsante Draft
    const draftButtonText = draftStatus.isDraftActive ? 'Ferma il Draft' : 'Avvia il Draft';
    const draftButtonColor = draftStatus.isDraftActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
    const draftButtonIcon = draftStatus.isDraftActive ? 'lock' : 'check-circle';
    const draftButtonAction = draftStatus.isDraftActive ? 'updateDraftStatus(false)' : 'updateDraftStatus(true)';

    const draftOrderLength = draftStatus.draftOrder?.length || 0;
    const currentTurnTeamName = teams.find(t => t.id === draftStatus.draftOrder[draftStatus.currentTurnIndex])?.name || 'N/D';
    const currentRound = draftStatus.roundNumber || 1;

    // Determina se tutti i turni del round sono stati usati (anche se il draft è fermo)
    const isRoundFinished = draftOrderLength > 0 && draftStatus.currentTurnIndex >= draftOrderLength;
    
    // Lista di tutte le squadre registrate
    const teamsListHtml = teams.length > 0
        ? teams.map(t => `
            <li class="p-3 bg-white rounded-lg border border-gray-200 flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 text-gray-700 shadow-sm">
                <div class="flex-grow text-left w-full md:w-auto">
                    <strong class="text-blue-600">${t.name}</strong> - Presidente: ${t.presidentName} (${t.players ? t.players.length : 0}/${FINAL_ROSTER_SIZE} gioc.)
                    <div class="text-xs text-gray-500 mt-1 break-all">Doc ID: ${t.id}</div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="window.renderAdminTeamView('${t.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-full transition duration-150">
                        <i data-lucide="eye" class="inline w-4 h-4"></i> Gestisci Rosa
                    </button>
                    <button onclick="window.removeTeam('${t.id}', '${t.name}')" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 px-4 rounded-full transition duration-150">
                        <i data-lucide="trash-2" class="inline w-4 h-4"></i> Rimuovi Squadra
                    </button>
                </div>
            </li>
        `).join('')
        : '<li class="text-center text-gray-500 p-4 bg-gray-100 rounded-lg border border-gray-200">Nessuna squadra registrata.</li>';

    // Lista dei giocatori nel draft con opzione di rimozione
    const draftListHtml = draftPlayers.length > 0
        ? draftPlayers.map(p => `
            <li class="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-center text-gray-700">
                <span>${p.name} - ${p.role} (Liv. ${p.minLevel}/${p.maxLevel})</span>
                <button onclick="removeDraftPlayer('${p.id}')" class="text-red-500 hover:text-red-700 text-sm font-semibold transition">
                    <i data-lucide="trash-2" class="inline w-4 h-4 mr-1"></i> Rimuovi
                </button>
            </li>
        `).join('')
        : '<li class="text-center text-gray-500 p-4 bg-gray-100 rounded-lg border border-gray-200">Il draft è vuoto. Aggiungi un giocatore!</li>';

    const adminHtml = `
        <div class="space-y-8">
            <button onclick="logout()" class="btn-secondary bg-red-500 hover:bg-red-600">
                <i data-lucide="log-out" class="w-5 h-5"></i>
                Logout Admin
            </button>
            
            <div class="p-6 bg-indigo-50 rounded-xl border border-indigo-200 shadow-lg text-center">
                <h2 class="text-xl font-bold text-indigo-700 mb-4 flex items-center justify-center">
                    <i data-lucide="settings" class="w-5 h-5 mr-2 text-indigo-500"></i>
                    Controllo Stato Draft (Round ${currentRound})
                </h2>
                <div class="flex flex-col space-y-3">
                    ${draftStatus.isDraftActive ? `
                        <button onclick="${draftButtonAction}" class="text-white text-lg font-bold py-3 px-8 rounded-xl transition duration-150 ${draftButtonColor}">
                            <i data-lucide="${draftButtonIcon}" class="w-6 h-6 inline mr-2"></i>
                            ${draftButtonText}
                        </button>
                    ` : isRoundFinished || draftOrderLength === 0 ? `
                        <button onclick="advanceToNextRound()" class="bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold py-3 px-8 rounded-xl transition duration-150">
                            <i data-lucide="chevrons-right" class="w-6 h-6 inline mr-2"></i>
                            Avvia Round ${draftOrderLength === 0 ? currentRound : currentRound + 1}
                        </button>
                    ` : `
                        <button onclick="updateDraftStatus(true)" class="text-white text-lg font-bold py-3 px-8 rounded-xl transition duration-150 bg-green-600 hover:bg-green-700">
                            <i data-lucide="check-circle" class="w-6 h-6 inline mr-2"></i>
                            Avvia il Draft
                        </button>
                    `}
                </div>
                
                <p class="mt-3 text-sm text-indigo-800">Stato Attuale: <strong class="font-extrabold ${draftStatus.isDraftActive ? 'text-red-700' : 'text-green-700'}">${draftStatus.isDraftActive ? 'ATTIVO' : 'FERMO'}</strong></p>
                <p class="text-xs text-gray-600 mt-2">Squadra al Turno ${draftStatus.currentTurnIndex + 1}/${draftOrderLength}: ${currentTurnTeamName}</p>
            </div>
            <div class="p-6 bg-green-50 rounded-xl border border-green-200 shadow-lg">
                <h2 class="text-xl font-bold text-green-700 mb-4 flex items-center">
                    <i data-lucide="plus-circle" class="w-5 h-5 mr-2 text-green-500"></i>
                    Aggiungi Giocatore al Draft
                </h2>
                <form id="add-player-form" class="space-y-4 grid grid-cols-1 md:col-span-2 gap-4">
                    <div><input type="text" id="pName" placeholder="Nome Giocatore" required class="input-style"></div>
                    <div><input type="text" id="pRole" placeholder="Ruolo (es. Att, Cen, Dif)" required class="input-style"></div>
                    <div><input type="number" id="pAge" placeholder="Età" min="15" max="50" required class="input-style"></div>
                    <div><input type="number" id="pMinLevel" placeholder="Livello Min (1-15)" min="1" max="15" required class="input-style"></div>
                    <div><input type="number" id="pMaxLevel" placeholder="Livello Max (1-15)" min="1" max="15" required class="input-style"></div>
                    <button type="submit" class="btn-primary col-span-1 md:col-span-2">
                        <i data-lucide="send" class="w-5 h-5"></i>
                        Aggiungi Giocatore
                    </button>
                </form>
            </div>

            <div class="p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                <h2 class="text-xl font-bold text-gray-700 mb-4 flex items-center">
                    <i data-lucide="list-checks" class="w-5 h-5 mr-2 text-blue-500"></i>
                    Giocatori nel Draft (${draftPlayers.length})
                </h2>
                <ul class="space-y-3 max-h-64 overflow-y-auto">
                    ${draftListHtml}
                </ul>
            </div>

            <div class="p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                <h2 class="text-xl font-bold text-gray-700 mb-4 flex items-center">
                    <i data-lucide="shield-half" class="w-5 h-5 mr-2 text-yellow-500"></i>
                    Gestione Squadre Registrate (${teams.length})
                </h2>
                <ul class="space-y-3 max-h-96 overflow-y-auto">
                    ${teamsListHtml}
                </ul>
            </div>
        </div>
    `;
    setContent(adminHtml);
    document.getElementById('add-player-form').addEventListener('submit', addDraftPlayer);
};

const handleLogin = async (e) => {
    e.preventDefault();
    const teamName = document.getElementById('teamName').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!teamName || !password) return;

    // 1. Caso Admin
    if (teamName.toLowerCase() === 'serieseria' && password === 'admin') {
        currentTeam = { name: 'serieseria', isAdmin: true };
        startDataListeners();
        renderAdmin();
        return;
    }

    // 2. Caso Squadra Utente
    try {
        const teamsRef = getPublicCollectionRef(TEAM_COLLECTION_NAME);
        // Cerca il nome della squadra in modo case-insensitive
        const q = query(teamsRef, where("nameLower", "==", teamName.toLowerCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Squadra non trovata -> REGISTRAZIONE
            if (password.length < 5) {
                return renderLogin("Registrazione fallita: La password deve avere almeno 5 caratteri.");
            }

            const newTeamData = {
                name: teamName,
                nameLower: teamName.toLowerCase(),  // Salva anche la versione in minuscolo per le ricerche case-insensitive
                presidentName: 'Presidente ' + teamName,
                password: password,
                players: [],
                createdAt: serverTimestamp(),
                firebaseUid: userId
            };
            const docRef = await addDoc(teamsRef, newTeamData);

            currentTeam = { id: docRef.id, ...newTeamData };
            startDataListeners();
            renderHomepage();
        } else {
            // Squadra trovata -> LOGIN
            const teamDoc = snapshot.docs[0];
            const teamData = teamDoc.data();

            if (teamData.password === password) {
                currentTeam = { id: teamDoc.id, ...teamData };
                startDataListeners();
                renderHomepage();
            } else {
                renderLogin("Accesso negato: Password errata per la squadra " + teamName);
            }
        }

    } catch (error) {
        console.error("Errore nel login/registrazione:", error);
        renderLogin("Si è verificato un errore durante l'accesso al database. Controlla la console per i dettagli.");
    }
};

window.logout = () => {
    currentTeam = null;
    // Interrompe tutti i listener attivi
    stopAllListeners();
    // Dopo il logout, si torna alla schermata di accesso globale per richiedere la password di lega.
    hasGlobalAccess = false;
    renderGlobalAccess("Logout effettuato.");
};

window.updatePresidentName = async (newName) => {
    if (!currentTeam || currentTeam.isAdmin) return;
    const newNameTrimmed = newName.trim();
    if (newNameTrimmed === currentTeam.presidentName || newNameTrimmed === "") return;

    try {
        const teamDocRef = doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), currentTeam.id);
        await updateDoc(teamDocRef, { presidentName: newNameTrimmed });
    } catch (error) {
        console.error("Errore nell'aggiornamento del nome presidente:", error);
        alert("Errore nell'aggiornamento del nome.");
    }
};

// --- FUNZIONI LISTENER DATI IN REAL-TIME ---

let teamsUnsub = null;
let draftUnsub = null;
let teamUnsub = null;
let draftStatusUnsub = null; 

const stopAllListeners = () => {
    if (teamsUnsub) teamsUnsub();
    if (draftUnsub) draftUnsub();
    if (teamUnsub) teamUnsub();
    if (draftStatusUnsub) draftStatusUnsub(); 
    teamsUnsub = null;
    draftUnsub = null;
    teamUnsub = null;
    draftStatusUnsub = null; 
};

const startDataListeners = () => {
    stopAllListeners();

    // Listener Stato Draft (per Admin e Utenti)
    draftStatusUnsub = onSnapshot(getDraftStatusDocRef(), (docSnapshot) => {
        if (docSnapshot.exists()) {
            draftStatus = docSnapshot.data();
            // Assicura che le proprietà esistano, altrimenti usa i default
            if (typeof draftStatus.isDraftActive === 'undefined') draftStatus.isDraftActive = false;
            if (!draftStatus.draftOrder) draftStatus.draftOrder = [];
            if (typeof draftStatus.currentTurnIndex === 'undefined') draftStatus.currentTurnIndex = 0;
            if (typeof draftStatus.roundNumber === 'undefined') draftStatus.roundNumber = 1; // Default a Round 1
        } else {
            // Se il documento non esiste, usa i valori predefiniti
            draftStatus = { isDraftActive: false, draftOrder: [], currentTurnIndex: 0, roundNumber: 1 };
        }
        
        // Ricarica la vista se l'utente è sulla Draft o l'Admin è sulla Home Admin
        const currentTitle = document.getElementById('header-title').textContent;
        if (currentTitle.includes('Area Draft')) renderDraft();
        if (currentTitle.includes('Area Admin') && !currentTitle.includes('Gestione Rosa')) renderAdmin();
    }, (error) => console.error("Errore listener stato draft:", error));

    if (currentTeam && currentTeam.isAdmin) {
        // Admin: ascolta tutte le squadre e tutti i giocatori
        draftUnsub = onSnapshot(getPublicCollectionRef(PLAYER_COLLECTION_NAME), (snapshot) => {
            draftPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ricarica la vista Admin solo se l'admin è sulla pagina principale o sulla gestione draft
            const currentTitle = document.getElementById('header-title').textContent;
            if (currentTitle.includes('Area Admin') && !currentTitle.includes('Gestione Rosa')) renderAdmin();
        }, (error) => console.error("Errore listener draft admin:", error));

        // Admin ha il listener su tutte le squadre
        teamsUnsub = onSnapshot(getPublicCollectionRef(TEAM_COLLECTION_NAME), (snapshot) => {
            teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ricarica la vista Admin se l'admin è su una vista rilevante
            const currentTitle = document.getElementById('header-title').textContent;
            if (currentTitle.includes('Area Admin')) {
                const teamNameMatch = currentTitle.match(/Gestione Rosa di (.*)/);
                if (teamNameMatch) {
                    const teamName = teamNameMatch[1];
                    const team = teams.find(t => t.name === teamName);
                    if (team) renderAdminTeamView(team.id);
                } else {
                     renderAdmin();
                }
            }
        }, (error) => console.error("Errore listener teams admin:", error));

    } else if (currentTeam && currentTeam.id) {
        // Utente: ascolta solo la propria squadra e i giocatori del draft
        draftUnsub = onSnapshot(getPublicCollectionRef(PLAYER_COLLECTION_NAME), (snapshot) => {
            draftPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (document.getElementById('header-title').textContent.includes('Area Draft')) renderDraft();
        }, (error) => console.error("Errore listener draft utente:", error));

        teamUnsub = onSnapshot(doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), currentTeam.id), (docSnapshot) => {
            if (docSnapshot.exists()) {
                currentTeam = { id: docSnapshot.id, ...docSnapshot.data() };
                if (document.getElementById('header-title').textContent.includes('Homepage')) renderHomepage();
                if (document.getElementById('header-title').textContent.includes('Area Draft')) renderDraft(); // Aggiorna anche draft se cambia il numero giocatori
            } else {
                // Se la squadra viene eliminata dall'admin, l'utente viene disconnesso
                logout();
            }
        }, (error) => console.error("Errore listener squadra utente:", error));
    }
};


// --- FUNZIONI ADMIN (Gestione Dati) ---

/**
 * Aggiorna lo stato del Draft in Firestore.
 * @param {boolean} isActive - true per avviare, false per fermare.
 */
window.updateDraftStatus = async (isActive) => {
    if (!currentTeam || !currentTeam.isAdmin) return;
    try {
        const docRef = getDraftStatusDocRef();
        const currentRound = draftStatus.roundNumber || 1;

        if (isActive) {
            // Logica di AVVIO DRAFT: Genera l'ordine casuale
            
            // **IMPORTANTE**: Ricarichiamo la lista squadre per avere i dati più freschi
            const teamsSnapshot = await getDocs(getPublicCollectionRef(TEAM_COLLECTION_NAME));
            
            // Aggiorna la cache globale `teams` e usa i dati estratti per l'ordine
            teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            let teamIds = teams.map(t => t.id); 
            
            if (teamIds.length === 0) {
                 return alert("Non ci sono squadre registrate per avviare il draft.");
            }
            
            // Mescola gli ID
            const shuffledOrder = shuffleArray(teamIds);

            await setDoc(docRef, { 
                isDraftActive: true, 
                draftOrder: shuffledOrder, // Salva l'ordine casuale
                currentTurnIndex: 0, 
                roundNumber: currentRound, // Mantiene il round attuale
                lastUpdated: serverTimestamp() 
            }, { merge: true });

        } else {
            // Logica di STOP DRAFT: Resetta l'ordine
            await setDoc(docRef, { 
                isDraftActive: false,
                lastUpdated: serverTimestamp() 
            }, { merge: true });
        }
        
        // Il listener onSnapshot aggiornerà il rendering
    } catch (error) {
        console.error("Errore nell'aggiornamento dello stato del draft:", error);
        alert("Errore nell'aggiornamento dello stato del draft. Controlla la console.");
    }
};

const addDraftPlayer = async (e) => {
    e.preventDefault();
    if (!currentTeam || !currentTeam.isAdmin) return;

    const newPlayer = {
        name: document.getElementById('pName').value.trim(),
        role: document.getElementById('pRole').value.trim(),
        age: parseInt(document.getElementById('pAge').value),
        minLevel: parseInt(document.getElementById('pMinLevel').value),
        maxLevel: parseInt(document.getElementById('pMaxLevel').value),
        available: true,
        createdAt: serverTimestamp(),
    };

    if (!newPlayer.name || !newPlayer.role || isNaN(newPlayer.age) || isNaN(newPlayer.minLevel) || isNaN(newPlayer.maxLevel)) {
        return alert("Dati incompleti o non validi per il giocatore.");
    }

    try {
        await addDoc(getPublicCollectionRef(PLAYER_COLLECTION_NAME), newPlayer);
        document.getElementById('add-player-form').reset();
    } catch (error) {
        console.error("Errore nell'aggiunta del giocatore al draft:", error);
        alert("Errore nell'aggiunta del giocatore. Controlla la console.");
    }
};
window.addDraftPlayer = addDraftPlayer;

window.removeDraftPlayer = async (playerId) => {
    if (!currentTeam || !currentTeam.isAdmin) return;
    try {
        const playerDocRef = doc(getPublicCollectionRef(PLAYER_COLLECTION_NAME), playerId);
        await deleteDoc(playerDocRef);
    } catch (error) {
        console.error("Errore nella rimozione del giocatore dal draft:", error);
        alert("Errore nella rimozione del giocatore.");
    }
};

/**
 * Funzione per l'Admin per rimuovere un giocatore da una specifica rosa E reinserirlo nel draft.
 * @param {string} teamId - ID del documento della squadra.
 * @param {string} playerIdToRemove - ID (o nome, come fallback) del giocatore da rimuovere.
 * @param {string} playerName - Nome del giocatore per la conferma.
 * @param {number} minLevel - Livello min per il reinserimento.
 * @param {number} maxLevel - Livello max per il reinserimento.
 */
window.removePlayerFromTeamAdmin = async (teamId, playerIdToRemove, playerName, minLevel, maxLevel) => {
     if (!currentTeam || !currentTeam.isAdmin) return;

     // 1. RIMUOVI DALLA ROSA
     const teamData = teams.find(t => t.id === teamId);
     if (!teamData || !teamData.players) return;

     // Usiamo findIndex sul nome o sull'ID (ID è più sicuro, ma se non c'è, usiamo il nome)
     const indexToRemove = teamData.players.findIndex(p => p.id === playerIdToRemove || p.name === playerIdToRemove);
     if (indexToRemove === -1) return;

     const updatedPlayers = [...teamData.players];
     const removedPlayer = updatedPlayers.splice(indexToRemove, 1)[0]; // Cattura il giocatore rimosso

     // Estrai l'età del giocatore rimosso per il reinserimento
     const playerAge = removedPlayer.age || 25; 


    try {
        const teamDocRef = doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), teamId);
        await updateDoc(teamDocRef, { players: updatedPlayers });

        // 2. REINSERISCI NEL DRAFT
        if (removedPlayer) {
            const playerDraftData = {
                name: removedPlayer.name,
                role: removedPlayer.role,
                age: playerAge,
                minLevel: removedPlayer.minLevel,
                maxLevel: removedPlayer.maxLevel,
                available: true,
                createdAt: serverTimestamp(), // Si assicura che il server timestamp sia aggiornato
            };

            await addDoc(getPublicCollectionRef(PLAYER_COLLECTION_NAME), playerDraftData);
        }

        // Il listener onSnapshot aggiornerà la vista automaticamente
    } catch (error) {
        console.error("Errore Admin nella rimozione/reinserimento del giocatore:", error);
        alert("Errore Admin nell'operazione. Controlla la console.");
    }
};

/**
 * Funzione per l'Admin per rimuovere un'intera squadra registrata.
 * Utilizza il modale custom per la conferma.
 * @param {string} teamId - ID del documento della squadra da rimuovere.
 * @param {string} teamName - Nome della squadra per la conferma.
 */
window.removeTeam = async (teamId, teamName) => {
    if (!currentTeam || !currentTeam.isAdmin) return;

    const confirmation = await showConfirmationModal(`Sei sicuro di voler rimuovere la squadra '${teamName}'? L'operazione è irreversibile e disconnetterà l'utente.`);
    if (!confirmation) return;

    try {
        const teamDocRef = doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), teamId);
        await deleteDoc(teamDocRef);
        // La disconnessione e l'aggiornamento della lista squadre sono gestiti dai listener onSnapshot
    } catch (error) {
        console.error("Errore nella rimozione della squadra:", error);
        alert(`Errore nella rimozione della squadra '${teamName}'. Controlla la console.`);
    }
};


// --- FUNZIONI UTENTE (Draft) ---

window.draftPlayer = async (playerId) => {
    if (!currentTeam || currentTeam.isAdmin) return;

    // 1. Controllo dello stato del draft
    if (!draftStatus.isDraftActive) {
        alert("Impossibile draftare: La sessione di Draft è attualmente ferma.");
        renderDraft(); 
        return; 
    }
    
    // 2. Controllo del limite di giocatori (limite assoluto 99)
    if (currentTeam.players && currentTeam.players.length >= FINAL_ROSTER_SIZE) {
        alert(`Hai raggiunto il limite massimo di ${FINAL_ROSTER_SIZE} giocatori per la rosa.`);
        renderDraft();
        return;
    }
    
    // 3. Controllo del turno
    const currentTurnTeamId = draftStatus.draftOrder[draftStatus.currentTurnIndex];
    if (currentTurnTeamId !== currentTeam.id) {
        const currentTurnTeamName = teams.find(t => t.id === currentTurnTeamId)?.name || 'una squadra sconosciuta';
        alert(`Non è il tuo turno di draftare. Attendi che finisca ${currentTurnTeamName}.`);
        renderDraft();
        return;
    }

    // 4. Controllo del limite di 1 giocatore per round
    const currentRoundNumber = draftStatus.roundNumber || 1;
    const hasDraftedThisRound = currentTeam.players?.some(p => p.roundNumber === currentRoundNumber) || false;
    
    if (hasDraftedThisRound) {
        alert(`Hai già draftato un giocatore in questo Round (${currentRoundNumber}). Devi attendere il prossimo turno.`);
        renderDraft();
        return;
    }


    // Cerchiamo l'oggetto completo del giocatore dal cache locale
    const playerToDraft = draftPlayers.find(p => p.id === playerId);
    if (!playerToDraft) {
        alert("Giocatore non trovato nel draft (potrebbe essere stato appena scelto). Riprova.");
        return;
    }

    const teamDocRef = doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), currentTeam.id);
    const playerDocRef = doc(getPublicCollectionRef(PLAYER_COLLECTION_NAME), playerId);
    const draftStatusDocRef = getDraftStatusDocRef(); // Riferimento al documento di stato del draft

    try {
        await runTransaction(db, async (transaction) => {
            // ESEGUI TUTTE LE LETTURE PRIMA DELLE SCRITTURE
            const teamDoc = await transaction.get(teamDocRef);
            const playerDoc = await transaction.get(playerDocRef);
            const statusDoc = await transaction.get(draftStatusDocRef); // Lettura dello stato del draft

            const teamData = teamDoc.data();
            const currentPlayers = teamData.players || [];
            const statusData = statusDoc.data();
            const txRoundNumber = statusData.roundNumber || 1; // RoundNumber letto dalla transazione

            // Re-verifica concorrente del limite assoluto all'interno della transazione
            if (currentPlayers.length >= FINAL_ROSTER_SIZE) {
                 throw new Error(`Limite assoluto raggiunto: ${FINAL_ROSTER_SIZE} giocatori massimi. Transazione bloccata.`);
            }
            // Re-verifica concorrente del limite Round all'interno della transazione
            if (currentPlayers.some(p => p.roundNumber === txRoundNumber)) {
                 throw new Error(`Limite Round raggiunto: Hai già draftato nel Round ${txRoundNumber}. Transazione bloccata.`);
            }
            
            // Re-verifica concorrente del turno all'interno della transazione
            if (statusData.draftOrder[statusData.currentTurnIndex] !== currentTeam.id) {
                 throw new Error("Turno non rispettato. Qualcun altro ha draftato prima. Transazione bloccata.");
            }

            if (!playerDoc.exists) {
                throw new Error("Giocatore già draftato da un'altra squadra o non esistente.");
            }

            // Dati del giocatore da salvare nella rosa della squadra
            const draftedPlayer = {
                id: playerId,
                name: playerToDraft.name,
                role: playerToDraft.role,
                age: playerToDraft.age,
                minLevel: playerToDraft.minLevel,
                maxLevel: playerToDraft.maxLevel,
                // Generazione del livello casuale
                level: getRandomLevel(playerToDraft.minLevel, playerToDraft.maxLevel),
                teamId: currentTeam.id,
                draftedAt: new Date().toISOString(),
                roundNumber: txRoundNumber, // Salva il round number sul giocatore
            };

            // ORA ESEGUI LE SCRITTURE

            // 1. Rimuovi il giocatore dal Draft
            transaction.delete(playerDocRef);

            // 2. Aggiungi il giocatore all'array 'players' della squadra
            transaction.update(teamDocRef, {
                players: [...currentPlayers, draftedPlayer],
            });
            
            // 3. Aggiorna il turno
            const nextTurnIndex = statusData.currentTurnIndex + 1;
            const draftOrderLength = statusData.draftOrder?.length || 0;

            if (nextTurnIndex < draftOrderLength) {
                // Passa al prossimo turno
                transaction.update(draftStatusDocRef, {
                    currentTurnIndex: nextTurnIndex
                });
            } else {
                // Fine del Draft (tutte le squadre hanno avuto il loro turno)
                 transaction.update(draftStatusDocRef, {
                    isDraftActive: false,
                    currentTurnIndex: nextTurnIndex
                });
            }
            
        });

        console.log("Giocatore draftato con successo e turno avanzato!");
    } catch (error) {
        // In caso di fallimento della transazione (concorrenza, regole, ecc.)
        console.error("Errore nel processo di draft:", error);
        
        // Estrai il messaggio di errore
        let errorMessage = 'Transazione fallita. Controlla la console per i dettagli.';
        if (error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
             errorMessage = error;
        }
        
        // Se l'errore è dovuto al fatto che il draft è finito, non mostrare alert di errore
        if (!errorMessage.includes("Limite raggiunto") && !errorMessage.includes("Turno non rispettato")) {
             alert('Errore nel draft: ' + errorMessage);
        }
    }
};

// --- INIZIO APPLICAZIONE ---
initializeFirebase();

// Espone le funzioni al global scope per l'uso in onclick HTML
window.renderDraft = renderDraft;
window.renderHomepage = renderHomepage;
window.draftPlayer = draftPlayer;
window.renderAdmin = renderAdmin;
window.removeTeam = removeTeam;
window.removePlayerFromTeamAdmin = removePlayerFromTeamAdmin;