<h1 align="center">📌 SISTEM ABSENSI RFID</h1>
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"> 

---

## 📖 Deskripsi Proyek

Proyek ini adalah sistem absensi berbasis RFID menggunakan **ESP8266 (NodeMCU)**, di mana **satu kartu RFID master** digunakan untuk mencatat kehadiran **banyak siswa secara bergantian**.

Pemilihan siswa dilakukan melalui **Serial Monitor atau Web**, sehingga tidak diperlukan kartu RFID untuk setiap siswa.

Sistem ini cocok untuk:
- Sekolah dengan keterbatasan kartu RFID  
- Absensi bergilir (praktikum, les, laboratorium)  
- Sistem absensi yang terintegrasi dengan web
<h1 align="center">🎯 Fitur Utama</h1>
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"> 

## ✨ Fitur Utama

📌 **1.** ✅ **1 kartu master untuk semua siswa**  
   └─ Hemat biaya & praktis

📌 **2.** ✅ **Multi siswa (hingga 50 siswa)**  
   └─ Kapasitas memadai untuk satu kelas

📌 **3.** ✅ **Pilih siswa aktif via Serial / Web**  
   └─ Fleksibel kontrol

📌 **4.** ✅ **LCD 16x2 I2C sebagai tampilan**  
   └─ Informasi real-time

📌 **5.** ✅ **Buzzer notifikasi (berhasil/gagal)**  
   └─ Feedback audio

📌 **6.** ✅ **Data tersimpan di EEPROM**  
   └─ Tidak hilang saat restart

📌 **7.** ✅ **Log absensi hingga 100 data**  
   └─ Riwayat lengkap

📌 **8.** ✅ **Mode sistem lengkap**  
   └─ Normal, Register, Set Master

📌 **9.** ✅ **Kompatibel integrasi Web/IoT**  
   └─ Siap dikembangkan
<h1 align="center">📍 Pin Mapping Table</h1>
<h3 align="center">NodeMCU Pin	GPIO	Fungsi	Koneksi Ke	Keterangan</h3>

## 🔌 **Pin Configuration**

| Power & Ground                     |                                |
|------------------------------------|--------------------------------|
| **3.3V** → RFID-RC522 (VCC)        | ⚠️ **HANYA 3.3V!**            |
| **GND** → All GND Pins             | Common ground                  |
| **5V/Vin** → LCD I2C 16x2 (VCC)    | Power untuk LCD               |
| **GND** → LCD I2C 16x2 (GND)       |                                |
| **GND** → Buzzer (-)               |                                |

| RFID Connections                   | GPIO      | Keterangan              |
|------------------------------------|-----------|-------------------------|
| **D1** → RFID-RC522 (RST)          | GPIO5     | Reset control           |
| **D2** → RFID-RC522 (SDA/SS)       | GPIO4     | SPI Slave Select        |
| **D5** → RFID-RC522 (SCK)          | GPIO14    | SPI Serial Clock        |
| **D6** → RFID-RC522 (MISO)         | GPIO12    | Master In Slave Out     |
| **D7** → RFID-RC522 (MOSI)         | GPIO13    | Master Out Slave In     |

| LCD Connections                    | GPIO      | Keterangan              |
|------------------------------------|-----------|-------------------------|
| **D3** → LCD I2C 16x2 (SDA)        | GPIO0     | I2C Data Line           |
| **D4** → LCD I2C 16x2 (SCL)        | GPIO2     | I2C Clock Line          |

| Buzzer Connection                  | GPIO      | Keterangan              |
|------------------------------------|-----------|-------------------------|
| **D8** → Buzzer (+)                | GPIO15    | Active High             |
