# Rezumat — Adaptoare Grafice

## Temele capitolului
- structura adaptorului grafic;
- memoria grafică;
- GPU și etaje de prelucrare;
- calcul GPGPU;
- arhitectura CUDA.

## 1. Rolul adaptorului grafic
Adaptorul grafic generează imaginile pentru dispozitivul de afișare și poate oferi funcții suplimentare precum:
- accelerare 2D și 3D;
- decodificare și codificare video;
- suport pentru mai multe afișaje.

### Tipuri
- **dedicat** — pe placă de extensie;
- **integrat** — în procesor sau SoC.

## 2. Structura unui adaptor grafic
Componente importante:
- BIOS video;
- GPU;
- interfața cu magistrala;
- unitate 2D;
- unitate video;
- memorii cache;
- controlerul memoriei grafice;
- memorie grafică;
- interfața cu afișajul.

## 3. GPU
### Rol
- implementează principalele funcții ale adaptorului grafic;
- execută operații masiv paralele.

### Unități importante
- unitate grafică 2D;
- unitate grafică 3D;
- unități de texturare;
- unități pentru operații rastru;
- cache / memorie partajată.

## 4. Etapele prelucrării 3D
- etapă geometrică;
- etapă de redare.

### Etapa geometrică
- transformare;
- iluminare;
- decupare.

### Etapa de redare
- rasterizare;
- umbrire;
- mixare alfa.

## 5. Memoria grafică
- conține bufferul de cadre;
- stochează și texturi, rezultate parțiale, programe compilate;
- este accesată prin controlerul memoriei grafice.

### Idei importante
- lățimea de bandă este esențială;
- se folosesc memorii specializate (ex. GDDR, HBM);
- cache-ul poate reduce accesul la memoria grafică.

## 6. Interfața cu afișajul
- transferă imaginea finală către dispozitivul de afișare;
- poate fi parte separată sau integrată în GPU;
- poate include RAMDAC pentru ieșiri analogice.

## 7. GPGPU
### Idee
- GPU-ul poate fi folosit pentru calcule generale, nu doar pentru grafică;
- avantajul principal este paralelismul foarte mare.

### De ce e eficient
- multe nuclee de procesare;
- bun pentru prelucrări repetitive, matrice mari, calcule științifice.

### Restricții istorice
- la început, programarea GPGPU era dependentă de pipeline-ul grafic;
- necesitau limbaje și API-uri grafice speciale.

## 8. Platforme și biblioteci
- **CUDA** — NVIDIA;
- **OpenCL** — pentru sisteme eterogene;
- biblioteci: cuDNN, nvGRAPH, OpenCV, FFmpeg, Video Codec SDK.

## 9. CUDA
### Ce este
- platformă și model de programare paralelă pentru GPU NVIDIA;
- permite folosirea C, C++, FORTRAN și prin adaptoare și alte limbaje.

### Idei-cheie
- acces direct la resursele GPU pentru calcule generale;
- execuție paralelă pe volume mari de date;
- grile de blocuri și fire de execuție;
- memorie globală, locală, partajată, constantă;
- memorie unificată pentru cooperare CPU-GPU.

### De reținut
- blocurile pot fi planificate în orice ordine;
- memoria partajată este comună firelor dintr-un bloc;
- memoria globală este accesibilă tuturor firelor.

## 10. UCP vs GPU
### UCP
- puține nuclee;
- optimizat pentru control și execuție secvențială;
- cache puternic.

### GPU
- multe nuclee;
- optimizat pentru paralelism masiv;
- excelent pentru calcule repetitive.

## Ce să reții pentru examen
- structura adaptorului grafic;
- rolul memoriei grafice;
- etapele redării 3D;
- GPGPU și de ce este util;
- conceptele de bază din CUDA;
- diferențele UCP vs GPU.

