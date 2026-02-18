# 🚀 Mikrus n8n Manager

> **Najprostszy sposób na instalację i zarządzanie n8n na Mikrus VPS.**  
> *Stworzone przez Lazy Engineera dla Lazy Engineerów.*

[![English Version](https://img.shields.io/badge/lang-English-red.svg)](README.en.md)

## 📖 O projekcie

**Mikrus n8n Manager** to nowoczesne narzędzie z interfejsem graficznym (GUI), które upraszcza instalację i obsługę [n8n](https://n8n.io) na serwerach VPS [Mikrus.pl](https://mikr.us/?r=pavvel).

**Zobacz działającą aplikację tutaj:** [https://manager.cytr.us/](https://manager.cytr.us/)

Uruchamianie n8n na kontenerach LXC z ograniczonymi zasobami (jak Mikrus) bywa wyzwaniem przez zależności systemowe (glibc), limity pamięci i pętle restartów Dockera. To narzędzie automatyzuje obsługę wszystkich tych problemów.

---

## 🛠️ Architektura

Aplikacja składa się z trzech części:

1.  **Frontend (Next.js):** Piękny, ciemny interfejs z efektem "Aurora", emulacją terminala i komunikacją w czasie rzeczywistym. Serwowany statycznie przez Backend.
2.  **Backend (Node.js/Express):** Pomost. Przyjmuje dane logowania, nawiązuje tunel SSH do Twojego VPS i wgrywa Agenta.
3.  **Agent (Node.js):** Lekki skrypt uruchamiany na Twoim serwerze.

---

## 🚀 Jak zacząć?

### Wymagania
*   Serwer VPS na [Mikrus.pl](https://mikr.us/?r=pavvel) (zalecana wersja 2.1 lub wyższa).
*   Dane do SSH (Host, Port, Login, Hasło).

### Uruchomienie na Mikrusie (PM2)

```bash
# Sklonuj repozytorium
git clone https://github.com/jurczykpawel/mikrus-n8n-manager.git /scripts/js/app
cd /scripts/js/app

# Zbuduj frontend
cd frontend && npm install && npm run build
cd ..

# Zainstaluj backend i uruchom
cd backend && npm install
pm2 start ../ecosystem.config.js
pm2 save
```

Otwórz `https://manager.cytr.us/` (lub adres swojego IP na porcie 3030).

---

## 🧯 Utrzymanie (VPS)

Aplikacja jest zarządzana przez **PM2**.

1.  **Sprawdź status:** `pm2 status`
2.  **Zrestartuj Managera:** `pm2 restart mikrus-manager`
3.  **Sprawdź logi:** `pm2 logs mikrus-manager`

---

## 🎓 Tryb Eksperta

Dla osób, które wolą terminal, gorąco zalecamy naukę SSH.
Aplikacja zawiera wbudowany **Przewodnik Terminala**, który wygeneruje dla Ciebie skrypt konfiguracyjny.

### 🪄 Konfiguracja SSH - Twój przyjaciel w terminalu

Skonfiguruj połączenie SSH jedną komendą:

```bash
bash <(curl -s https://raw.githubusercontent.com/jurczykpawel/mikrus-toolbox/main/local/setup-ssh.sh)
```

**Co robi ten skrypt?**
1.  Pyta o dane do serwera (Host, Port, User).
2.  Generuje bezpieczny klucz SSH (jeśli go nie masz).
3.  Wysyła klucz publiczny na serwer (automatyczne logowanie).
4.  Konfiguruje plik `~/.ssh/config`.

**Efekt:** zamiast `ssh root@srv20.mikr.us -p 10107` (+ hasło) wpisujesz po prostu `ssh mikrus`.

Skrypt jest w 100% bezpieczny - używa standardowych mechanizmów SSH Twojego systemu.

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

MIT License. Stworzone przez **Lazy Engineer**. Vibecoded with Gemini ♊.
