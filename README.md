# 🚀 Mikrus n8n Manager

> **Najprostszy sposób na instalację i zarządzanie n8n na Mikrus VPS.**  
> *Stworzone przez Lazy Engineera dla Lazy Engineerów.*

[![English Version](https://img.shields.io/badge/lang-English-red.svg)](README.en.md)

![Mikrus n8n Manager UI](https://github.com/pavvel11/mikrus-n8n-manager/assets/placeholder-image.png)

## 📖 O projekcie

**Mikrus n8n Manager** to nowoczesne narzędzie z interfejsem graficznym (GUI), które upraszcza instalację i obsługę [n8n](https://n8n.io) na serwerach VPS [Mikrus.pl](https://mikr.us).

Uruchamianie n8n na kontenerach LXC z ograniczonymi zasobami (jak Mikrus) bywa wyzwaniem przez zależności systemowe (glibc), limity pamięci i pętle restartów Dockera. To narzędzie automatyzuje obsługę wszystkich tych problemów.

### ✨ Kluczowe Funkcje

*   **Instalacja 1-Kliknięciem:** Automatycznie wykrywa zasoby serwera i instaluje odpowiednią wersję n8n (SQLite dla <2GB RAM, Postgres dla >2GB RAM).
*   **Połączenie Zero-Config:** Łączysz się używając danych z maila od Mikrusa. Nie musisz konfigurować nic w terminalu.
*   **Portable Node.js:** Wgrywa własne, odizolowane środowisko Node.js na serwer, omijając problemy z menedżerami pakietów (`apt`/`apk`) na starszych systemach.
*   **Podgląd na żywo:** Widzisz logi z serwera w czasie rzeczywistym przez WebSocket (wygląda jak terminal, ale ładniej).
*   **Bezpieczeństwo:** Twoje hasło/klucz jest w pamięci RAM tylko przez 5 sekund podczas nawiązywania połączenia. Potem jest kasowane. Agent działa jako usługa Systemd.
*   **Disaster Recovery:** Przycisk "Hard Reset" (Opcja Nuklearna) do naprawy zablokowanych kontenerów Docker i błędów uprawnień.
*   **Backup Manager:** Rób i pobieraj backupy swoich workflowów n8n bezpośrednio z przeglądarki.

---

## 🛠️ Architektura

Aplikacja składa się z trzech części:

1.  **Frontend (Next.js):** Piękny, ciemny interfejs z efektem "Aurora", emulacją terminala i komunikacją w czasie rzeczywistym.
2.  **Backend (Node.js/Express):** Pomost. Przyjmuje dane logowania, nawiązuje tunel SSH do Twojego VPS i wgrywa Agenta.
3.  **Agent (Node.js):** Lekki skrypt uruchamiany na Twoim serwerze. Wykonuje komendy Dockera lokalnie i przesyła wyniki do Frontendu.

**Dlaczego "Portable Node"?**
Serwery Mikrusa często działają na różnych dystrybucjach Linuxa. Instalacja nowoczesnego Node.js (wymaganego dla Agenta) przez `apt` często kończy się błędem. Ten projekt pobiera niezależną, binarną wersję Node.js do `/root/mikrus-manager/runtime`, dzięki czemu Agent działa na **każdym** Linuxie bez dotykania bibliotek systemowych.

---

## 🚀 Jak zacząć?

### Wymagania
*   Serwer VPS na [Mikrus.pl](https://mikr.us/?r=pavvel) (zalecana wersja 2.1 lub wyższa).
*   Dane do SSH (Host, Port, Login, Hasło) - znajdziesz je w mailu powitalnym.

### Uruchomienie lokalne (Docker)

Jeśli chcesz uruchomić Managera u siebie:

```bash
# Sklonuj repozytorium
git clone https://github.com/pavvel11/mikrus-n8n-manager.git
cd mikrus-n8n-manager

# Zainstaluj zależności i zbuduj
cd frontend && npm install && npm run build
cd ..
cd backend && npm install

# Uruchom serwer
npm start
```

Otwórz `http://localhost:3001` w przeglądarce.

---

## 🛡️ Bezpieczeństwo

*   **Hot Potato Credentials:** Twoje hasło/klucz prywatny jest trzymane w RAM tylko podczas wstępnego handshake'u SSH. Po wgraniu Agenta, dane są czyszczone.
*   **Whitelist Komend:** Agent akceptuje tylko ścisłą listę komend (`INSTALL`, `UPDATE`, `BACKUP`, `RESTART`, `FIX_DOCKER`). Wykonanie dowolnego kodu jest zablokowane.
*   **Standard SSH:** Cała początkowa komunikacja odbywa się przez standardowe, szyfrowane kanały SSH.

---

## 🎓 Tryb Eksperta

Dla osób, które wolą terminal, gorąco zalecamy naukę SSH.
Aplikacja zawiera wbudowany **Przewodnik Terminala**, który wygeneruje dla Ciebie skrypt konfiguracyjny.

Możesz też uruchomić skrypt konfiguracji bezpośrednio z tego repozytorium:
```bash
./setup_mikrus.sh
```
Skonfiguruje on Twój plik `~/.ssh/config`, dzięki czemu połączysz się wpisując po prostu `ssh mikrus`.

---

## 🤝 Rozwiązywanie Problemów

**Q: Instalacja wisi na "Resolving Host..."**
A: Sprawdź, czy wpisałeś poprawny Port SSH (np. 10107, a NIE 22). To najczęstszy błąd.

**Q: Widzę błąd "EACCES: permission denied" w logach?**
A: Użyj przycisku **"Wyczyść Docker (Hard Reset)"** w sekcji Troubleshooting na dole strony. Naprawi to uprawnienia do katalogu `.n8n`.

**Q: Czy mogę zainstalować Postgres na Mikrusie 2.1 (1GB RAM)?**
A: Nie. Aplikacja aktywnie blokuje tę opcję, aby uniknąć awarii serwera (OOM - Out Of Memory). Zaktualizuj Mikrusa do wersji 3.0+.

---

## 📜 Licencja

MIT License. Stworzone przez **Lazy Engineer**.

*Disclaimer: To jest projekt społeczności. Jako, że jest to nowe narzędzie, jego użycie pozwala na proste i szybkie zarządzanie n8n, a wszelkie błędy będą na bieżąco usuwane.
*
