# Mikrus n8n Manager - TODO List

## Przyszłe Funkcjonalności:

### 💡 Obsługa instalacji z Docker Compose (Zamiast skryptów Mikrusa)

**Opis:** Zamiast opierać się na dedykowanych skryptach Mikrusa (`n8n_install`, `n8n_install_postgres`), wprowadzić mechanizm generowania i uruchamiania pliku `docker-compose.yml`.

**Zakres:**
1.  **Frontend:** Stworzyć interfejs pozwalający użytkownikowi na:
    *   Wybór wersji n8n.
    *   Wybór bazy danych (SQLite, PostgreSQL, MySQL/MariaDB).
    *   Konfigurację zmiennych środowiskowych (np. webhook URL).
    *   Definicję portów.
    *   Opcjonalne dodawanie innych serwisów (np. Traefik jako reverse proxy z SSL).
2.  **Backend:** Implementacja logiki generującej `docker-compose.yml` na podstawie wyborów użytkownika.
3.  **Agent:** Rozszerzenie o komendy pozwalające na:
    *   Wgranie pliku `docker-compose.yml` na serwer.
    *   Wykonanie `docker compose up -d`.
    *   Wykonanie `docker compose down`.
    *   Monitorowanie statusu usług zdefiniowanych w `docker-compose.yml`.

**Korzyści:**
*   Większa elastyczność i kontrola dla użytkownika.
*   Standardowe narzędzie Docker Compose (łatwiejsze do zrozumienia i utrzymania dla zaawansowanych).
*   Możliwość łatwego dodawania/zarządzania wieloma usługami.
*   Lepsza skalowalność i zarządzanie zasobami.

**Poziom trudności:** Wysoki (duży projekt, wymaga zrozumienia Docker Compose i jego integracji).

### 📦 Migrator z Hostingera

**Opis:** Kreator migracji dla użytkowników, którzy chcą przenieść swoje instancje n8n z Hostingera (często polecanego przez YouTuberów, ale droższego) na Mikrusa.

**Zakres:**
1.  **Krok 1: Dane Hostingera:** Użytkownik podaje dane SSH do swojego obecnego serwera na Hostingerze.
2.  **Krok 2: Backup Zdalny:** Manager łączy się z Hostingerem, zatrzymuje n8n, wykonuje dump bazy danych i kopiuje pliki konfiguracyjne/klucze szyfrowania.
3.  **Krok 3: Transfer:** Bezpośredni transfer plików między serwerami (`scp` z Hostingera na Mikrusa).
4.  **Krok 4: Import:** Odtworzenie instancji na Mikrusie.

**Korzyści:**
*   Rozwiązuje problem "Vendor Lock-in".
*   Ogromna wartość dla osób, które "przepłacają" za hosting.
*   Automatyzuje skomplikowany proces przenoszenia kluczy szyfrowania n8n (bez których workflowy z credentials przestają działać).

**Poziom trudności:** Wysoki (skomplikowany proces z wieloma zewnętrznymi systemami i potencjalnymi problemami z uprawnieniami).

---