# Lab 1 — Portul serial

## Scop
- Înțelegerea comunicației seriale și a portului serial clasic din PC.
- Configurarea și folosirea unui controler UART pentru transmisie/recepție.

## Esențial
- Comunicația serială trimite biții pe rând, nu în paralel.
- Parametrul de bază este **debitul binar** (bps); nu trebuie confundat cu **baud**.
- Tipuri după direcție: **simplex**, **semiduplex**, **duplex**.
- Tipuri după sincronizare: **asincronă** și **sincronă**.

## Comunicația asincronă
- Fiecare caracter este încadrat de:
  - **1 bit START** = 0
  - **5..8 biți de date**
  - opțional **bit de paritate**
  - **1 sau 2 biți STOP** = 1
- Datele se trimit de regulă cu **LSB primul**.
- Avantaj: implementare simplă.
- Dezavantaj: overhead mare din cauza biților START/STOP.

## RS-232 / semnale importante
- **TD (TX)**: date transmise de calculator.
- **RD (RX)**: date recepționate de calculator.
- **DTR / DSR**: terminalul și dispozitivul extern sunt gata.
- **RTS / CTS**: control hardware al fluxului.
- **CD**: există purtătoare / conexiune validă.
- **RI**: semnal de apel.
- Pentru comunicație directă între două echipamente contează în practică mai ales **TX, RX, GND**, iar la handshake și **RTS/CTS**, **DTR/DSR**.

## Controlul fluxului
### Hardware
- Se bazează pe **RTS/CTS** și uneori **DTR/DSR**.
- Se folosește când receptorul trebuie să poată opri rapid emițătorul.

### Software
- Se bazează pe caractere speciale:
  - **XOFF = 0x13 (Ctrl-S)** → oprește trimiterea
  - **XON = 0x11 (Ctrl-Q)** → reia trimiterea
- Mai simplu, dar poate interfera cu datele dacă protocolul nu e gândit corect.

## UART — ideea de bază
- UART convertește datele:
  - din **paralel în serial** la transmisie
  - din **serial în paralel** la recepție
- Adaugă/detectează biții START, STOP și paritate.
- În PC apar frecvent circuitele din familia **16x50**.

## Registre UART 16x50 de știut
- **THR**: buffer de transmisie.
- **RBR**: buffer de recepție.
- **IER**: validează întreruperile.
- **IIR**: arată sursa întreruperii.
- **FCR**: control FIFO.
- **LCR**: formatul cadrului (biți date, paritate, stop); conține **DLAB**.
- **MCR**: control modem.
- **LSR**: stare linie (date disponibile, THR gol, erori).
- **MSR**: stare semnale modem.
- **DLL / DLM**: divizorul pentru baud rate când **DLAB = 1**.

## Configurare minimă UART
1. Setezi **DLAB = 1** în `LCR`.
2. Scrii divizorul în `DLL` și `DLM`.
3. Configurezi formatul cadrului în `LCR` (ex. 8N1).
4. Opțional activezi FIFO în `FCR`.
5. Trimiți/citești date prin `THR` / `RBR`.
6. Verifici `LSR`:
   - bit pentru „date primite”
   - bit pentru „buffer de transmisie gol”.

## Valori utile
- Frecvența tipică UART 16x50: **1.8432 MHz**.
- Divizorul se calculează aproximativ cu:
  - `divizor = 1843200 / (baud * 16)`
- Exemple clasice:
  - **9600 bps → 0x000C**
  - **19200 bps → 0x0006**
  - **115200 bps → 0x0001**

## Ce merită reținut pentru examen
- Diferența **bps vs baud**.
- Structura unui cadru asincron.
- Rolul semnalelor **TX/RX/RTS/CTS/DTR/DSR**.
- Rolul registrelor UART: **THR, RBR, LCR, LSR, DLL/DLM**.
- Ideea de inițializare a portului serial: **baud + format cadru + FIFO + transmitere/recepție**.

