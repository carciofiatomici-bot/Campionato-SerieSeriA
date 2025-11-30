<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fantacalcio - Gestore Squadra e Draft</title>
    <!-- Caricamento di Tailwind CSS per lo styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f7f7f7;
        }
        .main-card {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 10px -5px rgba(0, 0, 0, 0.04);
        }
        .btn-primary {
            @apply bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out;
        }
        .btn-secondary {
            @apply bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out;
        }
        .input-style {
            @apply w-full p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500;
        }
        .error-message {
            @apply bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">

    <!-- Contenitore Principale dell'App -->
    <div id="app" class="w-full max-w-4xl bg-white rounded-xl main-card p-6 md:p-10">
        <h1 class="text-3xl font-bold text-center text-gray-800 mb-6" id="header-title">Fantacalcio League</h1>
        <div id="content">
            <!-- Il contenuto dinamico verrà iniettato qui -->
            <div class="text-center text-gray-500">Inizializzazione in corso...</div>
        </div>
    </div>

    <!-- Modulo di Importazione Firebase -->
    <script type="module">
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

        // Variabili Globali
        let app;
        let db;
        let auth;
        let userId = null;
        let currentTeam = null;
        let isAuthReady = false;
        let teams = []; // Cache di tutte le squadre per l'admin
        let draftPlayers = []; // Cache dei giocatori disponibili per il draft

        // Configurazione dell'ID dell'App per i percorsi Firestore
        const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;

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

                    if (userId) {
                        if (!currentTeam) {
                            renderLogin();
                        } else {
                            currentTeam.isAdmin ? renderAdmin() : renderHomepage();
                        }
                    } else {
                         document.getElementById('content').innerHTML = `
                            <div class="error-message">Errore Auth: Impossibile ottenere un ID utente. Controlla la configurazione Firebase Auth.</div>
                         `;
                    }
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

        // --- FUNZIONI DI RENDERIZZAZIONE ---

        const setContent = (html) => {
            document.getElementById('content').innerHTML = html;
        };

        const renderLogin = (message = '') => {
            document.getElementById('header-title').textContent = "Accesso alla Lega Fantacalcio";
            const loginHtml = `
                <div class="max-w-md mx-auto p-6 bg-gray-50 rounded-lg">
                    ${message ? `<div class="error-message">${message}</div>` : ''}
                    <form id="login-form" class="space-y-4">
                        <div>
                            <label for="teamName" class="block text-sm font-medium text-gray-700">Di che squadra sei il presidente?</label>
                            <input type="text" id="teamName" required class="input-style mt-1" placeholder="Nome Squadra (es. 'Magic Team')" autocomplete="off">
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" id="password" required class="input-style mt-1" placeholder="Inserisci la password">
                        </div>
                        <button type="submit" class="btn-primary w-full">Accedi o Registrati</button>
                    </form>
                    <p class="mt-4 text-xs text-gray-500 text-center">ID Utente Firebase: <span class="font-mono text-xs text-green-700 break-all">${userId || 'N/A'}</span></p>
                </div>
            `;
            setContent(loginHtml);
            document.getElementById('login-form').addEventListener('submit', handleLogin);
        };

        const renderHomepage = () => {
            if (!currentTeam) return renderLogin("Errore: Dati squadra non disponibili.");

            document.getElementById('header-title').textContent = `Homepage Squadra: ${currentTeam.name}`;

            // Lista dei giocatori
            const playersListHtml = currentTeam.players && currentTeam.players.length > 0
                ? currentTeam.players.map(p => `
                    <li class="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-center text-gray-700">
                        <!-- Mostra il livello finale se presente, altrimenti il range (per i vecchi dati) -->
                        <span>${p.name} - ${p.role} 
                            (${p.level ? 'Livello: ' + p.level : 'Range: ' + p.minLevel + '/' + p.maxLevel})
                        </span>
                        <button onclick="window.removePlayerFromTeam('${p.id || p.name}')" class="text-red-500 hover:text-red-700 text-sm">Rimuovi</button>
                    </li>
                `).join('')
                : '<li class="text-center text-gray-500 p-4">Ancora nessun giocatore in squadra. Vai al Draft!</li>';

            const homepageHtml = `
                <div class="space-y-6">
                    <div class="p-5 bg-blue-50 rounded-xl border border-blue-200">
                        <h2 class="text-xl font-semibold text-blue-800 mb-2">I Miei Dettagli</h2>
                        <p class="text-gray-700">Nome Squadra (Login): <span class="font-mono bg-blue-100 px-2 py-1 rounded text-sm">${currentTeam.name}</span></p>
                        <div class="mt-3">
                            <label for="presidentName" class="block text-sm font-medium text-gray-700">Nome Presidente (Modificabile)</label>
                            <input type="text" id="presidentName" value="${currentTeam.presidentName}" class="input-style mt-1 max-w-sm" onchange="updatePresidentName(this.value)">
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-4">
                        <button onclick="renderDraft()" class="btn-secondary flex-1">Vai al Draft 🚀</button>
                        <button onclick="logout()" class="btn-secondary bg-red-500 hover:bg-red-600 flex-1">Logout</button>
                    </div>

                    <div>
                        <h2 class="text-xl font-semibold text-gray-800 mb-3">Rosa Giocatori</h2>
                        <ul id="players-list" class="space-y-2">
                            ${playersListHtml}
                        </ul>
                    </div>
                </div>
            `;
            setContent(homepageHtml);
        };

        const renderDraft = () => {
            document.getElementById('header-title').textContent = "Area Draft - Giocatori Disponibili";

            if (!draftPlayers || draftPlayers.length === 0) {
                setContent(`
                    <button onclick="renderHomepage()" class="btn-secondary bg-gray-500 hover:bg-gray-600 mb-6">← Torna alla Homepage</button>
                    <div class="text-center text-gray-500 p-8">Nessun giocatore disponibile nel draft al momento.</div>
                `);
                return;
            }

            const draftHtml = `
                <div class="space-y-6">
                    <button onclick="renderHomepage()" class="btn-secondary bg-gray-500 hover:bg-gray-600">← Torna alla Homepage</button>
                    
                    <div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <p class="text-sm font-semibold text-yellow-800">Seleziona un giocatore per aggiungerlo alla tua rosa. Sarà immediatamente rimosso dal draft per tutti.</p>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruolo</th>
                                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Età</th>
                                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livello (Min/Max)</th>
                                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azione</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200" id="draft-players-table">
                                ${draftPlayers.map(p => `
                                    <tr class="hover:bg-green-50 transition duration-100">
                                        <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
                                        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${p.role}</td>
                                        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${p.age}</td>
                                        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${p.minLevel} / ${p.maxLevel}</td>
                                        <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                                            <button onclick="draftPlayer('${p.id}')" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full">
                                                Drafta
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            setContent(draftHtml);
        };

        const renderAdmin = () => {
            document.getElementById('header-title').textContent = "Area Admin (serieseria)";

            // Lista di tutte le squadre registrate
            const teamsListHtml = teams.length > 0
                ? teams.map(t => `
                    <li class="p-3 bg-white rounded-lg border border-gray-200 text-gray-700">
                        <strong class="text-blue-600">${t.name}</strong> - Presidente: ${t.presidentName} (${t.players ? t.players.length : 0} gioc.)
                        <div class="text-xs text-gray-500 mt-1 break-all">Doc ID: ${t.id}</div>
                    </li>
                `).join('')
                : '<li class="text-center text-gray-500 p-4">Nessuna squadra registrata.</li>';
            
            // Lista dei giocatori nel draft con opzione di rimozione
            const draftListHtml = draftPlayers.length > 0
                ? draftPlayers.map(p => `
                    <li class="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-center text-gray-700">
                        <span>${p.name} - ${p.role} (Liv. ${p.minLevel}/${p.maxLevel})</span>
                        <button onclick="removeDraftPlayer('${p.id}')" class="text-red-500 hover:text-red-700 text-sm font-semibold">Rimuovi</button>
                    </li>
                `).join('')
                : '<li class="text-center text-gray-500 p-4">Il draft è vuoto. Aggiungi un giocatore!</li>';

            const adminHtml = `
                <div class="space-y-8">
                    <button onclick="logout()" class="btn-secondary bg-red-500 hover:bg-red-600">Logout Admin</button>
                    
                    <!-- Aggiungi Giocatore al Draft -->
                    <div class="p-5 bg-green-50 rounded-xl border border-green-200">
                        <h2 class="text-xl font-semibold text-green-800 mb-4">Aggiungi Giocatore al Draft</h2>
                        <form id="add-player-form" class="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><input type="text" id="pName" placeholder="Nome Giocatore" required class="input-style"></div>
                            <div><input type="text" id="pRole" placeholder="Ruolo (es. Att, Cen, Dif)" required class="input-style"></div>
                            <div><input type="number" id="pAge" placeholder="Età" min="15" max="50" required class="input-style"></div>
                            <div><input type="number" id="pMinLevel" placeholder="Livello Min (1-15)" min="1" max="15" required class="input-style"></div>
                            <div><input type="number" id="pMaxLevel" placeholder="Livello Max (1-15)" min="1" max="15" required class="input-style"></div>
                            <button type="submit" class="btn-primary col-span-1 md:col-span-2">Aggiungi Giocatore</button>
                        </form>
                    </div>

                    <!-- Giocatori Attuali nel Draft -->
                    <div class="p-5 bg-white rounded-xl border border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-800 mb-3">Giocatori nel Draft (${draftPlayers.length})</h2>
                        <ul class="space-y-2 max-h-64 overflow-y-auto">
                            ${draftListHtml}
                        </ul>
                    </div>

                    <!-- Squadre Registrate -->
                    <div class="p-5 bg-white rounded-xl border border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-800 mb-3">Tutte le Squadre Registrate (${teams.length})</h2>
                        <ul class="space-y-2 max-h-64 overflow-y-auto">
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
            const TEAM_COLLECTION_NAME = 'teams';
            try {
                const teamsRef = getPublicCollectionRef(TEAM_COLLECTION_NAME);
                const q = query(teamsRef, where("name", "==", teamName));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    // Squadra non trovata -> REGISTRAZIONE
                    if (password.length < 5) {
                        return renderLogin("Registrazione fallita: La password deve avere almeno 5 caratteri.");
                    }
                    
                    const newTeamData = {
                        name: teamName,
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
            renderLogin("Sei stato disconnesso.");
        };

        window.updatePresidentName = async (newName) => {
            if (!currentTeam || currentTeam.isAdmin) return;
            const TEAM_COLLECTION_NAME = 'teams';
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

        const stopAllListeners = () => {
            if (teamsUnsub) teamsUnsub();
            if (draftUnsub) draftUnsub();
            if (teamUnsub) teamUnsub();
            teamsUnsub = null;
            draftUnsub = null;
            teamUnsub = null;
        };

        const startDataListeners = () => {
            stopAllListeners();

            const PLAYER_COLLECTION_NAME = 'draft_players';
            const TEAM_COLLECTION_NAME = 'teams';

            if (currentTeam.isAdmin) {
                // Admin: ascolta tutte le squadre e tutti i giocatori
                draftUnsub = onSnapshot(getPublicCollectionRef(PLAYER_COLLECTION_NAME), (snapshot) => {
                    draftPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    if (document.getElementById('header-title').textContent.includes('Area Admin')) renderAdmin(); 
                }, (error) => console.error("Errore listener draft admin:", error));

                teamsUnsub = onSnapshot(getPublicCollectionRef(TEAM_COLLECTION_NAME), (snapshot) => {
                    teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    if (document.getElementById('header-title').textContent.includes('Area Admin')) renderAdmin(); 
                }, (error) => console.error("Errore listener teams admin:", error));

            } else {
                // Utente: ascolta solo la propria squadra e i giocatori del draft
                draftUnsub = onSnapshot(getPublicCollectionRef(PLAYER_COLLECTION_NAME), (snapshot) => {
                    draftPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    if (document.getElementById('header-title').textContent.includes('Area Draft')) renderDraft(); 
                }, (error) => console.error("Errore listener draft utente:", error));

                if (currentTeam.id) {
                    teamUnsub = onSnapshot(doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), currentTeam.id), (docSnapshot) => {
                        if (docSnapshot.exists()) {
                            currentTeam = { id: docSnapshot.id, ...docSnapshot.data() };
                            if (document.getElementById('header-title').textContent.includes('Homepage Squadra')) renderHomepage();
                        } else {
                            logout();
                        }
                    }, (error) => console.error("Errore listener squadra utente:", error));
                }
            }
        };


        // --- FUNZIONI ADMIN (Aggiunta/Rimozione Giocatori) ---

        const PLAYER_COLLECTION_NAME = 'draft_players';

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
                // L'ID del giocatore è l'ID del documento creato da addDoc
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

        // --- FUNZIONI UTENTE (Draft) ---

        window.draftPlayer = async (playerId) => {
            if (!currentTeam || currentTeam.isAdmin) return;
            const PLAYER_COLLECTION_NAME = 'draft_players';
            const TEAM_COLLECTION_NAME = 'teams';

            // Cerchiamo l'oggetto completo del giocatore dal cache locale
            const playerToDraft = draftPlayers.find(p => p.id === playerId);
            if (!playerToDraft) {
                alert("Giocatore non trovato nel draft (potrebbe essere stato appena scelto). Riprova.");
                return;
            }

            const teamDocRef = doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), currentTeam.id);
            const playerDocRef = doc(getPublicCollectionRef(PLAYER_COLLECTION_NAME), playerId);

            try {
                await runTransaction(db, async (transaction) => {
                    // ESEGUI TUTTE LE LETTURE PRIMA DELLE SCRITTURE
                    
                    // 1. Lettura: Ottieni il documento del giocatore nel draft
                    const playerDoc = await transaction.get(playerDocRef);
                    
                    // 2. Lettura: Ottieni il documento della squadra
                    const teamDoc = await transaction.get(teamDocRef);

                    // Verifica esistenza dopo aver eseguito tutte le letture
                    if (!playerDoc.exists) {
                        throw "Giocatore già draftato da un'altra squadra o non esistente.";
                    }
                    
                    // Dati del giocatore da salvare nella rosa della squadra
                    const draftedPlayer = {
                        id: playerId, 
                        name: playerToDraft.name,
                        role: playerToDraft.role,
                        minLevel: playerToDraft.minLevel,
                        maxLevel: playerToDraft.maxLevel,
                        // *************** AGGIUNTA LOGICA LIVELLO CASUALE ***************
                        level: getRandomLevel(playerToDraft.minLevel, playerToDraft.maxLevel),
                        // ***************************************************************
                        teamId: currentTeam.id, 
                        draftedAt: new Date().toISOString(), 
                    };
                    
                    // ORA ESEGUI LE SCRITTURE

                    // 3. Scrittura/Cancellazione: Rimuovi il giocatore dal Draft
                    transaction.delete(playerDocRef);

                    // 4. Scrittura/Aggiornamento: Aggiungi il giocatore all'array 'players' della squadra
                    const currentPlayers = teamDoc.data().players || [];
                    
                    transaction.update(teamDocRef, {
                        players: [...currentPlayers, draftedPlayer],
                    });
                });

                console.log("Giocatore draftato con successo!");
            } catch (error) {
                // In caso di fallimento della transazione (concorrenza, regole, ecc.)
                console.error("Errore nel processo di draft:", error);
                const errorMessage = typeof error === 'string' ? error : 'Transazione fallita. Controlla le regole di sicurezza.';
                alert('Errore nel draft: ' + errorMessage);
            }
        };
        
        window.removePlayerFromTeam = async (playerIdOrName) => {
             if (!currentTeam || currentTeam.isAdmin || !currentTeam.players) return;
             const TEAM_COLLECTION_NAME = 'teams';
             
             // Cerchiamo l'indice del giocatore basandoci sull'ID (se presente) o sul nome (come fallback)
             const indexToRemove = currentTeam.players.findIndex(p => p.id === playerIdOrName || p.name === playerIdOrName);
             
             if (indexToRemove === -1) return; 

             const updatedPlayers = [...currentTeam.players];
             updatedPlayers.splice(indexToRemove, 1); 

            try {
                const teamDocRef = doc(getPublicCollectionRef(TEAM_COLLECTION_NAME), currentTeam.id);
                await updateDoc(teamDocRef, { players: updatedPlayers });
            } catch (error) {
                console.error("Errore nella rimozione del giocatore dalla squadra:", error);
                alert("Errore nella rimozione del giocatore.");
            }
        };

        // --- INIZIO APPLICAZIONE ---
        initializeFirebase();

        // Espone le funzioni al global scope per l'uso in onclick HTML
        window.renderDraft = renderDraft;
        window.renderHomepage = renderHomepage;
        window.draftPlayer = draftPlayer;
        window.removePlayerFromTeam = removePlayerFromTeam;

    </script>
</body>
</html>