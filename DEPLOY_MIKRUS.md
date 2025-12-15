# Wdrażanie Mikrus n8n Manager

Dokumentacja procesu deploymentu aplikacji na serwer VPS (Mikrus).

## Wymagania
*   Dostęp SSH do serwera skonfigurowany w `~/.ssh/config` (host o nazwie `mikrus`) lub zmiana zmiennej w `deploy.sh`.
*   Zainstalowany Node.js i PM2 na serwerze (`npm install -g pm2`).

## Szybki Deployment

W głównym katalogu projektu uruchom:

```bash
./deploy.sh
```

Skrypt automatycznie:
1.  Zbuduje frontend (Next.js Static Export).
2.  Skopiuje backend i agenta.
3.  Wyśle pliki przez `scp` do katalogu `scripts/js/app`.
4.  Zrestartuje proces w PM2.

## Ręczna Instalacja (Pierwszy raz)

Jeśli skrypt zawiedzie lub instalujesz na nowym serwerze pierwszy raz:

1.  **Przygotuj serwer:**
    ```bash
    ssh mikrus "mkdir -p scripts/js/app"
    ```

2.  **Uruchom skrypt deploymentu:**
    ```bash
    ./deploy.sh
    ```

3.  **Skonfiguruj port (na serwerze):**
    Aplikacja domyślnie używa portu z procesu PM2 lub 3001. Na Mikrusie musisz ustawić zmienną `PORT` na swój przydzielony port.

    ```bash
    ssh mikrus
    cd scripts/js/app/backend
    pm2 delete n8n-manager
    export PORT=40113  # <--- Twój port Mikrusa
    pm2 start index.js --name n8n-manager --node-args='--max-old-space-size=128'
    pm2 save
    ```

## Rozwiązywanie problemów

### Aplikacja nie wstaje (Error: listen EADDRINUSE)
Oznacza, że port jest zajęty. Sprawdź procesy:
```bash
lsof -i :40113
# lub
pm2 stop n8n-manager
```

### Timeout przy łączeniu SSH w aplikacji
Upewnij się, że w formularzu podajesz:
*   **Host:** `127.0.0.1` (dla połączeń lokalnych, jeśli aplikacja stoi na tym samym serwerze co n8n)
*   **Port:** `22`

## Skorzystaj z Mikrusa z reflinkiem!

Jeśli jeszcze nie masz swojego serwera Mikrus, możesz go nabyć, korzystając z mojego linku partnerskiego:

**Reflink:** [https://mikr.us/?r=pavvel](https://mikr.us/?r=pavvel)

**Korzyści dla Ciebie:** Osoba, która skorzysta z linka i zarejestruje się/zakupi usługę, otrzymuje **1 miesiąc usługi gratis!** To świetna okazja, żeby rozpocząć swoją przygodę z n8n bez dodatkowych kosztów początkowych.