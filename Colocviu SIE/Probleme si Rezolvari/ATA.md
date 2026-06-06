# ATA — cerințe și rezolvări explicate

## 1. Cerințe teoretice și răspunsuri

### 1. Care este scopul tehnologiei S.M.A.R.T.?
**Răspuns:**
- Monitorizează parametrii interni ai unității de disc.
- Permite **predicția defectării** și avertizarea utilizatorului înainte de pierderea datelor.

### 2. Ce aduce nou ATA/ATAPI-6?
**Răspuns:**
- adresare **LBA pe 48 de biți**;
- suport pentru capacități mult mai mari;
- extensii ale comenzilor și ale modelului de adresare.
sdsadsadasdas
### 3. Care sunt avantajele SATA față de ATA paralelă?
**Răspuns:**
- cabluri mai simple și mai înguste;
- interferențe mai mici;
- viteze mai mari;
- conectică și airflow mai bune;
- arhitectură mai modernă și scalabilă.

### 4. Ce aduc versiunile SATA 3.2 și 3.3?
**Răspuns scurt:**
- optimizări și extensii pentru management, compatibilitate și funcții moderne de stocare.
- Ideea importantă pentru examen: standardul SATA a evoluat prin creșterea capabilităților și rafinarea funcțiilor, nu doar prin viteză brută.

---

## 2. Aplicații practice — cerințe și rezolvare

### 7.10.2 — determinarea adreselor de bază pentru controlerul SATA
**Cerință:**
Scrie o aplicație care determină adresele de bază ale registrelor de comandă și control pentru primul controler SATA, pentru canalul primar și secundar.

**Rezolvare:**
1. Creezi proiectul Windows Desktop și adaugi `AppScroll`, `Hw.h`, `Hw64.lib`, `ATA-ATAPI.h`, `PciBaseAddressUEFI.cpp`.
2. Obții baza spațiului PCIe cu `PciBaseAddressUEFI()`.
3. Refolosești funcția din laboratorul PCIe pentru a obține pointer la antetul de configurație al controlerului SATA.
4. Citești BAR-urile:
   - `PCMD_BAR` / `SCMD_BAR` pentru blocurile de comandă;
   - `PCNL_BAR` / `SCNL_BAR` pentru blocurile de control.
5. Cureți biții inferiori nerelevanți:
   - biții `2..0` la command BAR;
   - biții `1..0` la control BAR.
6. Afișezi separat adresele pentru canalul primar și secundar.

```c
DWORD GetAtaChannelBases(BYTE bus, BYTE dev, BYTE fun, int channel)
{
    // Cautam configuratia PCI a controlerului SATA.
    SATA_CFG* pSata = (SATA_CFG*)GetPciHeader(bus, dev, fun);
    // Pentru fiecare canal, BAR-ul de command este diferit.
    DWORD cmdBar  = (channel == 0) ? _inpd((DWORD_PTR)&pSata->PCMD_BAR)
                                   : _inpd((DWORD_PTR)&pSata->SCMD_BAR);
    // Similar, BAR-ul de control este separat pe canal.
    DWORD ctrlBar = (channel == 0) ? _inpd((DWORD_PTR)&pSata->PCNL_BAR)
                                   : _inpd((DWORD_PTR)&pSata->SCNL_BAR);

    // Eliminam bitii de atribut din BAR si pastram doar baza I/O.
    WORD cmdBase  = (WORD)(cmdBar  & ~0x7);
    WORD ctrlBase = (WORD)(ctrlBar & ~0x3);

    // Impachetam ambele adrese intr-un DWORD: high=ctrl, low=cmd.
    return ((DWORD)ctrlBase << 16) | cmdBase;
}
```

**Explicație:**
- BAR-urile conțin resursele hardware mapate ale controlerului; biții de jos sunt biți de atribut, nu parte din adresă.

### 7.10.3 — Execute Device Diagnostic
**Cerință:**
Trimite comanda `Execute Device Diagnostic` unei unități ATA și afișează rezultatul.

**Rezolvare:**
- Aștepți până când `BSY = 0` și `DRQ = 0`.
- Scrii codul comenzii în registrul `Command`.
- Aștepți terminarea, cu timeout rezonabil.
- La succes, citești:
  - registrul `Error` pentru codul de diagnostic;
  - registrele semnăturii (`Sector Count`, `LBA Low`, `LBA Mid`, `LBA High`).
- Dacă semnătura este cea ATAPI (`01 01 14 EB` în registrele corespunzătoare), anunți că unitatea este ATAPI.

```c
#define ATA_REG_ERROR   1
#define ATA_REG_SCNT    2
#define ATA_REG_LBA0    3
#define ATA_REG_LBA1    4
#define ATA_REG_LBA2    5
#define ATA_REG_DEVICE  6
#define ATA_REG_STATUS  7
#define ATA_REG_CMD     7

#define ATA_SR_ERR   0x01
#define ATA_SR_DRQ   0x08
#define ATA_SR_DRDY  0x40
#define ATA_SR_BSY   0x80

#define ATA_CMD_EXEC_DIAG 0x90

void AtaExecDiagnostic(WORD cmdBase)
{
    // Nu lansam comanda pana cand dispozitivul nu este idle.
    while (_inp(cmdBase + ATA_REG_STATUS) & (ATA_SR_BSY | ATA_SR_DRQ))
    {
        ;
    }

    // Scriem codul comenzii de diagnostic in registrul Command.
    _outp(cmdBase + ATA_REG_CMD, ATA_CMD_EXEC_DIAG);

    // Asteptam finalizarea efectiva a testului intern.
    while (_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_BSY)
    {
        ;
    }

    // Citim codul de diagnostic si semnatura pentru identificare ATA/ATAPI.
    BYTE diag = (BYTE)_inp(cmdBase + ATA_REG_ERROR);
    BYTE scnt = (BYTE)_inp(cmdBase + ATA_REG_SCNT);
    BYTE lba0 = (BYTE)_inp(cmdBase + ATA_REG_LBA0);
    BYTE lba1 = (BYTE)_inp(cmdBase + ATA_REG_LBA1);
    BYTE lba2 = (BYTE)_inp(cmdBase + ATA_REG_LBA2);

    // afiseaza cod diagnostic si semnatura
}
```

**Explicație:**
- Aceasta este comanda de bază pentru a verifica răspunsul unității și pentru a deosebi ATA de ATAPI.

### 7.10.4 — Read Native Max Address Ext
**Cerință:**
Trimite comanda `Read Native Max Address Ext` și afișează LBA-ul maxim și capacitatea în GB.

**Rezolvare:**
1. Selectezi unitatea și setezi adresarea LBA.
2. Trimiți comanda.
3. La succes:
   - setezi `HOB = 0` și citești octeții inferiori din registrele `LBA`;
   - setezi `HOB = 1` și citești octeții superiori.
4. Reconstruiești valoarea LBA pe 48 biți.
5. Calculezi capacitatea:
   - `capacitate = (numar_sectoare * 512) / 10^9` sau varianta în GiB.

```c
#define ATA_REG_DEVCTL  0x206
#define ATA_DH_LBA      0x40
#define ATA_DEV_MASTER  0x00
#define ATA_HOB         0x80
#define ATA_CMD_READ_NATIVE_MAX_EXT 0x27

void AtaReadNativeMaxExt(WORD cmdBase, WORD ctrlBase, BYTE devNo)
{
    // Selectam unitatea tinta in modul LBA.
    _outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : ATA_DEV_MASTER));
    // Cerem adresa maxima nativa pe 48 biti.
    _outp(cmdBase + ATA_REG_CMD, ATA_CMD_READ_NATIVE_MAX_EXT);

    // Cat timp BSY=1, rezultatul nu este stabil.
    while (_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_BSY)
    {
        ;
    }

    // HOB=0: citim partea joasa (low bytes).
    _outp(ctrlBase, _inp(ctrlBase) & ~ATA_HOB);
    BYTE l0 = (BYTE)_inp(cmdBase + ATA_REG_LBA0);
    BYTE l1 = (BYTE)_inp(cmdBase + ATA_REG_LBA1);
    BYTE l2 = (BYTE)_inp(cmdBase + ATA_REG_LBA2);

    // HOB=1: citim partea inalta (high bytes) din aceleasi registre.
    _outp(ctrlBase, _inp(ctrlBase) | ATA_HOB);
    BYTE h0 = (BYTE)_inp(cmdBase + ATA_REG_LBA0);
    BYTE h1 = (BYTE)_inp(cmdBase + ATA_REG_LBA1);
    BYTE h2 = (BYTE)_inp(cmdBase + ATA_REG_LBA2);

    // Recompunem valoarea LBA48 din cei 6 octeti cititi.
    unsigned long long maxLba =
        ((unsigned long long)h2 << 40) |
        ((unsigned long long)h1 << 32) |
        ((unsigned long long)h0 << 24) |
        ((unsigned long long)l2 << 16) |
        ((unsigned long long)l1 << 8)  |
        (unsigned long long)l0;

    // afiseaza maxLba si capacitatea
}
```

**Explicație:**
- `HOB` este cheia pentru citirea părții superioare a valorilor pe 48 de biți.

### 7.10.5 — Identify Device
**Cerință:**
Trimite `Identify Device` și afișează model, serie, firmware, număr total de sectoare LBA28/LBA48 și capacitatea.

**Rezolvare:**
- Selectezi unitatea în `Device`.
- Trimiți `Identify Device`.
- Aștepți `DRQ = 1`.
- Citești din `Data` un bloc de **256 cuvinte**.
- Extragi:
  - modelul din cuvintele `27..46`;
  - seria din `10..19`;
  - firmware din `23..26`;
  - LBA28 din `60..61`;
  - LBA48 din `100..103`.
- Calculezi capacitatea pentru fiecare mod de adresare.

```c
#define ATA_REG_DATA 0
#define ATA_CMD_IDENTIFY 0xEC

void AtaIdentifyDevice(WORD cmdBase, BYTE devNo, WORD* idBuf)
{
    // Alegem dispozitivul (master/slave) si setam LBA in Device.
    _outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : 0x00));
    // Lansam comanda standard de identificare.
    _outp(cmdBase + ATA_REG_CMD, ATA_CMD_IDENTIFY);

    // Asteptam pana cand unitatea termina pregatirea datelor.
    while (_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_BSY)
    {
        ;
    }

    // DRQ=1 inseamna ca blocul de date poate fi citit.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // IDENTIFY livreaza exact 256 cuvinte de 16 biti.
    for (int i = 0; i < 256; i++)
    {
        idBuf[i] = (WORD)_inpw(cmdBase + ATA_REG_DATA);
    }
}
```

**Explicație:**
- `Identify Device` este comanda standard pentru inventarierea capabilităților și parametrilor unității.

### 7.10.6 — informații suplimentare din Identify Device
**Cerință:**
Extinde funcția precedentă și afișează și:
- sectoare pe întrerupere pentru `Read/Write Multiple`;
- suport DMA multiword 2;
- suport PIO 4;
- ciclul minim PIO cu `IORDY`;
- versiunea standardului ATA;
- suport LBA48;
- suport/selectare Ultra DMA 6.

**Rezolvare:**
- Citești câmpurile suplimentare din bufferul `Identify Device`:
  - cuvântul `47` și `59`;
  - cuvântul `63`;
  - cuvântul `64`;
  - cuvântul `68`;
  - cuvântul `80`;
  - cuvântul `83`;
  - cuvântul `88`.
- Decodifici fiecare bit conform specificației.
- Afișezi valorile într-un format clar.

```c
void DecodeIdentifyExtra(const WORD* id)
{
    // Word 47/59: transferul in modul multiple (maxim + curent).
    BYTE maxMulti = (BYTE)(id[47] & 0x00FF);
    BYTE curMulti = (BYTE)(id[59] & 0x00FF);
    // Word 63 bit10: suport MWDMA mode 2.
    bool mwdma2   = (id[63] & (1 << 10)) != 0;
    // Word 64 bit1: suport PIO mode 4.
    bool pio4     = (id[64] & (1 << 1)) != 0;
    // Word 68: timp minim PIO cu IORDY.
    WORD pioCycle = id[68];
    // Word 80: versiuni ATA suportate de dispozitiv.
    WORD stdAta   = id[80];
    // Word 83 bit10: capabilitate LBA48.
    bool lba48    = (id[83] & (1 << 10)) != 0;
    // Word 88: moduri Ultra DMA suportate/selectate.
    WORD udma     = id[88];

    // afiseaza valorile decodificate
}
```

**Explicație:**
- Aici laboratorul testează dacă poți trece de la „citire brută de cuvinte” la „decodificare a capabilităților reale ale discului”.

---

## 3. Șablon logic pentru comenzile ATA
```text
asteapta BSY=0
selecteaza unitatea
incarca registrele necesare
scrie codul in Command
asteapta finalizarea / DRQ
citeste Error sau blocul de date
interpreteaza rezultatul
```

---

## 4. Ce trebuie reținut rapid
- Registre cheie: `Status`, `Command`, `Device`, `Data`, `Error`, `Sector Count`, `LBA Low/Mid/High`, `Device Control`.
- Biți esențiali din `Status`: `BSY`, `DRDY`, `DRQ`, `ERR`.
- Comenzile de bază pentru laborator:
  - `Execute Device Diagnostic`
  - `Read Native Max Address Ext`
  - `Identify Device`
- `HOB` este obligatoriu pentru lucrul cu valori LBA pe 48 de biți.

