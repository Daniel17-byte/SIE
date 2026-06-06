# SMBus — cerințe și rezolvări explicate

## 1. Cerințe teoretice și răspunsuri

### 1. Ce îmbunătățiri aduc versiunile 2.0 și 3.0 ale SMBus?
**Răspuns:**
- **SMBus 2.0**: suport electric mai robust, util inclusiv pentru plăci/extensii; tensiune nominală redusă la 3 V; suport mai bun pentru utilizări moderne.
- **SMBus 3.0**: tensiune nominală redusă la 1.8 V; protocoale noi pentru 32/64 biți; frecvențe mai mari, până la 400 kHz și 1 MHz.

### 2. Care sunt diferențele principale dintre SMBus și I2C?
**Răspuns:**
- SMBus are limite mai stricte pentru tensiuni și timing.
- SMBus definește timeout-uri și protocoale standardizate de comandă.
- I2C este mai general și mai flexibil; SMBus este mai orientat pe management de sistem.

### 3. Care este diferența dintre ciclul de citire I2C și protocolul SMBus Block Read?
**Răspuns:**
- La **I2C Read**, citirea urmează logica specifică dispozitivului I2C.
- La **SMBus Block Read**, dispozitivul trimite explicit mai întâi **numărul de octeți** din bloc, apoi blocul de date.

### 4. Care este efectul bitului `I2C_EN` comparativ cu selectarea comenzii `I2C Read`?
**Răspuns:**
- `I2C_EN` modifică modul de lucru al controlerului SMBus ca să fie mai compatibil cu unele dispozitive I2C.
- Comanda `I2C Read` selectează explicit un anumit tip de tranzacție de citire în stil I2C.
- Deci: primul este **setare de mod**, al doilea este **tip concret de comandă**.

---

## 2. Aplicații practice — cerințe și rezolvare

### 3.8.2 — determinarea adresei de bază a registrelor SMBus
**Cerință:**
Scrie o funcție care returnează adresa de bază a registrelor SMBus mapate în spațiul de I/O.

**Rezolvare:**
- Pornești din proiectul din laboratorul PCIe care identifică controlerul SMBus.
- Citești registrul `SMB_BASE` din antetul PCIe al controlerului.
- Extragi cuvântul inferior și resetezi bitul 0.
- Salvezi rezultatul într-o variabilă globală și îl afișezi.

```c
WORD GetSmbusBase(PCI_CONFIG0* pCfg)
{
    DWORD smbBase = _inpd((DWORD_PTR)&((SMBUS_CFG*)pCfg)->SMB_BASE);
    return (WORD)(smbBase & 0xFFFE);
}

WORD gSmbBase = 0;
```

**Explicație:**
- Bitul 0 este bit de control/aliniere și nu face parte din adresa reală.

### 3.8.3 — abandonarea tranzacției curente
**Cerință:**
Scrie o funcție care întrerupe tranzacția SMBus în curs.

**Rezolvare:**
1. Setezi bitul `KILL` din `HST_CNT` / `Host Control`.
2. Aștepți puțin (de ex. 100 ms).
3. Ștergi bitul `KILL`.
4. Verifici în `HST_STS` că:
   - `HOST_BUSY = 0`
   - `FAILED = 1`

```c
#define HST_STS   0x00
#define HST_CNT   0x02

#define KILL_BIT      0x02
#define HOST_BUSY_BIT 0x01
#define FAILED_BIT    0x10

int AbortTransaction(WORD base)
{
    _outp(base + HST_CNT, _inp(base + HST_CNT) | KILL_BIT);
    Sleep(100);
    _outp(base + HST_CNT, _inp(base + HST_CNT) & ~KILL_BIT);

    BYTE sts = (BYTE)_inp(base + HST_STS);
    return (((sts & HOST_BUSY_BIT) == 0) && (sts & FAILED_BIT)) ? 0 : 1;
}
```

**Explicație:**
- Controlerul semnalează astfel că tranzacția a fost forțată să se oprească.

### 3.8.4 — comanda Receive Byte
**Cerință:**
Scrie o funcție care transmite `Receive Byte` unui dispozitiv SMBus.

**Rezolvare:**
- Ștergi biții de stare vechi din `HST_STS`.
- Încarci adresa slave în `XMIT_SLVA` cu bitul de citire.
- Selectezi tipul de comandă `Receive Byte` în `HST_CNT`.
- Pornești tranzacția.
- Aștepți finalizarea.
- Succes dacă `INTR = 1`; eroare dacă apare `FAILED`, `BUS_ERR` sau `DEV_ERR`.

```c
#define XMIT_SLVA 0x04          // registrul în care se scrie adresa slave-ului și bitul R/W
#define HST_CMD   0x03          // registrul pentru codul de comandă SMBus (nu este folosit la Receive Byte)
#define HST_D0    0x05          // primul registru de date al controlerului SMBus

#define STS_INTR    0x02        // bit de stare: tranzacția s-a terminat cu succes și a generat interrupt/completion
#define STS_DEV_ERR 0x04        // bit de stare: dispozitivul a răspuns cu eroare / NACK / problemă de dispozitiv
#define STS_BUS_ERR 0x08        // bit de stare: eroare pe magistrală SMBus/I2C

#define CNT_START        0x40   // bit de control: pornește efectiv tranzacția SMBus
#define CNT_CMD_RECVBYTE 0x04   // codul protocolului SMBus pentru comanda Receive Byte

int SmbReceiveByte(BYTE slaveAddr)                           // funcție care încearcă o tranzacție SMBus de tip Receive Byte către adresa dată
{                                                            // începutul funcției
    _outp(gSmbBase + HST_STS, 0xFF);                         // ștergi toate flag-urile vechi de stare, ca să nu interpretezi erori rămase dintr-o tranzacție anterioară
    _outp(gSmbBase + XMIT_SLVA, (slaveAddr << 1) | 1);       // scrii adresa dispozitivului slave; o deplasezi la stânga și pui bitul 0 = 1 pentru operație de citire
    _outp(gSmbBase + HST_CNT, CNT_START | CNT_CMD_RECVBYTE); // selectezi protocolul Receive Byte și pornești tranzacția

    while ((_inp(gSmbBase + HST_STS) & (STS_INTR | STS_DEV_ERR | STS_BUS_ERR | FAILED_BIT)) == 0)
    {                                                        // cât timp nu s-a terminat tranzacția și nu a apărut nicio eroare, continui să aștepți
        ;                                                    // buclă de polling activ; nu face altceva decât să verifice repetat registrul de stare
    }                                                        // sfârșitul buclei de așteptare

    BYTE sts = (BYTE)_inp(gSmbBase + HST_STS);               // citești starea finală a controlerului după terminarea tranzacției
    return (sts & STS_INTR) ? 0 : 1;                         // întorci 0 dacă a existat succes (bitul INTR este setat), altfel 1 pentru eroare
}                                                            // sfârșitul funcției SmbReceiveByte
```

**Explicație:**
- `Receive Byte` este comanda minimă pentru detectarea rapidă a unui dispozitiv care răspunde.

### 3.8.5 — scanarea magistralei SMBus
**Cerință:**
Identifică dispozitivele cu adrese între `0x10` și `0x7F`.

**Rezolvare:**
- Rulezi `Receive Byte` pentru fiecare adresă.
- Dacă răspunsul este valid, afișezi adresa.
- Clasifici sumar după intervale:
  - `0x18..0x1F` → senzori termici SPD
  - `0x30..0x37` → write protection SPD
  - `0x40..0x47` → RTC
  - `0x50..0x57` → memorii SPD

```c
void ScanSmbus(void)
{
    for (BYTE addr = 0x10; addr <= 0x7F; addr++)
    {
        if (SmbReceiveByte(addr) == 0)
        {
            // afiseaza adresa gasita

            if (addr >= 0x50 && addr <= 0x57)
            {
                // afiseaza: SPD EEPROM
            }
        }
    }
}
```

**Explicație:**
- Nu toate adresele sunt folosite; scanarea este metoda practică de descoperire a dispozitivelor.

### 3.8.6 — comanda Read Byte
**Cerință:**
Scrie o funcție care transmite `Read Byte` cu cod de comandă.

**Rezolvare:**
- Față de `Receive Byte`, încarci și `HST_CMD` cu codul comenzii.
- Restul secvenței este similar: selectare protocol, start, așteptare, verificare stare.

```c
#define CNT_CMD_READBYTE 0x08                             // codul protocolului SMBus pentru comanda Read Byte

int SmbReadByte(BYTE slaveAddr, BYTE cmd, BYTE* value)    // funcție care citește un octet dintr-un registru intern al dispozitivului slave
{                                                         // începutul funcției
    _outp(gSmbBase + HST_STS, 0xFF);                      // ștergi toate flag-urile vechi din registrul de stare al controlerului SMBus
    _outp(gSmbBase + XMIT_SLVA, (slaveAddr << 1) | 1);    // scrii adresa slave-ului și setezi bitul de citire (R/W = 1)
    _outp(gSmbBase + HST_CMD, cmd);                       // scrii codul comenzii / indexul registrului intern pe care vrei să-l citești din dispozitiv
    _outp(gSmbBase + HST_CNT, CNT_START | CNT_CMD_READBYTE); // selectezi protocolul Read Byte și pornești tranzacția SMBus

    while ((_inp(gSmbBase + HST_STS) & (STS_INTR | STS_DEV_ERR | STS_BUS_ERR | FAILED_BIT)) == 0)
    {                                                     // aștepți până când tranzacția se termină fie cu succes, fie cu una dintre erorile monitorizate
        ;                                                 // polling activ pe registrul de stare; bucla nu execută altă logică
    }                                                     // sfârșitul buclei de așteptare

    if (_inp(gSmbBase + HST_STS) & STS_INTR)              // verifici dacă tranzacția s-a încheiat cu succes (bitul INTR este setat)
    {                                                     // dacă da, înseamnă că datele returnate de slave sunt disponibile
        *value = (BYTE)_inp(gSmbBase + HST_D0);           // citești octetul primit din registrul de date HST_D0 și îl salvezi la adresa indicată de pointer
        return 0;                                         // întorci 0 pentru succes
    }                                                     // sfârșitul ramurii de succes

    return 1;                                             // dacă INTR nu este setat, consideri că tranzacția a eșuat și întorci cod de eroare
}                                                         // sfârșitul funcției SmbReadByte
```

**Explicație:**
- `Read Byte` permite citirea unui registru intern selectat prin comandă.

### 3.8.7 — citirea conținutului unei memorii SPD
**Cerință:**
Citește conținutul complet al unei memorii SPD și afișează-l.

**Rezolvare:**
1. Trimiți `Read Byte` cu codul `0` pentru resetarea pointerului intern.
2. Salvezi primul octet și determini din el câți octeți sunt folosiți: 128 / 256 / 384 / 512.
3. În buclă, trimiți `Receive Byte` pentru restul octeților.
4. Afișezi conținutul în format hex, 8 octeți pe linie.

```c
int DumpSpd(BYTE spdAddr)
{
    BYTE spd[512] = {0};
    int used = 512;

    if (SmbReadByte(spdAddr, 0x00, &spd[0]) != 0)
        return 1;

    switch (spd[0] & 0x0F)
    {
        case 0x01: used = 128; break;
        case 0x02: used = 256; break;
        case 0x03: used = 384; break;
        default:   used = 512; break;
    }

    for (int i = 1; i < used; i++)
    {
        if (SmbReceiveByte(spdAddr) != 0)
            break;
        spd[i] = (BYTE)_inp(gSmbBase + HST_D0);
    }

    return 0;
}
```

**Explicație:**
- SPD are pointer intern auto-incrementat, deci după primul acces poți continua cu `Receive Byte`.

### 3.8.8 — decodificarea SPD
**Cerință:**
În loc să afișezi brut conținutul SPD, decodifică informațiile importante.

**Rezolvare:**
- Folosești `SPD.h`.
- Extragi și afișezi:
  - revizia SPD;
  - tipul memoriei DRAM;
  - tipul modulului;
  - densitatea chip-urilor;
  - numărul de bancuri;
  - tensiunea nominală;
  - frecvența / tipul memoriei;
  - CAS latency minim;
  - tRCD și tRP minime;
  - producător, serie, cod modul, producător DRAM.

```c
void DecodeSpd(const BYTE* spd)
{
    BYTE spdRev = spd[1];
    BYTE dramType = spd[2];
    BYTE moduleType = spd[3];

    // aici cauti in tabelele din SPD.h si afisezi string-urile asociate
    // exemplu: GetSpdString(SpdMemoryTypeTable, dramType)
}
```

**Explicație:**
- SPD este utilă tocmai pentru identificarea și configurarea automată a modulelor de memorie.

### 3.8.9 — comanda I2C Read
**Cerință:**
Scrie o funcție care citește mai mulți octeți cu `I2C Read`.

**Rezolvare:**
- Primești parametri: adresă slave, cod comandă, buffer, număr octeți.
- Dacă numărul de octeți este 0, îl deduci din primul octet, ca la SPD.
- Pentru fiecare octet, execuți pașii protocolului `I2C Read` și salvezi în buffer.

```c
#define CNT_CMD_I2C_READ 0x18

int SmbI2cRead(BYTE slaveAddr, BYTE cmd, BYTE* buffer, int count)
{
    if (count <= 0)
        count = 256;

    for (int i = 0; i < count; i++)
    {
        _outp(gSmbBase + HST_STS, 0xFF);
        _outp(gSmbBase + XMIT_SLVA, (slaveAddr << 1) | 1);
        _outp(gSmbBase + HST_CMD, cmd + i);
        _outp(gSmbBase + HST_CNT, CNT_START | CNT_CMD_I2C_READ);

        while ((_inp(gSmbBase + HST_STS) & (STS_INTR | STS_DEV_ERR | STS_BUS_ERR | FAILED_BIT)) == 0)
        {
            ;
        }

        if (!(_inp(gSmbBase + HST_STS) & STS_INTR))
            return 1;

        buffer[i] = (BYTE)_inp(gSmbBase + HST_D0);
    }

    return 0;
}
```

**Explicație:**
- Unele dispozitive I2C nu răspund corect la protocoalele SMBus clasice, dar funcționează cu `I2C Read`.

### 3.8.10 — citirea SPD cu I2C Read
**Cerință:**
Modifică aplicația de citire SPD ca să folosească `I2C Read`.

**Rezolvare:**
- În loc de `Read Byte + Receive Byte`, apelezi funcția `I2C Read`.
- Folosești:
  - cod comandă = `0`
  - număr octeți = `0` pentru autodeterminare.

```c
int DumpSpdWithI2cRead(BYTE spdAddr)
{
    BYTE buffer[512] = {0};
    return SmbI2cRead(spdAddr, 0x00, buffer, 0);
}
```

**Explicație:**
- Implementarea devine mai generală și mai robustă pentru memorii compatibile I2C.

---

## 3. Ce trebuie reținut rapid
- Registre importante: `SMB_BASE`, `HOSTC`, `HST_STS`, `HST_CNT`, `HST_CMD`, `XMIT_SLVA`, `HST_D0/HST_D1`.
- Pentru scanare, comanda de bază este **Receive Byte**.
- Pentru SPD contează în special adresele `0x50..0x57`.
- Ordinea firească în laborator este:
  1. găsești controlerul,
  2. afli baza I/O,
  3. scanezi magistrala,
  4. citești SPD,
  5. decodezi SPD,
  6. treci la compatibilitate I2C.

