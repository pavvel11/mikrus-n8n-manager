#!/bin/bash

# Kolory
GREEN='\x1b[0;32m'
BLUE='\x1b[0;34m'
YELLOW='\x1b[1;33m'
RED='\x1b[0;31m'
NC='\x1b[0m'

clear
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}   🚀 MIKRUS SSH CONFIGURATOR - TRYB EKSPERTA    ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "Ten skrypt skonfiguruje Twoje połączenie z Mikrusem tak,"
echo -e "abyś mógł łączyć się wpisując tylko: ${GREEN}ssh mikrus${NC}"
echo -e "(bez wpisywania hasła za każdym razem!)"
echo ""
echo -e "${YELLOW}Przygotuj dane z maila od Mikrusa (Host, Port, Hasło).${NC}"
echo ""

# 1. Pobieranie danych
read -p "Podaj nazwę hosta (np. srv20.mikr.us): " HOST
read -p "Podaj numer portu (np. 10107): " PORT
read -p "Podaj nazwę użytkownika (domyślnie: root): " USER
USER=${USER:-root}
read -p "Jak chcesz nazwać ten serwer w terminalu? (domyślnie: mikrus): " ALIAS
ALIAS=${ALIAS:-mikrus}

if [[ -z "$HOST" || -z "$PORT" ]]; then
    echo -e "${RED}Błąd: Host i Port są wymagane!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Sprawdzam klucze SSH...${NC}"

# 2. Generowanie klucza SSH (jeśli nie istnieje)
KEY_PATH="$HOME/.ssh/id_ed25519"
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Nie znaleziono klucza SSH. Generuję nowy bezpieczny klucz (Ed25519)...${NC}"
    ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "mikrus_key"
    echo -e "${GREEN}Klucz wygenerowany.${NC}"
else
    echo -e "${GREEN}Znaleziono istniejący klucz SSH.${NC}"
fi

# 3. Kopiowanie klucza na serwer
echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}TERAZ WAŻNE:${NC} Za chwilę zostaniesz poproszony o wpisanie hasła do Mikrusa."
echo -e "To JEDYNY raz, kiedy będziesz musiał je wpisać."
echo -e "${BLUE}=================================================${NC}"
echo ""
read -n 1 -s -r -p "Naciśnij dowolny klawisz, aby kontynuować..."
echo ""

ssh-copy-id -i "$KEY_PATH.pub" -p "$PORT" "$USER@$HOST"

if [ $? -ne 0 ]; then
    echo -e "${RED}Wystąpił błąd podczas wysyłania klucza. Sprawdź hasło i spróbuj ponownie.${NC}"
    exit 1
fi

# 4. Konfiguracja pliku ~/.ssh/config
CONFIG_FILE="$HOME/.ssh/config"
if [ ! -f "$CONFIG_FILE" ]; then
    touch "$CONFIG_FILE"
fi

# Sprawdź czy alias już istnieje
if grep -q "Host $ALIAS" "$CONFIG_FILE"; then
    echo -e "${YELLOW}Alias '$ALIAS' już istnieje w pliku config. Pomijam dodawanie.${NC}"
else
    echo "" >> "$CONFIG_FILE"
    echo "Host $ALIAS" >> "$CONFIG_FILE"
    echo "    HostName $HOST" >> "$CONFIG_FILE"
    echo "    Port $PORT" >> "$CONFIG_FILE"
    echo "    User $USER" >> "$CONFIG_FILE"
    echo "    IdentityFile $KEY_PATH" >> "$CONFIG_FILE"
    echo "    ServerAliveInterval 60" >> "$CONFIG_FILE"
    echo -e "${GREEN}Dodano konfigurację do $CONFIG_FILE${NC}"
fi

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}   ✅ SUKCES! KONFIGURACJA ZAKOŃCZONA!   ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "Od teraz możesz połączyć się ze swoim serwerem wpisując:"
echo ""
echo -e "   ${GREEN}ssh $ALIAS${NC}"
echo ""
echo "Spróbuj to teraz!"
