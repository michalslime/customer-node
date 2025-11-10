## Opis projektu

Customer Node to lekka aplikacja serwerowa napisana w frameworku [NestJS](https://github.com/nestjs/nest).
Stanowi ona węzeł (node) działający po stronie klienta, będący częścią ekosystemu Octopus.

Głównym zadaniem aplikacji jest pobieranie i wykonywanie poleceń pochodzących z zaufanego źródła — Octopus Controller.
W przeciwieństwie do klasycznego modelu, Customer Node nie wystawia publicznych endpointów, lecz działa w modelu pull:
to sam node pobiera zadania po uprzednim pingowaniu przez Octopusa.
Dzięki temu znacząco zwiększa się poziom bezpieczeństwa komunikacji.

---

## Architektura i założenia

- Komunikacja przebiega w kierunku Octopus → Customer Node, poprzez mechanizm pingowania.
- Node samodzielnie pobiera zadania, nie przyjmuje ich bezpośrednio z zewnątrz.
- Brak otwartych endpointów typu POST, co minimalizuje ryzyko ataków.
- Wspiera różne środowiska integracji: mock, staging oraz production.
- Cała wymiana danych odbywa się z zaufanym źródłem (Octopus).

---

## Instalacja projektu

```bash
$ npm install
```

Po zainstalowaniu zależności, upewnij się, że w katalogu głównym projektu znajduje się poprawnie skonfigurowany plik `.env.development`.

---

## Tryby uruchomienia

### Development
Uruchamia aplikację lokalnie z mockowanymi serwisami kryptogiełdowymi.
Idealny do testów logiki, bez ryzyka rzeczywistych operacji finansowych.

```bash
$ npm run dev
```

### Staging
Uruchamia aplikację w środowisku testowym, łącząc się z prawdziwymi API giełdowymi, lecz z kontami testowymi (niewielkie środki).
Pozwala na symulację realnych procesów w bezpiecznym środowisku.

```bash
$ npm run staging
```

### Production
Uruchamia aplikację w pełnym środowisku produkcyjnym, z dostępem do rzeczywistych kont i środków.
Wymaga weryfikacji połączenia z Octopusem i poprawnej konfiguracji po stronie serwera.

```bash
$ npm run production
```

---

## Zmienne środowiskowe (.env)

Przykładowa konfiguracja pliku `.env`:

```
OCTOPUS_API_URL=https://api.octopus-controller.com
CUSTOMER_ID=twoj-identyfikator-klienta
CRYPTO_API_KEY=twoj-klucz-api
CRYPTO_API_SECRET=twoj-sekret-api
PING_INTERVAL=30000
LOG_LEVEL=debug
```

Upewnij się, że dane API są bezpiecznie przechowywane i nigdy nie publikowane publicznie.

---

## Bezpieczeństwo

- Brak publicznych endpointów — wszystkie zadania są pobierane, a nie wysyłane.
- Połączenie wyłącznie z Octopus Controller — zaufanym źródłem komunikacji.
- Konfiguracja środowiskowa oddzielona dla dev, staging i production.
- Logika zaprojektowana z myślą o minimalnej ekspozycji i maksymalnej kontroli.

---

## Przyszły rozwój

- Automatyczne ponawianie nieudanych zadań.
- Monitorowanie stanu i raportowanie wyników do Octopusa.
- Rozszerzona obsługa logowania, audytu i alertów.
- Inteligentne planowanie zadań w oparciu o priorytety i historię wykonania.

---

## Autorzy

Projekt rozwijany przez zespół Octopus Ecosystem Team.
Bezpieczne, nowoczesne i skalowalne zarządzanie węzłami klientów w środowisku kryptowalutowym.