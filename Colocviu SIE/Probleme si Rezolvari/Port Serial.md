# Port Serial — cerințe și rezolvări explicate

## 1. Cerințe teoretice și răspunsuri

### 1. Care este deosebirea dintre viteza de modulație și viteza de comunicație?
**Răspuns:**
- **Viteza de modulație** se măsoară în **baud** și arată câte schimbări de stare face semnalul pe secundă.
- **Viteza de comunicație** se măsoară în **biți/s** și arată câți biți utili se transmit pe secundă.
- Nu sunt mereu egale: dacă un simbol codifică mai mulți biți, atunci debitul în biți/s este mai mare decât valoarea în baud.

### 2. Cum se asigură sincronizarea într-o comunicație sincronă?
**Răspuns:**
- Receptorul își resincronizează ceasul folosind tranzițiile semnalului recepționat.
- Se folosesc tehnici de codare și caractere de sincronizare, plus circuite PLL.
- Ideea este ca pe fir să existe suficient de multe tranziții pentru refacerea ceasului.

### 3. Cum se asigură corectitudinea blocurilor de date într-o comunicație sincronă?
**Răspuns:**
- Prin biți/câmpuri de control la nivel de cadru sau bloc: paritate, checksum, CRC.
- La recepție se recalculează codul de control și se compară cu cel primit.

### 4. Care este funcția semnalelor DTR, DSR, RTS, CTS?
**Răspuns:**
- **DTR**: calculatorul anunță că este pregătit.
- **DSR**: dispozitivul extern/modemul anunță că este pregătit.
- **RTS**: calculatorul cere permisiunea de a transmite / permite controlul fluxului.
- **CTS**: dispozitivul extern confirmă faptul că poate primi date.

### 5. De ce porturile de I/E nu pot fi accesate direct din programele user în Windows?
**Răspuns:**
- Pentru protecția sistemului de operare și izolarea aplicațiilor.
- Accesul direct la hardware este permis doar prin driver sau mecanism kernel-mode.

---

## 2. Aplicații practice — cerințe și rezolvare

### 1.13.2 — operații pe un bit dintr-un port
**Cerință:**
- Așteaptă până când bitul `BIT4` devine 1.
- Setează bitul `BIT4`.
- Șterge bitul `BIT4`.
- Comută bitul `BIT4`.
- Restul biților nu trebuie modificați.

**Rezolvare:**
```c
while ((__inp(PORT) & BIT4) == 0) {}

__outp(PORT, __inp(PORT) | BIT4);
__outp(PORT, __inp(PORT) & ~BIT4);
__outp(PORT, __inp(PORT) ^ BIT4);
```

**Explicație:**
- `& BIT4` testează doar bitul dorit.
- `| BIT4` îl setează.
- `& ~BIT4` îl resetează.
- `^ BIT4` îl inversează.
- Citirea portului înainte de scriere păstrează nemodificați ceilalți biți.

### 1.13.3 — TestCom1DT
**Cerință:**
Construiește și testează aplicația care verifică existența portului serial la baza `0x3F8`.

**Rezolvare:**
- Creezi proiect Windows Desktop gol în Visual Studio.
- Adaugi fișierele aplicației și biblioteca `Hw64.lib`.
- Aplicația scrie `0xAA` și `0x55` în registrul `LCR`, apoi citește înapoi.
- Dacă valorile citite coincid cu cele scrise, portul este considerat prezent.

```c
#define COM1_BASE 0x3F8
#define REG_LCR   3

bool TestCom1(void)
{
	BYTE v1, v2;

	_outp(COM1_BASE + REG_LCR, 0xAA);
	v1 = (BYTE)_inp(COM1_BASE + REG_LCR);

	_outp(COM1_BASE + REG_LCR, 0x55);
	v2 = (BYTE)_inp(COM1_BASE + REG_LCR);

	return (v1 == 0xAA) && (v2 == 0x55);
}
```

**Explicație:**
- `LCR` este un registru accesibil și stabil pentru test.
- O citire corectă după scriere sugerează că adresa portului răspunde hardware.

### 1.13.4 — inițializare COM1
**Cerință:**
Inițializează `COM1` la **115200 bps, 8 biți, fără paritate, 1 bit stop**.

**Rezolvare:**
1. Setezi `DLAB = 1` în `LCR`.
2. Scrii divizorul pentru 115200 bps: `DLL = 0x01`, `DLM = 0x00`.
3. Scrii în `LCR` configurația **8N1** (`DLAB = 0`, 8 biți, no parity, 1 stop).
4. În `MCR` setezi `DTR`, `RTS`, `OUT2`.

```c
#define COM1_BASE 0x3F8
#define REG_DLL   0
#define REG_DLM   1
#define REG_LCR   3
#define REG_MCR   4

#define LCR_DLAB  0x80
#define LCR_8N1   0x03

#define MCR_DTR   0x01
#define MCR_RTS   0x02
#define MCR_OUT2  0x08

void InitCom1(void)
{
	_outp(COM1_BASE + REG_LCR, LCR_DLAB);
	_outp(COM1_BASE + REG_DLL, 0x01);
	_outp(COM1_BASE + REG_DLM, 0x00);

	_outp(COM1_BASE + REG_LCR, LCR_8N1);
	_outp(COM1_BASE + REG_MCR, MCR_DTR | MCR_RTS | MCR_OUT2);
}
```

**Explicație:**
- `DLAB` permite acces la registrele divizorului.
- Pentru UART 16x50, 115200 bps corespunde divizorului `1`.
- `OUT2` este frecvent necesar pentru validarea întreruperilor UART.

### 1.13.5 — transmiterea unui caracter
**Cerință:**
Extinde aplicația ca să trimită un caracter/comandă către placa de dezvoltare.

**Rezolvare:**
- Aștepți până când bitul `THRE` din `LSR` indică buffer liber.
- Scrii caracterul în `THR`.
- Testezi cu placa reală sau în mașină virtuală prin port serial redirecționat în fișier.

```c
#define REG_THR   0
#define REG_LSR   5
#define LSR_THRE  0x20

void SendChar(char ch)
{
	while ((_inp(COM1_BASE + REG_LSR) & LSR_THRE) == 0)
	{
		;
	}

	_outp(COM1_BASE + REG_THR, ch);
}
```

**Explicație:**
- Nu scrii în `THR` până când UART nu este gata, altfel riști pierderea caracterului.

### 1.13.6 — transmitere și recepție cu `WriteFile` / `ReadFile`
**Cerință:**
Trimite comenzi către placă și citește răspunsul întors.

**Rezolvare:**
- Deschizi `COM1` cu `CreateFile()`.
- Transmiți comanda cu `WriteFile()`.
- Primești răspunsul cu `ReadFile()`.
- Afișezi caracterele returnate.

```c
HANDLE hCom = CreateFileA(
	"COM1",
	GENERIC_READ | GENERIC_WRITE,
	0,
	NULL,
	OPEN_EXISTING,
	0,
	NULL);

if (hCom != INVALID_HANDLE_VALUE)
{
	DWORD written = 0, read = 0;
	char cmd[] = "LED ON\r\n";
	char rx[64] = {0};

	WriteFile(hCom, cmd, (DWORD)strlen(cmd), &written, NULL);
	ReadFile(hCom, rx, sizeof(rx) - 1, &read, NULL);

	CloseHandle(hCom);
}
```

**Explicație:**
- Aceasta este varianta WinAPI, mai apropiată de utilizarea normală a portului serial în Windows.

### 1.13.7 — transmiterea unui șir
**Cerință:**
Trimite un șir de caractere prin COM1.

**Rezolvare:**
- Inițializezi portul.
- Parcurgi șirul într-o buclă.
- Pentru fiecare caracter apelezi funcția de transmitere a unui singur caracter.

```c
void SendString(const char* s)
{
	while (*s)
	{
		SendChar(*s);
		s++;
	}
}

// exemplu
InitCom1();
SendString("Salut de pe COM1!\r\n");
```

**Explicație:**
- Problema se descompune simplu: „șir” = „succesiune de caractere”.

### 1.13.8 — recepția unui șir
**Cerință:**
Recepționează caractere până la `ESC` (`0x1B`).

**Rezolvare:**
- Scrii o funcție de recepție a unui caracter.
- În buclă, citești caractere și le afișezi.
- Oprești aplicația când caracterul recepționat este `0x1B`.

```c
#define LSR_DR 0x01
#define REG_RBR 0

char RecvChar(void)
{
	while ((_inp(COM1_BASE + REG_LSR) & LSR_DR) == 0)
	{
		;
	}

	return (char)_inp(COM1_BASE + REG_RBR);
}

void RecvLoop(void)
{
	char ch;
	do
	{
		ch = RecvChar();
		putchar(ch);
	} while ((unsigned char)ch != 0x1B);
}
```

**Explicație:**
- `ESC` este folosit ca marker clar de terminare.

### 1.13.9 — ecou serial
**Cerință:**
Retrimite imediat fiecare caracter recepționat.

**Rezolvare:**
- După recepția caracterului, apelezi imediat funcția de transmitere cu același caracter.

```c
void EchoLoop(void)
{
	char ch;
	do
	{
		ch = RecvChar();
		SendChar(ch);
	} while ((unsigned char)ch != 0x1B);
}
```

**Explicație:**
- Este testul clasic de validare transmisie + recepție pe același flux.

### 1.13.10 — două calculatoare conectate serial
**Cerință:**
Transmite un șir de la un calculator la altul prin cablu serial inversor.

**Rezolvare:**
- Conectezi PC-urile cu un **null modem cable**.
- Pe un calculator rulezi aplicația de transmisie.
- Pe celălalt rulezi aplicația de recepție.
- Verifici că textul trimis apare integral la receptor.

```c
// PC 1
int main(void)
{
	InitCom1();
	SendString("Mesaj trimis catre al doilea PC\r\n");
	return 0;
}

// PC 2
int main(void)
{
	InitCom1();
	RecvLoop();
	return 0;
}
```

**Explicație:**
- Cablul inversor încrucișează liniile de transmisie și recepție, deci TX-ul unui capăt ajunge la RX-ul celuilalt.

---

## 3. Ce trebuie reținut rapid
- UART se configurează prin `DLL/DLM`, `LCR`, `MCR`.
- Pentru **8N1 la 115200**, divizorul este `1`.
- La transmitere verifici `THRE`, la recepție verifici `DR`/bitul de date disponibile.
- În Windows, accesul la I/O se face prin driver sau prin deschiderea portului serial cu WinAPI.

