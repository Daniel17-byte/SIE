# Cheat Sheet 5x5 — cele 5 laboratoare din `Probleme si Rezolvari`

Scop: doar lucruri de cod, cate **5 obligatorii** pentru fiecare laborator.

---

## 1) PCI Express — 5 lucruri obligatorii (cod)

1. Seteaza baza ECAM o singura data: `gPciBase = PciBaseAddressUEFI();`.
2. Calculeaza adresa header-ului cu B/D/F: `addr = base + (bus<<20) + (dev<<15) + (fun<<12)` in `GetPciHeader(...)`.
3. Exista functie doar daca `VendorID != 0xFFFF` (citit cu `_inmw(...)`).
4. Pentru identificare minima citeste: `BaseClassCode`, `SubClassCode`, `ProgIf` (cu `_inp(...)`).
5. La BAR-uri: `if (bar & 1) ioBase = bar & ~0x3; else memBase = bar & ~0xF;` (+ skip urmatorul BAR daca e 64-bit).

---

## 2) ATA — 5 lucruri obligatorii (cod)

1. Inainte de comanda: polling pe `Status` pana `BSY=0` (si, dupa caz, `DRQ=0`).
2. Selectezi unitatea cu `_outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : 0x00));`.
3. Trimiteri comenzi prin `_outp(cmdBase + ATA_REG_CMD, ...)` (`0x90`, `0x27`, `0xEC`).
4. La `IDENTIFY`, citesti fix `256` words din `ATA_REG_DATA` cu `_inpw(...)`.
5. La LBA48, comuti `HOB` in `Device Control` si reconstruiesti valoarea din low/high bytes.

---

## 3) ATAPI — 5 lucruri obligatorii (cod)

1. Identificare corecta ATAPI: `_outp(... ATA_REG_CMD, 0xA1)` (`IDENTIFY PACKET DEVICE`).
2. Pentru comenzi SCSI prin ATA: `_outp(... ATA_REG_CMD, 0xA0)` (`PACKET`).
3. Pachetul ATAPI este de 12 bytes si se trimite in `Data` ca `6` words (`_outpw(...)`).
4. Respecta fazele `DRQ`: prima pentru trimiterea pachetului, a doua (la PIO input) pentru citirea datelor.
5. Datele de raspuns multi-byte sunt de obicei big-endian (ex. `READ CAPACITY`), deci reconstruiesti explicit cu shift-uri.

---

## 4) Port Serial — 5 lucruri obligatorii (cod)

1. Init 115200 8N1: `LCR=DLAB`, `DLL=1`, `DLM=0`, apoi `LCR=0x03`.
2. Activezi linii control in `MCR`: `DTR | RTS | OUT2`.
3. TX corect: astepti `LSR_THRE` in `LSR`, apoi scrii in `THR`.
4. RX corect: astepti `LSR_DR` in `LSR`, apoi citesti din `RBR`.
5. La operatii pe bit din port folosesti read-modify-write (`|`, `&~`, `^`) ca sa nu strici ceilalti biti.

---

## 5) SMBus — 5 lucruri obligatorii (cod)

1. Baza SMBus se extrage din `SMB_BASE` cu masca: `base = smbBase & 0xFFFE`.
2. Inainte de fiecare tranzactie curata statusul: `_outp(base + HST_STS, 0xFF)`.
3. Programeaza adresa slave in `XMIT_SLVA` cu bitul R/W (`(addr<<1)|1` la read).
4. Porneste protocolul cu `HST_CNT = CNT_START | protocol`, apoi polling pe `HST_STS` pana `INTR` sau eroare.
5. Succes doar daca `STS_INTR` este setat; la succes citesti byte-ul din `HST_D0`.

---

## Mini formula comuna (toate 5)

`selectezi baza -> configurezi registre -> START/comanda -> polling status -> transfer date`

