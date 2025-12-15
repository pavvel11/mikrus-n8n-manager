# Mikrus n8n Manager (Lazy Engineer Edition)

Aplikacja webowa do bezpiecznego i prostego zarządzania instancjami n8n na serwerach Mikrus.pl.

## Architektura Bezpieczeństwa

Projekt wykorzystuje model **Hybrid Pairing**:
1.  **Brak zapisu haseł:** Hasło do serwera jest przesyłane do backendu, użyte **raz** do nawiązania sesji SSH i natychmiast usuwane z pamięci.
2.  **Agent:** Na serwerze instalowany jest lekki agent (Node.js), który łączy się zwrotnie (Reverse Connection) do Twojego panelu.
3.  **Whitelist:** Agent wykonuje tylko ściśle określone komendy (`n8n_install`, `backup`, `restart`), ignorując dowolne inne polecenia.

## Struktura

*   `frontend/` - Interfejs użytkownika (Next.js + TailwindCSS).
*   `backend/` - Serwer API + Socket.io + SSH Injector.
*   `agent/` - Kod agenta instalowanego na Mikrusie.

## Uruchomienie (Development)

Wymagane: Node.js v18+.

### 1. Uruchom Backend
```bash
cd backend
npm install
npm start
# Serwer ruszy na porcie 3001
```

### 2. Uruchom Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend ruszy na porcie 3000
```

### 3. Użycie
1. Wejdź na `http://localhost:3000`.
2. Podaj dane do swojego Mikrusa (Host, Port, User, Hasło).
3. Kliknij "Connect".
4. Obserwuj terminal - powinieneś zobaczyć proces instalacji agenta, a potem przyciski akcji staną się aktywne.

## Manualna Instalacja (Dla Paranoików)

Jeśli nie chcesz podawać hasła w formularzu, możesz uruchomić agenta ręcznie na serwerze:

1. Pobierz pliki z `http://localhost:3001/dl/agent.js` i `package.json`.
2. Zainstaluj zależności: `npm install socket.io-client`.
3. Ustaw zmienne środowiskowe i uruchom:
   ```bash
   export SERVER_URL="http://twoje-ip:3001"
   export AGENT_TOKEN="TWOJE-UUID-Z-PRZEGLADARKI"
   node agent.js
   ```
   *(UUID znajdziesz w localStorage przeglądarki pod kluczem `mikrus_session_id`)*
