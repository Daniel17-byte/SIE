# Cheat Sheet Colocviu — funcții și API-uri de reținut din cele 5 laboratoare

Scop: **să știi rapid ce funcție folosești, pe ce lățime citește/scrie și în ce laborator apare**.

---

## 0. Ideea mare: ce trebuie să recunoști imediat

### Familie de funcții low-level
- `_inp(...)` → citește **1 octet**
- `_inpw(...)` → citește **1 cuvânt = 16 biți**
- `_inpd(...)` → citește **1 dword = 32 biți**
- `_inmw(...)` → în exemplele PCIe, citește **un WORD** din spațiul de configurație mapat
- `_outp(...)` → scrie **1 octet**
- `_outpw(...)` → scrie **1 cuvânt = 16 biți**
- `_outpd(...)` → scrie **1 dword = 32 biți**

### Regula de memorare
- **byte** → registre de control / status / comandă
- **word** → registre de date pe 16 biți sau transferuri PIO pe 2 octeți
- **dword** → BAR-uri, acces PCI legacy, registre pe 32 biți

---

## 1. PCI Express — ce reții

### Funcții / apeluri esențiale
- `PciBaseAddressUEFI()`
  - îți dă baza spațiului **Enhanced PCIe Configuration Space**
  - fără ea nu poți calcula adresa antetului PCIe mapat

- `GetPciHeader(bus, dev, fun)`
  - calculează adresa antetului pentru un dispozitiv PCIe din **Bus / Device / Function**
  - e funcția-cheie pentru enumerare

- `_inmw((DWORD_PTR)&pCfg->VendorID)`
  - citește `VendorID`
  - test standard: `0xFFFF` = funcție inexistentă

- `_inp((DWORD_PTR)&pCfg->BaseClassCode)`
- `_inp((DWORD_PTR)&pCfg->SubClassCode)`
- `_inp((DWORD_PTR)&pCfg->ProgIf)`
  - le folosești pentru identificarea tipului de dispozitiv

- `_inpd((DWORD_PTR)&pCfg->BaseAddresses[i])`
  - citește un BAR pe 32 biți
  - îl folosești când vrei baza de memorie / I/O a dispozitivului

- `_outpd(PCI_CFG_ADDR, address)` + `_inpd(PCI_CFG_DATA)`
  - metoda **legacy PCI** pe `0xCF8 / 0xCFC`
  - trebuie reținută separat de mecanismul enhanced

### De memorat foarte scurt
- `VendorID` → există sau nu există dispozitivul
- `BaseClass / SubClass / ProgIf` → ce fel de dispozitiv este
- `BAR` → unde sunt mapate resursele hardware
- `0xCF8 / 0xCFC` → acces PCI compatibil vechi

---

## 2. ATA / SATA — ce reții

### Funcții / apeluri esențiale
- `GetPciHeader(...)`
  - refolosit din laboratorul PCIe pentru a ajunge la controlerul SATA

- `_inpd(&pSata->PCMD_BAR / SCMD_BAR / PCNL_BAR / SCNL_BAR)`
  - citești BAR-urile controlerului SATA
  - de aici obții bazele registrelor de comandă și control

- `_inp(cmdBase + ATA_REG_STATUS)`
  - citești `Status`
  - e probabil **cel mai important apel ATA**
  - îl folosești în polling pentru `BSY`, `DRQ`, `ERR`

- `_outp(cmdBase + ATA_REG_CMD, ...)`
  - scrii codul comenzii ATA în registrul `Command`
  - ex.: diagnostic, identify, read native max

- `_outp(cmdBase + ATA_REG_DEVICE, ...)`
  - selectezi unitatea și modul LBA

- `_outp(ctrlBase, _inp(ctrlBase) | / & ~ATA_HOB)`
  - folosit pentru lucrul cu LBA48
  - `HOB` = partea superioară a registrelor pe 48 biți

- `_inpw(cmdBase + ATA_REG_DATA)`
  - citești datele din registrul `Data`
  - folosit la `Identify Device`: **256 cuvinte**

### Helper functions de reținut
- `AtaExecDiagnostic(...)`
  - model de comandă simplă: aștepți, scrii comandă, citești rezultat

- `AtaReadNativeMaxExt(...)`
  - model pentru citirea unui LBA pe 48 biți cu `HOB`

- `AtaIdentifyDevice(...)`
  - funcția clasică de inventariere a discului ATA

- `DecodeIdentifyExtra(...)`
  - nu face I/O, dar e importantă pentru interpretarea bufferului `Identify`

### Pattern ATA de pus pe foaie
```text
asteapta BSY=0
selecteaza unitatea
scrie comanda in Command
asteapta DRQ sau finalizarea
citeste Error / LBA / Data
```

### Registre și biți de ținut minte
- `Status`, `Command`, `Device`, `Data`, `Error`
- `Sector Count`, `LBA0/LBA1/LBA2`, `Device Control`
- `BSY`, `DRQ`, `DRDY`, `ERR`
- `HOB` pentru LBA48

---

## 3. ATAPI — ce reții

### Ideea centrală
- **ATAPI folosește fizic interfața ATA, dar comenzile sunt trimise în pachete**
- comanda-cheie: `ATA_CMD_PACKET`

### Funcții / apeluri esențiale
- `_outp(cmdBase + ATA_REG_DEVICE, ...)`
  - selectezi unitatea

- `_outp(cmdBase + ATA_REG_CMD, ATA_CMD_PACKET)`
  - pornești o comandă ATAPI pe pachete

- `_outp(cmdBase + ATA_REG_CMD, ATAPI_CMD_IDENTIFY_PACKET)`
  - pentru identificarea unității ATAPI

- `_inp(cmdBase + ATA_REG_STATUS)`
  - polling pe `BSY` și `DRQ`, ca la ATA

- `_outpw(cmdBase + ATA_REG_DATA, ((WORD*)pkt)[i])`
  - trimiți pachetul SCSI/ATAPI de 12 octeți, câte 2 octeți o dată

- `_inpw(cmdBase + ATA_REG_DATA)`
  - citești datele returnate de unitate

### Helper functions de reținut
- `IdentifyPacketDevice(...)`
  - identificare ATAPI

- `AtapiStartStopUnit(...)`
  - deschiderea tăvii cu `START/STOP UNIT`

- `AtapiReadRecordedCapacity(...)`
  - citește ultimul bloc logic și lungimea blocului

- `AtapiReadToc(...)`
  - citește TOC-ul CD-ului

### Comenzi importante de memorat
- `ATAPI_CMD_IDENTIFY_PACKET = 0xA1`
- `ATA_CMD_PACKET = 0xA0`
- `SCSI_START_STOP_UNIT = 0x1B`
- `SCSI_READ_CD_CAPACITY = 0x25`
- `SCSI_READ_TOC = 0x43`

### Pattern ATAPI de pus pe foaie
```text
asteapta BSY=0 / DRQ=0
selecteaza unitatea
scrie PACKET in Command
asteapta DRQ=1
trimite pachetul de 12 octeti prin Data
citeste datele daca exista faza PIO input
```

---

## 4. Port Serial — ce reții

### Varianta low-level pe porturi
- `__inp(PORT)` / `_inp(PORT)`
  - citești un registru UART
  - în exemple apar ambele variante; ideea de reținut rămâne aceeași: **citire din port**

- `__outp(PORT, value)` / `_outp(PORT, value)`
  - scrii într-un registru UART

### Registre UART importante
- `DLL`, `DLM` → divizor baud rate
- `LCR` → format cadru + `DLAB`
- `MCR` → linii de control (`DTR`, `RTS`, `OUT2`)
- `LSR` → stare (`THRE`, `DR`)
- `THR` → transmitere
- `RBR` → recepție

### Funcții / helper-e de reținut
- `TestCom1()`
  - verifică dacă portul răspunde

- `InitCom1()`
  - inițializare la **115200, 8N1**
  - foarte probabil de întrebat

- `SendChar(ch)`
  - așteaptă `THRE = 1`, apoi scrie în `THR`

- `RecvChar()`
  - așteaptă `DR = 1`, apoi citește din `RBR`

- `SendString(...)`
  - șir = apel repetat la `SendChar`

- `RecvLoop()` / `EchoLoop()`
  - modele simple pentru recepție / ecou

### WinAPI de reținut
- `CreateFileA("COM1", ...)`
  - deschide portul serial ca handle Windows

- `WriteFile(...)`
  - trimite date pe COM

- `ReadFile(...)`
  - citește date de pe COM

- `CloseHandle(hCom)`
  - închide portul

### Biți pe care merită să-i știi
- `LCR_DLAB`
- `LCR_8N1`
- `MCR_DTR`, `MCR_RTS`, `MCR_OUT2`
- `LSR_THRE`
- `LSR_DR`

### Pattern serial de pus pe foaie
```text
init UART
la TX: asteapta THRE=1, scrie in THR
la RX: asteapta DR=1, citeste din RBR
```

---

## 5. SMBus — ce reții

### Funcții / apeluri esențiale
- `GetSmbusBase(pCfg)`
  - citește `SMB_BASE` din configurația PCI/PCIe
  - maschează bitul 0 și obține baza reală I/O

- `_inpd((DWORD_PTR)&((SMBUS_CFG*)pCfg)->SMB_BASE)`
  - citești registrul cu baza controlerului SMBus

- `_outp(base + HST_CNT, ...)`
- `_inp(base + HST_STS)`
  - cuplul cel mai important din SMBus
  - `HST_CNT` = pornești/comanzi tranzacția
  - `HST_STS` = verifici finalizarea / erorile

- `Sleep(100)`
  - apare la abort tranzacție, ca întârziere între setare și resetare `KILL`

### Helper functions de reținut
- `AbortTransaction(base)`
  - setezi `KILL`, aștepți, ștergi `KILL`, verifici starea

- `SmbReceiveByte(slaveAddr)`
  - comanda minimă pentru detectare dispozitiv SMBus
  - foarte importantă pentru scanare

- `ScanSmbus()`
  - parcurge adresele și găsește dispozitive

- `SmbReadByte(slaveAddr, cmd, value)`
  - citești un registru intern selectat prin comandă

- `DumpSpd(spdAddr)`
  - citești SPD folosind `Read Byte` + `Receive Byte`

- `DecodeSpd(spd)`
  - decodifici conținutul SPD

- `SmbI2cRead(slaveAddr, cmd, buffer, count)`
  - folosești protocol I2C Read pentru dispozitive mai sensibile / compatibile I2C

### Registre importante
- `SMB_BASE`
- `HST_STS`
- `HST_CNT`
- `HST_CMD`
- `XMIT_SLVA`
- `HST_D0`, `HST_D1`

### Biți / flag-uri importante
- `KILL_BIT`
- `HOST_BUSY_BIT`
- `FAILED_BIT`
- `STS_INTR`
- `STS_DEV_ERR`
- `STS_BUS_ERR`
- `CNT_START`

### Pattern SMBus de pus pe foaie
```text
stergi HST_STS
scrii adresa slave in XMIT_SLVA
scrii comanda daca protocolul o cere
scrii START + tip protocol in HST_CNT
astepti INTR / FAILED / BUS_ERR / DEV_ERR
citesti HST_D0 daca tranzactia a reusit
```

---

## 6. Top funcții pe care chiar merită să le știi pe de rost

### Tier 1 — aproape sigur utile la colocviu
- `_inp`
- `_outp`
- `_inpw`
- `_outpw`
- `_inpd`
- `_outpd`
- `GetPciHeader`
- `PciBaseAddressUEFI`
- `AtaIdentifyDevice`
- `IdentifyPacketDevice`
- `InitCom1`
- `SendChar`
- `RecvChar`
- `GetSmbusBase`
- `SmbReceiveByte`
- `SmbReadByte`
- `SmbI2cRead`

### Tier 2 — foarte bune pentru interpretare / completare
- `PrintVendorDeviceInfo`
- `ReadPciDwordLegacy`
- `DumpBars`
- `AtaExecDiagnostic`
- `AtaReadNativeMaxExt`
- `AtapiStartStopUnit`
- `AtapiReadRecordedCapacity`
- `AtapiReadToc`
- `AbortTransaction`
- `ScanSmbus`
- `DumpSpd`
- `DecodeSpd`
- `CreateFileA`
- `WriteFile`
- `ReadFile`

---

## 7. Mini-asocieri rapide pentru memorie

- **PCIe** → `GetPciHeader`, `_inmw`, `_inpd`, `_outpd`, `0xCF8/0xCFC`
- **ATA** → `_inp Status`, `_outp Command`, `_inpw Data`, `HOB`
- **ATAPI** → `PACKET`, `_outpw` pentru pachetul de 12 octeți
- **Serial** → `InitCom1`, `THRE`, `DR`, `CreateFileA/WriteFile/ReadFile`
- **SMBus** → `SMB_BASE`, `HST_STS`, `HST_CNT`, `SmbReceiveByte`, `SmbReadByte`

---

## 8. Dacă ai 2 minute înainte de colocviu, reține doar atât

1. `_inp / _outp` = byte, `_inpw / _outpw` = word, `_inpd / _outpd` = dword.
2. La **ATA/ATAPI** te uiți aproape mereu la `Status` și `Data`.
3. La **PCIe** verifici `VendorID`, `Class/Subclass`, `BAR`.
4. La **Serial**: TX → `THRE`, RX → `DR`.
5. La **SMBus**: cureți `HST_STS`, pornești din `HST_CNT`, verifici `INTR/FAILED`.

---

## 9. Formulă mentală bună pentru toate laboratoarele

```text
1. găsești baza
2. citești/scrii registrul corect
3. aștepți bitul de stare potrivit
4. transferi datele
5. verifici rezultatul
```

