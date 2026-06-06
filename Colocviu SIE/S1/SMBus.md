# Lab 3 — Magistrala SMBus

## Scop
- Înțelegerea magistralei SMBus și a controlerului SMBus Intel.
- Detectarea dispozitivelor de pe magistrală și citirea unor memorii SPD/I2C.

## Esențial
- **SMBus** este o magistrală serială simplă cu **2 linii**:
  - **SMBCLK** — ceas
  - **SMBDAT** — date
- Este apropiată de **I2C**, dar are reguli mai stricte pentru tensiuni, timing și protocoale.
- Este folosită pentru management de sistem: senzori, SPD, baterii inteligente, memorii etc.

## Caracteristici de bază
- Magistrală **multi-master** și **master-slave**.
- Liniile sunt de tip **open-drain / open-collector** cu rezistențe de pull-up.
- Când magistrala e liberă, ambele linii sunt la 1.
- Frecvențe tipice:
  - clasic: **10 kHz – 100 kHz**
  - versiunile mai noi permit și **400 kHz** sau **1 MHz**

## Reguli de transfer
- Datele sunt valide când **SMBCLK = 1**.
- Linia de date se schimbă doar când **SMBCLK = 0**.
- Orice transfer începe cu **START** și se termină cu **STOP**.
- Adresarea standard folosește:
  - **adresă de 7 biți**
  - plus bitul **R/W#**
- Fiecare octet este urmat de **ACK** sau **NACK**.

## START / STOP / ACK
- **START**: `SMBDAT` trece 1→0 când `SMBCLK = 1`.
- **STOP**: `SMBDAT` trece 0→1 când `SMBCLK = 1`.
- **ACK**: receptorul trage `SMBDAT = 0` pe bitul de confirmare.
- **NACK**: receptorul lasă `SMBDAT = 1`.

## Arbitraj
- Dacă doi masteri pornesc simultan, arbitrajul se face pe `SMBDAT`.
- Masterul care transmite 1 dar citește 0 **pierde arbitrajul**.
- Rezultă un mecanism sigur pentru magistrală multi-master.

## Protocoale SMBus importante
- **Quick Command** — comanda este chiar bitul R/W.
- **Send Byte / Receive Byte**.
- **Write Byte / Write Word**.
- **Read Byte / Read Word**.
- **Process Call** — scrii 2 octeți, apoi citești 2 octeți.
- **Block Write / Block Read**.
- **Block Write-Block Read Process Call**.
- Unele variante pot include și **PEC** (Packet Error Code, bazat pe CRC-8).

## Diferențe SMBus vs I2C
- SMBus are limite mai stricte pentru **VDD**, **VIL**, **VIH**.
- SMBus definește mai clar timpii și condițiile de timeout.
- SMBus are protocoale standardizate pentru comenzi.
- În practică, multe controlere SMBus pot comunica și cu dispozitive **I2C**.

## Controlerul SMBus Intel — ce trebuie știut
- Se află de regulă în chipset/PCH.
- Are două categorii de registre:
  - **registre de configurație PCI/PCIe**
  - **registre de I/O** pentru execuția comenzilor SMBus

## Registre PCI importante
- **VID / DID** — identificare controler.
- **SMBMBAR0 / SMBMBAR1** — bază pentru registre mapate în memorie.
- **SMB_BASE** — bază pentru registre mapate în spațiul I/O.
- **HOSTC** — configurare host SMBus.

## Biți importanți din `HOSTC`
- **HST_EN** — activează controlerul.
- **SMB_SMI_EN** — rutează evenimente către SMI.
- **I2C_EN** — permite adaptări pentru dispozitive I2C.
- **Soft SMBus Reset** — reset software.
- **SPD Write Disable** — blochează scrierea în zona SPD `0x50..0x57`.

## Registre I/O importante
- **HST_STS** — stare host.
- **HST_CNT** — control comandă.
- **HST_CMD** — cod de comandă.
- **XMIT_SLVA** — adresă slave + sens transfer.
- **HST_D0 / HST_D1** — octeți de date.
- **Host_BLOCK_DB** — date pentru transfer pe bloc.
- **PEC** — cod de verificare erori.

## Ideea de lucru cu controlerul Intel
1. Identifici controlerul SMBus din configurația PCIe.
2. Citești baza registrelor (`SMB_BASE` sau `SMBMBAR`).
3. Activezi controlerul din `HOSTC` dacă e necesar.
4. Verifici/ștergi biții de stare în `HST_STS`.
5. Încarci adresa slave, comanda și datele în registre.
6. Pornești tranzacția prin `HST_CNT`.
7. Verifici finalizarea și eventualele erori.

## Ce merită reținut pentru examen
- SMBus = **2 fire, open-drain, START/STOP/ACK**.
- Diferența față de I2C: **reguli mai stricte + protocoale standard**.
- Protocoalele de bază: **Quick, Send/Receive Byte, Read/Write Byte/Word, Block**.
- Controlerul Intel se lucrează prin: **HOSTC, HST_STS, HST_CNT, HST_CMD, XMIT_SLVA, HST_D0/HST_D1**.
- SPD-urile DIMM sunt în mod tipic pe adresele **0x50..0x57**.

